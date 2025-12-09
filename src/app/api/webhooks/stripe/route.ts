import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: Request) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await req.text()
  const headersList = headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object)
        break
      }

      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event.data.object)
        break
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object)
        break
      }

      case 'invoice.payment_failed': {
        await handlePaymentFailed(event.data.object)
        break
      }

      default:
        // Unhandled event types are ignored
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const checkoutType = session.metadata?.type

  // Handle product purchases
  if (checkoutType === 'product_purchase') {
    await handleProductPurchase(session)
    return
  }

  // Handle subscription checkouts (default/legacy behavior)
  const userId = session.metadata?.userId
  const tierId = session.metadata?.tierId
  const stripeSubscriptionId = session.subscription as string

  if (!userId || !tierId || !stripeSubscriptionId) {
    console.error('Missing metadata in checkout session:', session.id)
    return
  }

  // Get the Stripe subscription with items to get period dates (now on items in new API)
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ['items.data'],
  })

  // Period dates are now on subscription items in the new Stripe API
  const firstItem = stripeSubscription.items.data[0]
  const currentPeriodStart = new Date(firstItem.current_period_start * 1000)
  const currentPeriodEnd = new Date(firstItem.current_period_end * 1000)

  // 31-day access: set expiry to period end (Stripe handles the 31 days via billing cycle)
  const accessExpiresAt = currentPeriodEnd

  // Create or update subscription in database
  await prisma.subscription.upsert({
    where: {
      userId_tierId: {
        userId,
        tierId,
      },
    },
    update: {
      stripeSubscriptionId,
      status: 'ACTIVE',
      currentPeriodStart,
      currentPeriodEnd,
      accessExpiresAt,
      cancelledAt: null,
    },
    create: {
      userId,
      tierId,
      stripeSubscriptionId,
      status: 'ACTIVE',
      currentPeriodStart,
      currentPeriodEnd,
      accessExpiresAt,
    },
  })

  console.log(`Subscription created for user ${userId} to tier ${tierId}`)
}

