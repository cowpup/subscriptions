import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface CreateAddressRequest {
  name: string
  label: string
  line1: string
  line2?: string | null
  city: string
  state: string
  postalCode: string
  country: string
  isDefault?: boolean
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

    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error('Error fetching addresses:', error)
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

    const body = (await req.json()) as CreateAddressRequest
    const { name, label, line1, line2, city, state, postalCode, country, isDefault } = body

    // Validation
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!label?.trim()) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 })
    }
    if (!line1?.trim()) {
      return NextResponse.json({ error: 'Street address is required' }, { status: 400 })
    }
    if (!city?.trim()) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 })
    }
    if (!state?.trim()) {
      return NextResponse.json({ error: 'State is required' }, { status: 400 })
    }
    if (!postalCode?.trim()) {
      return NextResponse.json({ error: 'Postal code is required' }, { status: 400 })
    }
    if (!country?.trim()) {
      return NextResponse.json({ error: 'Country is required' }, { status: 400 })
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    // Check if user has any addresses - if not, make this one default
    const existingAddresses = await prisma.address.count({
      where: { userId: user.id },
    })
    const shouldBeDefault = isDefault || existingAddresses === 0

    const address = await prisma.address.create({
      data: {
        userId: user.id,
        name: name.trim(),
        label: label.trim(),
        line1: line1.trim(),
        line2: line2?.trim() ?? null,
        city: city.trim(),
        state: state.trim().toUpperCase(),
        postalCode: postalCode.trim(),
        country: country.trim().toUpperCase(),
        isDefault: shouldBeDefault,
      },
    })

    return NextResponse.json({ address })
  } catch (error) {
    console.error('Error creating address:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
