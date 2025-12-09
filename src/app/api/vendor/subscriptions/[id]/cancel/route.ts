import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id: subscriptionId } = await params
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
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    // Get the subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        tier: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Verify this subscription belongs to the vendor
    if (subscription.tier.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Not your subscriber' }, { status: 403 })
    }

    if (!subscription.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No Stripe subscription found' }, { status: 400 })
    }

    if (subscription.cancelledAt) {
      return NextResponse.json({ error: 'Already cancelled' }, { status: 400 })
    }

    // Cancel at period end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    // Update local subscription
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
