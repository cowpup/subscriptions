import { prisma } from '@/lib/prisma'
import { Subscription, SubscriptionTier, Vendor } from '@prisma/client'

type SubscriptionWithTier = Subscription & {
  tier: SubscriptionTier & {
    vendor: Vendor
  }
}

export async function hasActiveAccess(userId: string, vendorId: string): Promise<boolean> {
  const now = new Date()

  // Check if user has any subscription to this vendor with valid access
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      tier: {
        vendorId,
      },
      accessExpiresAt: {
        gt: now,
      },
    },
  })

  return !!subscription
}

export async function getActiveSubscriptions(userId: string): Promise<SubscriptionWithTier[]> {
  const now = new Date()

  return prisma.subscription.findMany({
    where: {
      userId,
      accessExpiresAt: {
        gt: now,
      },
    },
    include: {
      tier: {
        include: {
          vendor: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function getSubscriptionForVendor(
  userId: string,
  vendorId: string
): Promise<SubscriptionWithTier | null> {
  return prisma.subscription.findFirst({
    where: {
      userId,
      tier: {
        vendorId,
      },
    },
    include: {
      tier: {
        include: {
          vendor: true,
        },
      },
    },
  })
}

export async function canAccessProduct(
  userId: string,
  productId: string
): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      tierAccess: true,
      vendor: true,
    },
  })

  if (!product || !product.isActive) {
    return false
  }

  // Check if user has access to this vendor
  const hasVendorAccess = await hasActiveAccess(userId, product.vendorId)
  if (!hasVendorAccess) {
    return false
  }

  // If no tier restrictions, any subscriber can access
  if (product.tierAccess.length === 0) {
    return true
  }

  // Check if user's subscription tier is in the allowed tiers
  const subscription = await getSubscriptionForVendor(userId, product.vendorId)
  if (!subscription) {
    return false
  }

  const allowedTierIds = product.tierAccess.map((ta) => ta.tierId)
  return allowedTierIds.includes(subscription.tierId)
}
