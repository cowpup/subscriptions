import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { stripe } from '@/lib/stripe'

interface CreateProductRequest {
  name: string
  description?: string | null
  priceInCents: number
  imageUrl?: string | null
  stockQuantity?: number
  tierIds?: string[]
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

    const products = await prisma.product.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: 'desc' },
      include: {
        tierAccess: {
          include: { tier: true },
        },
      },
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching products:', error)
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

    const body = (await req.json()) as CreateProductRequest
    const { name, description, priceInCents, imageUrl, stockQuantity, tierIds } = body

    // Validation
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }

    if (priceInCents === undefined || priceInCents < 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 })
    }

    // Create Stripe product and price
    const stripeProduct = await stripe.products.create({
      name: `${vendor.storeName} - ${name}`,
      description: description ?? undefined,
      images: imageUrl ? [imageUrl] : undefined,
      metadata: {
        vendorId: vendor.id,
      },
    })

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: priceInCents,
      currency: 'usd',
    })

    // Create product in database
    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        name: name.trim(),
        description,
        priceInCents,
        images: imageUrl ? [imageUrl] : [],
        stockQuantity: stockQuantity ?? 0,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        tierAccess: tierIds?.length
          ? {
              create: tierIds.map((tierId) => ({ tierId })),
            }
          : undefined,
      },
      include: {
        tierAccess: {
          include: { tier: true },
        },
      },
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
