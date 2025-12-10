import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { stripe } from '@/lib/stripe'

interface UpdateProductRequest {
  name?: string
  description?: string | null
  priceInCents?: number
  imageUrl?: string | null
  stockQuantity?: number
  isActive?: boolean
  tierIds?: string[]
  isPreOrder?: boolean
  preOrderShipDate?: string | null
  shippingProfileId?: string | null
}

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
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

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        tierAccess: {
          include: { tier: true },
        },
      },
    })

    if (!product || product.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
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

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    })

    if (!existingProduct || existingProduct.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body = (await req.json()) as UpdateProductRequest
    const { name, description, priceInCents, imageUrl, stockQuantity, isActive, tierIds, isPreOrder, preOrderShipDate, shippingProfileId } = body

    // Validation
    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }

    if (priceInCents !== undefined && priceInCents < 0) {
      return NextResponse.json({ error: 'Price cannot be negative' }, { status: 400 })
    }

    // Update Stripe product name/description/images if changed
    if (existingProduct.stripeProductId && (name || description !== undefined || imageUrl !== undefined)) {
      await stripe.products.update(existingProduct.stripeProductId, {
        ...(name && { name: `${vendor.storeName} - ${name}` }),
        ...(description !== undefined && { description: description ?? '' }),
        ...(imageUrl !== undefined && { images: imageUrl ? [imageUrl] : [] }),
      })
    }

    // If price changed, create a new Stripe price
    let newStripePriceId = existingProduct.stripePriceId
    if (priceInCents !== undefined && priceInCents !== existingProduct.priceInCents && existingProduct.stripeProductId) {
      // Archive old price
      if (existingProduct.stripePriceId) {
        await stripe.prices.update(existingProduct.stripePriceId, { active: false })
      }

      // Create new price
      const newPrice = await stripe.prices.create({
        product: existingProduct.stripeProductId,
        unit_amount: priceInCents,
        currency: 'usd',
      })
      newStripePriceId = newPrice.id
    }

    // Update tier access - delete existing and create new
    if (tierIds !== undefined) {
      await prisma.productTierAccess.deleteMany({
        where: { productId: id },
      })
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(priceInCents !== undefined && { priceInCents }),
        ...(imageUrl !== undefined && { images: imageUrl ? [imageUrl] : [] }),
        ...(stockQuantity !== undefined && { stockQuantity }),
        ...(isActive !== undefined && { isActive }),
        ...(isPreOrder !== undefined && { isPreOrder }),
        ...(preOrderShipDate !== undefined && { preOrderShipDate: preOrderShipDate ? new Date(preOrderShipDate) : null }),
        ...(shippingProfileId !== undefined && { shippingProfileId: shippingProfileId || null }),
        ...(newStripePriceId !== existingProduct.stripePriceId && { stripePriceId: newStripePriceId }),
        ...(tierIds !== undefined && tierIds.length > 0 && {
          tierAccess: {
            create: tierIds.map((tierId) => ({ tierId })),
          },
        }),
      },
      include: {
        tierAccess: {
          include: { tier: true },
        },
      },
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
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

    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product || product.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Archive the Stripe product instead of deleting
    if (product.stripeProductId) {
      await stripe.products.update(product.stripeProductId, { active: false })
    }

    // Archive the Stripe price
    if (product.stripePriceId) {
      await stripe.prices.update(product.stripePriceId, { active: false })
    }

    // Delete tier access first
    await prisma.productTierAccess.deleteMany({
      where: { productId: id },
    })

    // Delete the product
    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
