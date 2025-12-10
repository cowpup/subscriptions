import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'

interface CreateProfileRequest {
  name: string
  weightOz: number
  lengthIn: number
  widthIn: number
  heightIn: number
  isDefault?: boolean
  defaultCarrier?: string | null
  defaultServiceToken?: string | null
}

export async function GET() {
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

    const profiles = await prisma.shippingProfile.findMany({
      where: { vendorId: vendor.id },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('Error fetching shipping profiles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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

    const body = (await req.json()) as CreateProfileRequest
    const { name, weightOz, lengthIn, widthIn, heightIn, isDefault, defaultCarrier, defaultServiceToken } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!weightOz || weightOz <= 0) {
      return NextResponse.json({ error: 'Valid weight is required' }, { status: 400 })
    }

    if (!lengthIn || lengthIn <= 0 || !widthIn || widthIn <= 0 || !heightIn || heightIn <= 0) {
      return NextResponse.json({ error: 'Valid dimensions are required' }, { status: 400 })
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.shippingProfile.updateMany({
        where: { vendorId: vendor.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    // Check if first profile - make it default
    const existingCount = await prisma.shippingProfile.count({
      where: { vendorId: vendor.id },
    })
    const shouldBeDefault = isDefault || existingCount === 0

    const profile = await prisma.shippingProfile.create({
      data: {
        vendorId: vendor.id,
        name: name.trim(),
        weightOz,
        lengthIn,
        widthIn,
        heightIn,
        isDefault: shouldBeDefault,
        defaultCarrier: defaultCarrier ?? null,
        defaultServiceToken: defaultServiceToken ?? null,
      },
    })

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error creating shipping profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
