import { prisma } from './prisma'

interface MonthlyData {
  month: string
  value: number
}

interface VendorAnalytics {
  // Subscriber metrics
  totalSubscribers: number
  activeSubscribers: number
  subscribersByTier: Array<{ tierName: string; count: number; revenue: number }>
  newSubscribersThisMonth: number
  newSubscribersLastMonth: number
  churnedThisMonth: number

  // Revenue metrics
  totalRevenue: number
  subscriptionRevenue: number
  productRevenue: number
  revenueThisMonth: number
  revenueLastMonth: number
  averageOrderValue: number

  // Order metrics
  totalOrders: number
  ordersThisMonth: number
  ordersAwaitingShipment: number
  productsSold: number

  // Trend data for charts
  subscriberTrend: MonthlyData[]
  revenueTrend: MonthlyData[]
}

export async function getVendorAnalytics(vendorId: string): Promise<VendorAnalytics> {
  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  // Get vendor's tier IDs for subscription queries
  const vendorTiers = await prisma.subscriptionTier.findMany({
    where: { vendorId },
    select: { id: true, name: true, priceInCents: true },
  })
  const tierIds = vendorTiers.map((t) => t.id)

  // Parallel queries for better performance
  const [
    allSubscriptions,
    activeSubscriptions,
    newThisMonth,
    newLastMonth,
    cancelledThisMonth,
    allOrders,
    ordersThisMonth,
    ordersLastMonth,
    awaitingShipment,
    orderItems,
  ] = await Promise.all([
    // All subscriptions ever for this vendor
    prisma.subscription.findMany({
      where: { tierId: { in: tierIds } },
      include: { tier: { select: { name: true, priceInCents: true } } },
    }),

    // Currently active subscriptions
    prisma.subscription.findMany({
      where: {
        tierId: { in: tierIds },
        status: 'ACTIVE',
        accessExpiresAt: { gte: now },
      },
      include: { tier: { select: { name: true, priceInCents: true } } },
    }),

    // New subscriptions this month
    prisma.subscription.count({
      where: {
        tierId: { in: tierIds },
        createdAt: { gte: startOfThisMonth },
      },
    }),

    // New subscriptions last month
    prisma.subscription.count({
      where: {
        tierId: { in: tierIds },
        createdAt: { gte: startOfLastMonth, lt: startOfThisMonth },
      },
    }),

    // Churned (cancelled) this month
    prisma.subscription.count({
      where: {
        tierId: { in: tierIds },
        status: 'CANCELLED',
        cancelledAt: { gte: startOfThisMonth },
      },
    }),

    // All orders
    prisma.order.findMany({
      where: { vendorId, status: { not: 'CANCELLED' } },
      select: { id: true, totalInCents: true, createdAt: true, status: true },
    }),

    // Orders this month
    prisma.order.findMany({
      where: {
        vendorId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: startOfThisMonth },
      },
      select: { totalInCents: true },
    }),

    // Orders last month
    prisma.order.findMany({
      where: {
        vendorId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: startOfLastMonth, lt: startOfThisMonth },
      },
      select: { totalInCents: true },
    }),

    // Orders awaiting shipment
    prisma.order.count({
      where: {
        vendorId,
        status: { in: ['PAID', 'PROCESSING'] },
      },
    }),

    // All order items for products sold count
    prisma.orderItem.findMany({
      where: {
        order: { vendorId, status: { not: 'CANCELLED' } },
      },
      select: { quantity: true },
    }),
  ])

  // Calculate subscribers by tier
  const tierCounts = new Map<string, { count: number; revenue: number }>()
  for (const sub of activeSubscriptions) {
    const tierName = sub.tier.name
    const existing = tierCounts.get(tierName) ?? { count: 0, revenue: 0 }
    tierCounts.set(tierName, {
      count: existing.count + 1,
      revenue: existing.revenue + sub.tier.priceInCents,
    })
  }
  const subscribersByTier = Array.from(tierCounts.entries()).map(([tierName, data]) => ({
    tierName,
    count: data.count,
    revenue: data.revenue / 100,
  }))

  // Revenue calculations
  const productRevenue = allOrders.reduce((sum, o) => sum + o.totalInCents, 0) / 100
  const monthlySubscriptionRevenue = activeSubscriptions.reduce(
    (sum, s) => sum + s.tier.priceInCents,
    0
  ) / 100

  // Estimate total subscription revenue based on all subscriptions
  const subscriptionRevenue = allSubscriptions.reduce(
    (sum, s) => sum + s.tier.priceInCents,
    0
  ) / 100

  const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + o.totalInCents, 0) / 100
  const revenueLastMonth = ordersLastMonth.reduce((sum, o) => sum + o.totalInCents, 0) / 100

  const productsSold = orderItems.reduce((sum, item) => sum + item.quantity, 0)
  const averageOrderValue = allOrders.length > 0
    ? (allOrders.reduce((sum, o) => sum + o.totalInCents, 0) / allOrders.length) / 100
    : 0

  // Build trend data for last 6 months
  const subscriberTrend = await buildSubscriberTrend(tierIds, 6)
  const revenueTrend = await buildRevenueTrend(vendorId, 6)

  return {
    totalSubscribers: allSubscriptions.length,
    activeSubscribers: activeSubscriptions.length,
    subscribersByTier,
    newSubscribersThisMonth: newThisMonth,
    newSubscribersLastMonth: newLastMonth,
    churnedThisMonth: cancelledThisMonth,

    totalRevenue: productRevenue + subscriptionRevenue,
    subscriptionRevenue: monthlySubscriptionRevenue,
    productRevenue,
    revenueThisMonth,
    revenueLastMonth,
    averageOrderValue,

    totalOrders: allOrders.length,
    ordersThisMonth: ordersThisMonth.length,
    ordersAwaitingShipment: awaitingShipment,
    productsSold,

    subscriberTrend,
    revenueTrend,
  }
}

