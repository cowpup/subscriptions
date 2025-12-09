import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface UpdateAddressRequest {
  name?: string
  label?: string
  line1?: string
  line2?: string | null
  city?: string
  state?: string
  postalCode?: string
  country?: string
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

    const { id } = await params
    const body = (await req.json()) as UpdateAddressRequest

    // Verify address belongs to user
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    })

    if (!existingAddress || existingAddress.userId !== user.id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.label !== undefined && { label: body.label.trim() }),
        ...(body.line1 !== undefined && { line1: body.line1.trim() }),
        ...(body.line2 !== undefined && { line2: body.line2?.trim() ?? null }),
        ...(body.city !== undefined && { city: body.city.trim() }),
        ...(body.state !== undefined && { state: body.state.trim().toUpperCase() }),
        ...(body.postalCode !== undefined && { postalCode: body.postalCode.trim() }),
        ...(body.country !== undefined && { country: body.country.trim().toUpperCase() }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
    })

    return NextResponse.json({ address })
  } catch (error) {
    console.error('Error updating address:', error)
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

    const { id } = await params

    // Verify address belongs to user
    const address = await prisma.address.findUnique({
      where: { id },
    })

    if (!address || address.userId !== user.id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    await prisma.address.delete({
      where: { id },
    })

    // If this was the default, make the next one default
    if (address.isDefault) {
      const nextAddress = await prisma.address.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      if (nextAddress) {
        await prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting address:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
