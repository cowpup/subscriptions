import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { stripe } from '@/lib/stripe'

interface UpdateTierRequest {
  name?: string
  description?: string | null
  priceInCents?: number
  benefits?: string[]
  isActive?: boolean
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { userId } = await auth()
    const { id } = await context.params

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

    const tier = await prisma.subscriptionTier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    })

    if (!tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
    }

    if (tier.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Not your tier' }, { status: 403 })
    }

    const body = (await req.json()) as UpdateTierRequest
    const { name, description, priceInCents, benefits, isActive } = body

    // Validate price if provided
    if (priceInCents !== undefined) {
      if (priceInCents < 100) {
        return NextResponse.json({ error: 'Price must be at least $1.00' }, { status: 400 })
      }

      // Don't allow price change if there are active subscribers
      if (tier._count.subscriptions > 0 && priceInCents !== tier.priceInCents) {
        return NextResponse.json(
          { error: 'Cannot change price while there are active subscribers' },
          { status: 400 }
        )
      }
    }

    // Update Stripe price metadata if name changed (Stripe prices are immutable, but we can update metadata)
    if (name && name !== tier.name && tier.stripePriceId) {
      await stripe.prices.update(tier.stripePriceId, {
        nickname: name,
      })
    }

    // Update the tier
    const updatedTier = await prisma.subscriptionTier.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(priceInCents !== undefined && { priceInCents }),
        ...(benefits !== undefined && { benefits }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ tier: updatedTier })
  } catch (error) {
    console.error('Error updating tier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { userId } = await auth()
    const { id } = await context.params

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

    const tier = await prisma.subscriptionTier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    })

    if (!tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
    }

    if (tier.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Not your tier' }, { status: 403 })
    }

    // Don't allow deletion if there are active subscribers
    if (tier._count.subscriptions > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tier with active subscribers. Deactivate it instead.' },
        { status: 400 }
      )
    }

    // Archive the Stripe price instead of deleting
    if (tier.stripePriceId) {
      await stripe.prices.update(tier.stripePriceId, {
        active: false,
      })
    }

    // Delete the tier
    await prisma.subscriptionTier.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