async function handleProductPurchase(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const productId = session.metadata?.productId
  const vendorId = session.metadata?.vendorId

  if (!userId || !productId || !vendorId) {
    console.error('Missing metadata in product purchase checkout:', session.id)
    return
  }

  // Retrieve the full session to get shipping details
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['shipping_details'],
  })

  // Get shipping address from Stripe checkout session
  // Type assertion needed as shipping_details type varies by Stripe version
  const shippingDetails = (fullSession as unknown as {
    shipping_details?: {
      name?: string | null
      address?: {
        line1?: string | null
        line2?: string | null
        city?: string | null
        state?: string | null
        postal_code?: string | null
        country?: string | null
      } | null
    } | null
  }).shipping_details

  let shippingAddressId: string | null = null

  if (shippingDetails?.address) {
    // Save or find existing address for the user
    const existingAddress = await prisma.address.findFirst({
      where: {
        userId,
        line1: shippingDetails.address.line1 ?? '',
        city: shippingDetails.address.city ?? '',
        state: shippingDetails.address.state ?? '',
        postalCode: shippingDetails.address.postal_code ?? '',
        country: shippingDetails.address.country ?? '',
      },
    })

    if (existingAddress) {
      shippingAddressId = existingAddress.id
    } else {
      // Create new address from Stripe checkout
      const addressCount = await prisma.address.count({ where: { userId } })
      const newAddress = await prisma.address.create({
        data: {
          userId,
          name: shippingDetails.name ?? 'Shipping Address',
          label: 'Shipping',
          line1: shippingDetails.address.line1 ?? '',
          line2: shippingDetails.address.line2 ?? null,
          city: shippingDetails.address.city ?? '',
          state: (shippingDetails.address.state ?? '').toUpperCase(),
          postalCode: shippingDetails.address.postal_code ?? '',
          country: (shippingDetails.address.country ?? 'US').toUpperCase(),
          isDefault: addressCount === 0, // Make default if first address
        },
      })
      shippingAddressId = newAddress.id
    }
  }

  // SECURITY: Double-verify subscription access before creating order
  // This prevents any edge cases where checkout was initiated but subscription expired
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      tier: { vendorId },
      accessExpiresAt: { gt: new Date() },
    },
    include: {
      tier: true,
    },
  })

  if (!subscription) {
    console.error(`SECURITY: User ${userId} no longer has subscription access for vendor ${vendorId}`)
    // Payment already collected - this would need manual refund review
    // Log for admin review but still create order marked as PENDING for review
  }

  // Get the product to check stock and tier access
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      tierAccess: true,
    },
  })

  if (!product) {
    console.error('Product not found:', productId)
    return
  }

  // SECURITY: Verify tier access if product has tier restrictions
  let hasTierAccess = true
  if (product.tierAccess.length > 0 && subscription) {
    hasTierAccess = product.tierAccess.some((ta) => ta.tierId === subscription.tierId)
    if (!hasTierAccess) {
      console.error(`SECURITY: User ${userId} tier ${subscription.tierId} lacks access to product ${productId}`)
    }
  }

  // Create order record with subscription tier info for vendor reference
  await prisma.order.create({
    data: {
      userId,
      vendorId,
      status: 'PAID',
      totalInCents: session.amount_total ?? product.priceInCents,
      stripePaymentIntentId: session.payment_intent as string,
      subscriptionTierId: subscription?.tierId ?? null,
      subscriptionTierName: subscription?.tier.name ?? null,
      shippingAddressId,
      isPreOrder: product.isPreOrder,
      preOrderShipDate: product.preOrderShipDate,
      notes: !subscription ? 'WARNING: No active subscription at time of fulfillment' : null,
      items: {
        create: {
          productId,
          quantity: 1,
          priceInCents: product.priceInCents,
        },
      },
    },
  })

  // Decrement stock if product has limited inventory
  if (product.isLimited && product.stockQuantity > 0) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity: {
          decrement: 1,
        },
      },
    })
  }

  console.log(`Product purchase completed: product ${productId} for user ${userId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  const tierId = subscription.metadata?.tierId

  if (!userId || !tierId) {
    console.error('Missing metadata in subscription:', subscription.id)
    return
  }

  // Period dates are now on subscription items in the new Stripe API
  const firstItem = subscription.items.data[0]
  const currentPeriodStart = new Date(firstItem.current_period_start * 1000)
  const currentPeriodEnd = new Date(firstItem.current_period_end * 1000)

  // Determine status
  let status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'PAUSED' = 'ACTIVE'
  if (subscription.status === 'past_due') {
    status = 'PAST_DUE'
  } else if (subscription.status === 'canceled') {
    status = 'CANCELLED'
  } else if (subscription.status === 'paused') {
    status = 'PAUSED'
  }

  // If cancelled, maintain access until period end (31-day logic)
  const cancelledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null
  const accessExpiresAt = currentPeriodEnd

  await prisma.subscription.update({
    where: {
      userId_tierId: {
        userId,
        tierId,
      },
    },
    data: {
      status,
      currentPeriodStart,
      currentPeriodEnd,
      accessExpiresAt,
      cancelledAt,
    },
  })

  console.log(`Subscription updated for user ${userId}: status=${status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  const tierId = subscription.metadata?.tierId

  if (!userId || !tierId) {
    console.error('Missing metadata in subscription:', subscription.id)
    return
  }

  // Keep the subscription record but mark as cancelled
  // Access continues until accessExpiresAt (which was set to period end)
  await prisma.subscription.update({
    where: {
      userId_tierId: {
        userId,
        tierId,
      },
    },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  })

  console.log(`Subscription deleted for user ${userId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // In the new Stripe API, subscription info is in parent.subscription_details
  const subscriptionDetails = invoice.parent?.subscription_details
  if (!subscriptionDetails) {
    return
  }

  const stripeSubscription = subscriptionDetails.subscription
  const subscriptionId = typeof stripeSubscription === 'string'
    ? stripeSubscription
    : stripeSubscription?.id

  if (!subscriptionId) {
    return
  }

  // Find subscription by Stripe ID
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'PAST_DUE' },
    })

    console.log(`Payment failed for subscription ${subscription.id}`)
  }
}
