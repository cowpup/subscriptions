import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getVendorByUserId } from '@/lib/vendor'

interface CreateTierRequest {
  name: string
  description?: string
  priceInCents: number
  benefits: string[]
}

// GET - List vendor's tiers
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await getVendorByUserId(userId)

    if (!vendor || vendor.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Vendor not found or not approved' }, { status: 403 })
    }

    const tiers = await prisma.subscriptionTier.findMany({
      where: { vendorId: vendor.id },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ tiers })
  } catch (error) {
    console.error('Error fetching tiers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new tier
export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await getVendorByUserId(userId)

    if (!vendor || vendor.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Vendor not found or not approved' }, { status: 403 })
    }

    const body = (await req.json()) as CreateTierRequest
    const { name, description, priceInCents, benefits } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Tier name must be at least 2 characters' }, { status: 400 })
    }

    if (priceInCents < 100) {
      return NextResponse.json({ error: 'Price must be at least $1.00' }, { status: 400 })
    }

    // Check for duplicate tier name
    const existingTier = await prisma.subscriptionTier.findUnique({
      where: {
        vendorId_name: {
          vendorId: vendor.id,
          name: name.trim(),
        },
      },
    })

    if (existingTier) {
      return NextResponse.json({ error: 'Tier with this name already exists' }, { status: 400 })
    }

    // Create Stripe product and price
    const stripeProduct = await stripe.products.create({
      name: `${vendor.storeName} - ${name.trim()}`,
      metadata: {
        vendorId: vendor.id,
        tierName: name.trim(),
      },
    })

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: priceInCents,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        vendorId: vendor.id,
      },
    })

    // Get current max sort order
    const maxSortOrder = await prisma.subscriptionTier.aggregate({
      where: { vendorId: vendor.id },
      _max: { sortOrder: true },
    })

    // Create tier in database
    const tier = await prisma.subscriptionTier.create({
      data: {
        vendorId: vendor.id,
        name: name.trim(),
        description: description?.trim() ?? null,
        priceInCents,
        benefits: benefits ?? [],
        stripePriceId: stripePrice.id,
        sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
      },
    })

    return NextResponse.json({ tier }, { status: 201 })
  } catch (error) {
    console.error('Error creating tier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
