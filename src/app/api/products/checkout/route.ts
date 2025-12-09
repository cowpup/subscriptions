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

    // Get user's default address for pre-filling Stripe checkout
    const defaultAddress = await prisma.address.findFirst({
      where: { userId: user.id, isDefault: true },
    })

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
    if (!product.stripePriceId || !product.stripeProductId) {
      console.error('Product missing Stripe IDs:', product.id)
      return NextResponse.json({ error: 'Product not configured for purchase' }, { status: 400 })
    }

    // Ensure Stripe product is active
    const stripeProduct = await stripe.products.retrieve(product.stripeProductId)
    if (!stripeProduct.active) {
      await stripe.products.update(product.stripeProductId, { active: true })
    }

    // Ensure Stripe price is active, create new one if not
    const stripePrice = await stripe.prices.retrieve(product.stripePriceId)
    let activePriceId = product.stripePriceId

    if (!stripePrice.active) {
      const newPrice = await stripe.prices.create({
        product: product.stripeProductId,
        unit_amount: product.priceInCents,
        currency: 'usd',
      })
      activePriceId = newPrice.id

      // Update the product with the new price ID
      await prisma.product.update({
        where: { id: product.id },
        data: { stripePriceId: newPrice.id },
      })
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
        // Pre-fill shipping address if user has one saved
        ...(defaultAddress && {
          shipping: {
            name: defaultAddress.name,
            address: {
              line1: defaultAddress.line1,
              line2: defaultAddress.line2 ?? undefined,
              city: defaultAddress.city,
              state: defaultAddress.state,
              postal_code: defaultAddress.postalCode,
              country: defaultAddress.country,
            },
          },
        }),
      })

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      })

      stripeCustomerId = customer.id
    } else if (defaultAddress) {
      // Update existing customer's shipping address if they have a default
      await stripe.customers.update(stripeCustomerId, {
        shipping: {
          name: defaultAddress.name,
          address: {
            line1: defaultAddress.line1,
            line2: defaultAddress.line2 ?? undefined,
            city: defaultAddress.city,
            state: defaultAddress.state,
            postal_code: defaultAddress.postalCode,
            country: defaultAddress.country,
          },
        },
      })
    }

    // Create Stripe checkout session for one-time purchase with shipping
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: activePriceId,
          quantity: 1,
        },
      ],
      // Enable shipping address collection in Stripe Checkout
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
      // Pre-fill shipping address if user has one saved
      ...(defaultAddress && {
        customer_update: {
          shipping: 'auto',
        },
      }),
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