async function buildSubscriberTrend(tierIds: string[], months: number): Promise<MonthlyData[]> {
  const trend: MonthlyData[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short' })

    // Count active subscribers at end of that month
    const count = await prisma.subscription.count({
      where: {
        tierId: { in: tierIds },
        createdAt: { lte: monthEnd },
        OR: [
          { status: 'ACTIVE' },
          { cancelledAt: { gt: monthEnd } },
        ],
      },
    })

    trend.push({ month: monthLabel, value: count })
  }

  return trend
}

async function buildRevenueTrend(vendorId: string, months: number): Promise<MonthlyData[]> {
  const trend: MonthlyData[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short' })

    const orders = await prisma.order.findMany({
      where: {
        vendorId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      select: { totalInCents: true },
    })

    const revenue = orders.reduce((sum, o) => sum + o.totalInCents, 0) / 100
    trend.push({ month: monthLabel, value: revenue })
  }

  return trend
}

// Simplified analytics for the dashboard snippet
export interface AnalyticsSnippet {
  activeSubscribers: number
  revenueThisMonth: number
  ordersAwaitingShipment: number
  subscriberChange: number // % change from last month
}

export async function getAnalyticsSnippet(vendorId: string): Promise<AnalyticsSnippet> {
  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const vendorTiers = await prisma.subscriptionTier.findMany({
    where: { vendorId },
    select: { id: true },
  })
  const tierIds = vendorTiers.map((t) => t.id)

  const [activeSubscribers, lastMonthSubscribers, ordersThisMonth, awaitingShipment] =
    await Promise.all([
      prisma.subscription.count({
        where: {
          tierId: { in: tierIds },
          status: 'ACTIVE',
          accessExpiresAt: { gte: now },
        },
      }),
      prisma.subscription.count({
        where: {
          tierId: { in: tierIds },
          createdAt: { lt: startOfThisMonth },
          OR: [
            { status: 'ACTIVE' },
            { cancelledAt: { gte: startOfLastMonth } },
          ],
        },
      }),
      prisma.order.findMany({
        where: {
          vendorId,
          status: { not: 'CANCELLED' },
          createdAt: { gte: startOfThisMonth },
        },
        select: { totalInCents: true },
      }),
      prisma.order.count({
        where: {
          vendorId,
          status: { in: ['PAID', 'PROCESSING'] },
        },
      }),
    ])

  const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + o.totalInCents, 0) / 100
  const subscriberChange = lastMonthSubscribers > 0
    ? Math.round(((activeSubscribers - lastMonthSubscribers) / lastMonthSubscribers) * 100)
    : activeSubscribers > 0 ? 100 : 0

  return {
    activeSubscribers,
    revenueThisMonth,
    ordersAwaitingShipment: awaitingShipment,
    subscriberChange,
  }
}
