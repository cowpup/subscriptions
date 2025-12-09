import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'
import { formatAmountForDisplay } from '@/lib/stripe'
import { SubscriberFilters } from './subscriber-filters'
import { SubscriberActions } from './subscriber-actions'
import { Prisma } from '@prisma/client'

interface PageProps {
  searchParams: Promise<{
    sort?: string
    order?: string
    tier?: string
    status?: string
    search?: string
  }>
}

export default async function VendorSubscribersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const sort = params.sort ?? 'date'
  const order = params.order ?? 'desc'
  const tierFilter = params.tier ?? ''
  const statusFilter = params.status ?? ''
  const search = params.search ?? ''

  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const vendor = await getVendorByUserId(user.id)

  if (!vendor || vendor.status !== 'APPROVED') {
    redirect('/vendor')
  }

  // Get vendor's tiers for filter dropdown
  const tiers = await prisma.subscriptionTier.findMany({
    where: { vendorId: vendor.id },
    orderBy: { priceInCents: 'asc' },
  })

  // Build where clause
  const where: Prisma.SubscriptionWhereInput = {
    tier: { vendorId: vendor.id },
  }

  if (tierFilter) {
    where.tierId = tierFilter
  }

  if (statusFilter === 'active') {
    where.accessExpiresAt = { gt: new Date() }
    where.status = 'ACTIVE'
  } else if (statusFilter === 'cancelled') {
    where.cancelledAt = { not: null }
  } else if (statusFilter === 'expired') {
    where.accessExpiresAt = { lte: new Date() }
  }

  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  // Build orderBy clause
  let orderBy: Prisma.SubscriptionOrderByWithRelationInput = { createdAt: 'desc' }
  if (sort === 'date') {
    orderBy = { createdAt: order as Prisma.SortOrder }
  } else if (sort === 'tier') {
    orderBy = { tier: { priceInCents: order as Prisma.SortOrder } }
  } else if (sort === 'expiry') {
    orderBy = { accessExpiresAt: order as Prisma.SortOrder }
  } else if (sort === 'name') {
    orderBy = { user: { name: order as Prisma.SortOrder } }
  }

  const subscriptions = await prisma.subscription.findMany({
    where,
    orderBy,
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      tier: {
        select: { id: true, name: true, priceInCents: true },
      },
    },
  })

  // Get stats
  const now = new Date()
  const activeCount = subscriptions.filter(
    (s) => s.accessExpiresAt > now && s.status === 'ACTIVE'
  ).length
  const cancelledCount = subscriptions.filter((s) => s.cancelledAt !== null).length
  const totalRevenue = subscriptions.reduce(
    (sum, s) => sum + (s.status === 'ACTIVE' ? s.tier.priceInCents : 0),
    0
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              subr.net
            </Link>
            <nav className="hidden items-center gap-4 text-sm md:flex">
              <Link href="/vendor" className="text-gray-600 hover:text-black">
                Dashboard
              </Link>
              <Link href="/vendor/products" className="text-gray-600 hover:text-black">
                Products
              </Link>
              <Link href="/vendor/orders" className="text-gray-600 hover:text-black">
                Orders
              </Link>
              <Link href="/vendor/subscribers" className="font-medium text-black">
                Subscribers
              </Link>
              <Link href="/vendor/tiers" className="text-gray-600 hover:text-black">
                Tiers
              </Link>
              <Link href="/vendor/settings" className="text-gray-600 hover:text-black">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/${vendor.slug}`}
              className="text-sm text-gray-600 hover:text-black"
              target="_blank"
            >
              View Store
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">Subscribers</h1>
        <p className="mt-1 text-gray-600">View and manage your subscribers</p>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-600">Active Subscribers</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-600">Cancelled</p>
            <p className="mt-1 text-2xl font-bold text-gray-600">{cancelledCount}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-600">Monthly Revenue</p>
            <p className="mt-1 text-2xl font-bold">{formatAmountForDisplay(totalRevenue)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6">
          <SubscriberFilters
            tiers={tiers}
            currentSort={sort}
            currentOrder={order}
            currentTier={tierFilter}
            currentStatus={statusFilter}
            currentSearch={search}
          />
        </div>

        {/* Subscribers List */}
        {subscriptions.length === 0 ? (
          <div className="mt-6 rounded-lg border bg-white p-8 text-center">
            <span className="text-4xl">👥</span>
            <p className="mt-4 text-gray-600">No subscribers found.</p>
            <p className="mt-1 text-sm text-gray-500">
              Subscribers will appear here when they sign up.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-lg border bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Subscriber
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Subscribed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Access Expires
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscriptions.map((subscription) => {
                  const isActive =
                    subscription.accessExpiresAt > now && subscription.status === 'ACTIVE'
                  const isCancelled = subscription.cancelledAt !== null
                  const isExpired = subscription.accessExpiresAt <= now

                  return (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {subscription.user.avatarUrl ? (
                            <img
                              src={subscription.user.avatarUrl}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                              {subscription.user.name?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {subscription.user.name ?? 'No name'}
                            </p>
                            <p className="text-xs text-gray-500">{subscription.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">
                          {subscription.tier.name}
                        </span>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {formatAmountForDisplay(subscription.tier.priceInCents)}/mo
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {isActive && !isCancelled && (
                          <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            Active
                          </span>
                        )}
                        {isCancelled && !isExpired && (
                          <span className="inline-block rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                            Cancelled (access until expiry)
                          </span>
                        )}
                        {isExpired && (
                          <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                            Expired
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {subscription.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {subscription.accessExpiresAt.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <SubscriberActions
                          subscriptionId={subscription.id}
                          userId={subscription.user.id}
                          userName={subscription.user.name ?? subscription.user.email}
                          isActive={isActive && !isCancelled}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
