import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'

interface UpdateProfileRequest {
  name?: string
  weightOz?: number
  lengthIn?: number
  widthIn?: number
  heightIn?: number
  isDefault?: boolean
}

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, { params }: RouteParams) {
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

    const { id } = await params
    const body = (await req.json()) as UpdateProfileRequest

    // Verify profile belongs to vendor
    const existingProfile = await prisma.shippingProfile.findUnique({
      where: { id },
    })

    if (!existingProfile || existingProfile.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await prisma.shippingProfile.updateMany({
        where: { vendorId: vendor.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const profile = await prisma.shippingProfile.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.weightOz !== undefined && { weightOz: body.weightOz }),
        ...(body.lengthIn !== undefined && { lengthIn: body.lengthIn }),
        ...(body.widthIn !== undefined && { widthIn: body.widthIn }),
        ...(body.heightIn !== undefined && { heightIn: body.heightIn }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
    })

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error updating shipping profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
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

    const { id } = await params

    // Verify profile belongs to vendor
    const profile = await prisma.shippingProfile.findUnique({
      where: { id },
    })

    if (!profile || profile.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    await prisma.shippingProfile.delete({
      where: { id },
    })

    // If this was the default, make the next one default
    if (profile.isDefault) {
      const nextProfile = await prisma.shippingProfile.findFirst({
        where: { vendorId: vendor.id },
        orderBy: { createdAt: 'desc' },
      })

      if (nextProfile) {
        await prisma.shippingProfile.update({
          where: { id: nextProfile.id },
          data: { isDefault: true },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shipping profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
