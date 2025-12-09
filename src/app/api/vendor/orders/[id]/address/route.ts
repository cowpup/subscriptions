import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'

interface AddAddressRequest {
  name: string
  line1: string
  line2?: string | null
  city: string
  state: string
  postalCode: string
  country: string
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
    const body = (await req.json()) as AddAddressRequest
    const { name, line1, line2, city, state, postalCode, country } = body

    // Validation
    if (!name?.trim() || !line1?.trim() || !city?.trim() || !state?.trim() || !postalCode?.trim()) {
      return NextResponse.json({ error: 'All address fields are required' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { vendorId: true, userId: true, shippingAddressId: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (order.shippingAddressId) {
      return NextResponse.json({ error: 'Order already has a shipping address' }, { status: 400 })
    }

    // Create address for the customer
    const address = await prisma.address.create({
      data: {
        userId: order.userId,
        name: name.trim(),
        label: 'Shipping',
        line1: line1.trim(),
        line2: line2?.trim() ?? null,
        city: city.trim(),
        state: state.trim().toUpperCase(),
        postalCode: postalCode.trim(),
        country: (country ?? 'US').trim().toUpperCase(),
        isDefault: false,
      },
    })

    // Link address to order
    await prisma.order.update({
      where: { id: orderId },
      data: { shippingAddressId: address.id },
    })

    return NextResponse.json({ address })
  } catch (error) {
    console.error('Error adding address to order:', error)
    return NextResponse.json({ error: 'Failed to add address' }, { status: 500 })
  }
}
