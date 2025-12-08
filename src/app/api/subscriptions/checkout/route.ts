import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'

interface CheckoutRequest {
  tierId: string
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
    const { tierId } = body

    if (!tierId) {
      return NextResponse.json({ error: 'Tier ID required' }, { status: 400 })
    }

    // Get the tier with vendor info
    const tier = await prisma.subscriptionTier.findUnique({
      where: { id: tierId },
      include: {
        vendor: true,
      },
    })

    if (!tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
    }

    if (!tier.isActive) {
      return NextResponse.json({ error: 'Tier is not available' }, { status: 400 })
    }

    if (!tier.stripePriceId) {
      return NextResponse.json({ error: 'Tier not configured for payments' }, { status: 400 })
    }

    if (tier.vendor.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Vendor not available' }, { status: 400 })
    }

    // Check if user already has an active subscription to this tier
    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId_tierId: {
          userId: user.id,
          tierId: tier.id,
        },
      },
    })

    if (existingSubscription && existingSubscription.status === 'ACTIVE') {
      return NextResponse.json({ error: 'Already subscribed to this tier' }, { status: 400 })
    }

    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: {
          userId: user.id,
        },
      })

      stripeCustomerId = customer.id

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: tier.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        tierId: tier.id,
        vendorId: tier.vendorId,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tierId: tier.id,
          vendorId: tier.vendorId,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard/subscriptions?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/${tier.vendor.slug}?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
