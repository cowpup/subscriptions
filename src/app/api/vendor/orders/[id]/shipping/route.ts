import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'
import { createShipment, purchaseLabel, type ShippoParcel } from '@/lib/shippo'

interface GetRatesRequest {
  weightOz: number
  lengthIn: number
  widthIn: number
  heightIn: number
}

interface PurchaseLabelRequest {
  rateId: string
  weightOz: number
  lengthIn: number
  widthIn: number
  heightIn: number
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
    const body = (await req.json()) as GetRatesRequest
    const { weightOz, lengthIn, widthIn, heightIn } = body

    if (!weightOz || weightOz <= 0) {
      return NextResponse.json({ error: 'Weight is required' }, { status: 400 })
    }

    if (!lengthIn || lengthIn <= 0 || !widthIn || widthIn <= 0 || !heightIn || heightIn <= 0) {
      return NextResponse.json({ error: 'Valid dimensions are required' }, { status: 400 })
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

    // Vendor's return address (from their settings or fallback)
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
      length: lengthIn.toString(),
      width: widthIn.toString(),
      height: heightIn.toString(),
      distanceUnit: 'in',
      weight: weightOz.toString(),
      massUnit: 'oz',
    }

    const shipmentResult = await createShipment(fromAddress, toAddress, parcel)

    // Update order with dimensions
    await prisma.order.update({
      where: { id: orderId },
      data: {
        weightOz,
        lengthIn,
        widthIn,
        heightIn,
        shippoShipmentId: shipmentResult.shipmentId,
      },
    })

    return NextResponse.json({
      shipmentId: shipmentResult.shipmentId,
      rates: shipmentResult.rates,
    })
  } catch (error) {
    console.error('Error getting shipping rates:', error)
    return NextResponse.json({ error: 'Failed to get shipping rates' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
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
    const body = (await req.json()) as PurchaseLabelRequest
    const { rateId, weightOz, lengthIn, widthIn, heightIn } = body

    if (!rateId) {
      return NextResponse.json({ error: 'Rate ID is required' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { vendorId: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const labelResult = await purchaseLabel(rateId)

    // Update order with shipping label details
    await prisma.order.update({
      where: { id: orderId },
      data: {
        weightOz,
        lengthIn,
        widthIn,
        heightIn,
        trackingNumber: labelResult.trackingNumber,
        shippingLabelUrl: labelResult.labelUrl,
        status: 'PROCESSING',
      },
    })

    return NextResponse.json({
      trackingNumber: labelResult.trackingNumber,
      labelUrl: labelResult.labelUrl,
      trackingUrlProvider: labelResult.trackingUrlProvider,
    })
  } catch (error) {
    console.error('Error purchasing shipping label:', error)
    return NextResponse.json({ error: 'Failed to purchase shipping label' }, { status: 500 })
  }
}
