import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'
import { createShipment, purchaseLabel, type ShippoParcel, type LabelFileType } from '@/lib/shippo'

interface BulkGetRatesRequest {
  orderIds: string[]
  weightOz: number
  lengthIn: number
  widthIn: number
  heightIn: number
}

interface BulkPurchaseLabelsRequest {
  orders: Array<{
    orderId: string
    rateId: string
  }>
  weightOz: number
  lengthIn: number
  widthIn: number
  heightIn: number
}

export async function POST(req: Request) {
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

    const body = (await req.json()) as BulkGetRatesRequest
    const { orderIds, weightOz, lengthIn, widthIn, heightIn } = body

    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json({ error: 'No orders selected' }, { status: 400 })
    }

    if (!weightOz || weightOz <= 0) {
      return NextResponse.json({ error: 'Weight is required' }, { status: 400 })
    }

    if (!lengthIn || lengthIn <= 0 || !widthIn || widthIn <= 0 || !heightIn || heightIn <= 0) {
      return NextResponse.json({ error: 'Valid dimensions are required' }, { status: 400 })
    }

    // Get all orders with their shipping addresses
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        vendorId: vendor.id,
      },
      include: {
        shippingAddress: true,
        user: {
          select: { name: true, email: true },
        },
      },
    })

    if (orders.length !== orderIds.length) {
      return NextResponse.json({ error: 'Some orders not found or unauthorized' }, { status: 404 })
    }

    // Check all orders have shipping addresses
    const ordersWithoutAddress = orders.filter((o) => !o.shippingAddress)
    if (ordersWithoutAddress.length > 0) {
      return NextResponse.json({
        error: `${ordersWithoutAddress.length} order(s) missing shipping address`,
      }, { status: 400 })
    }

    // Vendor's return address
    const fromAddress = {
      name: vendor.storeName,
      street1: vendor.street1 ?? '',
      street2: vendor.street2 ?? undefined,
      city: vendor.city ?? '',
      state: vendor.state ?? '',
      zip: vendor.postalCode ?? '',
      country: vendor.country ?? 'US',
    }

    const parcel: ShippoParcel = {
      length: lengthIn.toString(),
      width: widthIn.toString(),
      height: heightIn.toString(),
      distanceUnit: 'in',
      weight: weightOz.toString(),
      massUnit: 'oz',
    }

    // Get rates for each order
    const results = await Promise.all(
      orders.map(async (order) => {
        try {
          const toAddress = {
            name: order.shippingAddress!.name,
            street1: order.shippingAddress!.line1,
            street2: order.shippingAddress!.line2 ?? undefined,
            city: order.shippingAddress!.city,
            state: order.shippingAddress!.state,
            zip: order.shippingAddress!.postalCode,
            country: order.shippingAddress!.country,
          }

          const shipmentResult = await createShipment(fromAddress, toAddress, parcel)

          // Update order with dimensions and shipment ID
          await prisma.order.update({
            where: { id: order.id },
            data: {
              weightOz,
              lengthIn,
              widthIn,
              heightIn,
              shippoShipmentId: shipmentResult.shipmentId,
            },
          })

          return {
            orderId: order.id,
            success: true,
            shipmentId: shipmentResult.shipmentId,
            rates: shipmentResult.rates,
            customerName: order.user.name ?? order.user.email,
          }
        } catch (err) {
          return {
            orderId: order.id,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
            customerName: order.user.name ?? order.user.email,
          }
        }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error getting bulk shipping rates:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to get rates: ${message}` }, { status: 500 })
  }
}

export async function PUT(req: Request) {
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

    const body = (await req.json()) as BulkPurchaseLabelsRequest
    const { orders, weightOz, lengthIn, widthIn, heightIn } = body

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'No orders selected' }, { status: 400 })
    }

    // Verify all orders belong to vendor
    const orderIds = orders.map((o) => o.orderId)
    const dbOrders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        vendorId: vendor.id,
      },
    })

    if (dbOrders.length !== orderIds.length) {
      return NextResponse.json({ error: 'Some orders not found or unauthorized' }, { status: 404 })
    }

    // Purchase labels for each order
    const results = await Promise.all(
      orders.map(async ({ orderId, rateId }) => {
        try {
          const labelResult = await purchaseLabel(rateId, vendor.labelFormat as LabelFileType)

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

          return {
            orderId,
            success: true,
            trackingNumber: labelResult.trackingNumber,
            labelUrl: labelResult.labelUrl,
          }
        } catch (err) {
          return {
            orderId,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          }
        }
      })
    )

    const successCount = results.filter((r) => r.success).length
    const labelUrls = results.filter((r) => r.success && r.labelUrl).map((r) => r.labelUrl)

    return NextResponse.json({
      results,
      successCount,
      labelUrls,
    })
  } catch (error) {
    console.error('Error purchasing bulk labels:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to purchase labels: ${message}` }, { status: 500 })
  }
}
