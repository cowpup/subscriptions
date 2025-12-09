import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'

interface ChangeTierRequest {
  currentSubscriptionId: string
  newTierId: string
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

    const body = (await req.json()) as ChangeTierRequest
    const { currentSubscriptionId, newTierId } = body

    if (!currentSubscriptionId || !newTierId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get current subscription
    const currentSubscription = await prisma.subscription.findUnique({
      where: { id: currentSubscriptionId },
      include: {
        tier: {
          include: { vendor: true },
        },
      },
    })

    if (!currentSubscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if (currentSubscription.userId !== user.id) {
      return NextResponse.json({ error: 'Not your subscription' }, { status: 403 })
    }

    if (!currentSubscription.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No Stripe subscription found' }, { status: 400 })
    }

    // Get new tier
    const newTier = await prisma.subscriptionTier.findUnique({
      where: { id: newTierId },
      include: { vendor: true },
    })

    if (!newTier) {
      return NextResponse.json({ error: 'New tier not found' }, { status: 404 })
    }

    if (!newTier.isActive || !newTier.stripePriceId) {
      return NextResponse.json({ error: 'Tier not available' }, { status: 400 })
    }

    // Ensure same vendor
    if (newTier.vendorId !== currentSubscription.tier.vendorId) {
      return NextResponse.json({ error: 'Can only change tiers within same vendor' }, { status: 400 })
    }

    const isUpgrade = newTier.priceInCents > currentSubscription.tier.priceInCents

    // Get the Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(
      currentSubscription.stripeSubscriptionId
    )

    if (isUpgrade) {
      // Upgrade: Cancel current subscription immediately and start new one
      // User forfeits remainder but keeps any different benefits until old cycle expires
      await stripe.subscriptions.cancel(currentSubscription.stripeSubscriptionId, {
        prorate: true,
      })

      // Create new subscription checkout
      const session = await stripe.checkout.sessions.create({
        customer: user.stripeCustomerId!,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: newTier.stripePriceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId: user.id,
          tierId: newTier.id,
          vendorId: newTier.vendorId,
          isUpgrade: 'true',
          previousTierId: currentSubscription.tierId,
          previousAccessExpiresAt: currentSubscription.accessExpiresAt.toISOString(),
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            tierId: newTier.id,
            vendorId: newTier.vendorId,
          },
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard/subscriptions?upgraded=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/${newTier.vendor.slug}?canceled=true`,
      })

      return NextResponse.json({ url: session.url, type: 'upgrade' })
    } else {
      // Downgrade: Schedule the tier change at the end of current period
      // Update the subscription to the new price at period end
      await stripe.subscriptions.update(currentSubscription.stripeSubscriptionId, {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newTier.stripePriceId,
          },
        ],
        proration_behavior: 'none',
        metadata: {
          userId: user.id,
          tierId: newTier.id,
          vendorId: newTier.vendorId,
          scheduledDowngrade: 'true',
        },
      })

      // Update local subscription to new tier (access remains until period end)
      await prisma.subscription.update({
        where: { id: currentSubscriptionId },
        data: {
          tierId: newTier.id,
        },
      })

      return NextResponse.json({
        success: true,
        type: 'downgrade',
        message: 'Your subscription will change at the end of your current billing period',
        currentPeriodEnd: currentSubscription.currentPeriodEnd,
      })
    }
  } catch (error) {
    console.error('Error changing tier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
