import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'
import { createShipment, purchaseLabel, type ShippoParcel, type LabelFileType } from '@/lib/shippo'

interface OneClickRequest {
  profileId: string
  carrier: string
  serviceToken: string
}

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const vendor = await getVendorByUserId(user.id)
    if (!vendor || vendor.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Vendor not approved' }, { status: 403 })
    }

    const { id: orderId } = await params
    const body = (await req.json()) as OneClickRequest
    const { profileId, carrier, serviceToken } = body

    if (!profileId || !carrier || !serviceToken) {
      return NextResponse.json({ error: 'Profile, carrier, and service token are required' }, { status: 400 })
    }

    // Fetch the shipping profile
    const profile = await prisma.shippingProfile.findUnique({
      where: { id: profileId },
    })

    if (!profile || profile.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Shipping profile not found' }, { status: 404 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shippingAddress: true,
        vendor: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (!order.shippingAddress) {
      return NextResponse.json({ error: 'Order has no shipping address' }, { status: 400 })
    }

    if (order.trackingNumber) {
      return NextResponse.json({ error: 'Order already has a shipping label' }, { status: 400 })
    }

    // Vendor's return address
    const fromAddress = {
      name: order.vendor.storeName,
      street1: order.vendor.street1 ?? '',
      street2: order.vendor.street2 ?? undefined,
      city: order.vendor.city ?? '',
      state: order.vendor.state ?? '',
      zip: order.vendor.postalCode ?? '',
      country: order.vendor.country ?? 'US',
    }

    // Customer's shipping address
    const toAddress = {
      name: order.shippingAddress.name,
      street1: order.shippingAddress.line1,
      street2: order.shippingAddress.line2 ?? undefined,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      zip: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
    }

    const parcel: ShippoParcel = {
      length: profile.lengthIn.toString(),
      width: profile.widthIn.toString(),
      height: profile.heightIn.toString(),
      distanceUnit: 'in',
      weight: profile.weightOz.toString(),
      massUnit: 'oz',
    }

    // Create shipment to get rates
    const shipmentResult = await createShipment(fromAddress, toAddress, parcel)

    // Find the matching rate
    const matchingRate = shipmentResult.rates.find(
      (rate) =>
        rate.provider.toLowerCase() === carrier.toLowerCase() &&
        rate.servicelevel.token === serviceToken
    )

    if (!matchingRate) {
      // Return available rates so the user can see alternatives
      const availableServices = shipmentResult.rates.map(
        (r) => `${r.provider} ${r.servicelevel.name} ($${r.amount})`
      ).join(', ')
      return NextResponse.json({
        error: `Selected shipping service not available for this destination. Available: ${availableServices || 'none'}`,
        rates: shipmentResult.rates,
      }, { status: 400 })
    }

    // Purchase the label
    const labelResult = await purchaseLabel(matchingRate.objectId, vendor.labelFormat as LabelFileType)

    // Update order with shipping details
    await prisma.order.update({
      where: { id: orderId },
      data: {
        weightOz: profile.weightOz,
        lengthIn: profile.lengthIn,
        widthIn: profile.widthIn,
        heightIn: profile.heightIn,
        shippoShipmentId: shipmentResult.shipmentId,
        trackingNumber: labelResult.trackingNumber,
        shippingLabelUrl: labelResult.labelUrl,
        status: 'PROCESSING',
      },
    })

    return NextResponse.json({
      success: true,
      trackingNumber: labelResult.trackingNumber,
      labelUrl: labelResult.labelUrl,
      trackingUrlProvider: labelResult.trackingUrlProvider,
      rate: {
        provider: matchingRate.provider,
        service: matchingRate.servicelevel.name,
        amount: matchingRate.amount,
      },
    })
  } catch (error) {
    console.error('Error creating one-click label:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to create shipping label: ${message}` }, { status: 500 })
  }
}
