import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'

interface CancelRequest {
  subscriptionId: string
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

    const body = (await req.json()) as CancelRequest
    const { subscriptionId } = body

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 })
    }

    // Get the subscription and verify ownership
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if (subscription.userId !== user.id) {
      return NextResponse.json({ error: 'Not your subscription' }, { status: 403 })
    }

    if (!subscription.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No Stripe subscription found' }, { status: 400 })
    }

    if (subscription.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Subscription already cancelled' }, { status: 400 })
    }

    // Cancel at period end so user keeps access until their billing period ends
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    // The webhook will update the subscription status when Stripe sends the event
    // But we can optimistically update the cancelledAt field
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelledAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
