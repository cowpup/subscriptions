import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'
import { getSubscriptionForVendor } from '@/lib/subscription'

interface CheckoutRequest {
  productId: string
  vendorSlug: string
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

    const body = (await req.json()) as CheckoutRequest
    const { productId, vendorSlug } = body

    if (!productId || !vendorSlug) {
      return NextResponse.json({ error: 'Product ID and vendor slug are required' }, { status: 400 })
    }

    // Get the product with vendor info
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        vendor: {
          select: { id: true, slug: true, storeName: true },
        },
        tierAccess: true,
      },
    })

    if (!product || product.vendor.slug !== vendorSlug || !product.isActive) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if user has active subscription to this vendor
    const subscription = await getSubscriptionForVendor(user.id, product.vendor.id)

    const hasActiveSubscription =
      subscription &&
      subscription.accessExpiresAt &&
      subscription.accessExpiresAt > new Date()

    if (!hasActiveSubscription) {
      return NextResponse.json({ error: 'Subscription required' }, { status: 403 })
    }

    // Check tier access
    const hasTierAccess =
      product.tierAccess.length === 0 ||
      product.tierAccess.some((ta) => ta.tierId === subscription?.tierId)

    if (!hasTierAccess) {
      return NextResponse.json({ error: 'Tier access required' }, { status: 403 })
    }

    // Check stock
    if (product.isLimited && product.stockQuantity <= 0) {
      return NextResponse.json({ error: 'Product out of stock' }, { status: 400 })
    }

    // Check if product has Stripe price
    if (!product.stripePriceId) {
      console.error('Product missing stripePriceId:', product.id)
      return NextResponse.json({ error: 'Product not configured for purchase' }, { status: 400 })
    }

    // Ensure user has a Stripe customer ID
    let stripeCustomerId = user.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: {
          userId: user.id,
        },
      })

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      })

      stripeCustomerId = customer.id
    }

    // Create Stripe checkout session for one-time purchase
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: product.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${vendorSlug}/products/${productId}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${vendorSlug}/products/${productId}?canceled=true`,
      metadata: {
        type: 'product_purchase',
        productId: product.id,
        userId: user.id,
        vendorId: product.vendor.id,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Error creating product checkout:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Checkout failed: ${message}` }, { status: 500 })
  }
}
