import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { getVendorAnalytics } from '@/lib/analytics'
import { AnalyticsCharts } from './analytics-charts'

export default async function VendorAnalyticsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const vendor = await getVendorByUserId(user.id)

  if (!vendor || vendor.status !== 'APPROVED') {
    redirect('/vendor')
  }

  const analytics = await getVendorAnalytics(vendor.id)

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
              <Link href="/vendor/shipments" className="text-gray-600 hover:text-black">
                Shipments
              </Link>
              <Link href="/vendor/subscribers" className="text-gray-600 hover:text-black">
                Subscribers
              </Link>
              <Link href="/vendor/analytics" className="font-medium text-black">
                Analytics
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

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-gray-600">Track your store performance and growth</p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Active Subscribers"
            value={analytics.activeSubscribers.toString()}
            change={analytics.newSubscribersThisMonth - analytics.churnedThisMonth}
            changeLabel="net this month"
          />
          <MetricCard
            label="Monthly Revenue"
            value={`$${analytics.revenueThisMonth.toLocaleString()}`}
            change={
              analytics.revenueLastMonth > 0
                ? Math.round(
                    ((analytics.revenueThisMonth - analytics.revenueLastMonth) /
                      analytics.revenueLastMonth) *
                      100
                  )
                : analytics.revenueThisMonth > 0
                  ? 100
                  : 0
            }
            changeLabel="vs last month"
            isPercentage
          />
          <MetricCard
            label="Orders This Month"
            value={analytics.ordersThisMonth.toString()}
            subValue={`${analytics.ordersAwaitingShipment} awaiting shipment`}
          />
          <MetricCard
            label="Avg Order Value"
            value={`$${analytics.averageOrderValue.toFixed(2)}`}
            subValue={`${analytics.productsSold} products sold`}
          />
        </div>

        {/* Interactive Charts */}
        <AnalyticsCharts
          subscriberTrend={analytics.subscriberTrend}
          revenueTrend={analytics.revenueTrend}
          subscribersByTier={analytics.subscribersByTier}
        />

        {/* Detailed Stats */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Subscriber Breakdown */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="font-semibold">Subscriber Breakdown</h3>
            <div className="mt-4 space-y-3">
              <StatRow label="Total Subscribers (all time)" value={analytics.totalSubscribers} />
              <StatRow label="Active Subscribers" value={analytics.activeSubscribers} />
              <StatRow label="New This Month" value={analytics.newSubscribersThisMonth} highlight="green" />
              <StatRow label="New Last Month" value={analytics.newSubscribersLastMonth} />
              <StatRow label="Churned This Month" value={analytics.churnedThisMonth} highlight="red" />
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="font-semibold">Revenue Breakdown</h3>
            <div className="mt-4 space-y-3">
              <StatRow
                label="Total Revenue (all time)"
                value={`$${analytics.totalRevenue.toLocaleString()}`}
              />
              <StatRow
                label="Product Sales"
                value={`$${analytics.productRevenue.toLocaleString()}`}
              />
              <StatRow
                label="Monthly Subscription Revenue"
                value={`$${analytics.subscriptionRevenue.toLocaleString()}`}
              />
              <StatRow
                label="This Month"
                value={`$${analytics.revenueThisMonth.toLocaleString()}`}
                highlight="green"
              />
              <StatRow
                label="Last Month"
                value={`$${analytics.revenueLastMonth.toLocaleString()}`}
              />
            </div>
          </div>
        </div>

        {/* Subscribers by Tier */}
        {analytics.subscribersByTier.length > 0 && (
          <div className="mt-6 rounded-lg border bg-white p-6">
            <h3 className="font-semibold">Subscribers by Tier</h3>
            <div className="mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Tier</th>
                    <th className="pb-2 text-right font-medium">Subscribers</th>
                    <th className="pb-2 text-right font-medium">Monthly Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.subscribersByTier.map((tier) => (
                    <tr key={tier.tierName} className="border-b last:border-0">
                      <td className="py-3">{tier.tierName}</td>
                      <td className="py-3 text-right">{tier.count}</td>
                      <td className="py-3 text-right">${tier.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function MetricCard({
  label,
  value,
  change,
  changeLabel,
  subValue,
  isPercentage,
}: {
  label: string
  value: string
  change?: number
  changeLabel?: string
  subValue?: string
  isPercentage?: boolean
}) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {change !== undefined && changeLabel && (
        <p className={`mt-1 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}
          {change}
          {isPercentage ? '%' : ''} {changeLabel}
        </p>
      )}
      {subValue && <p className="mt-1 text-sm text-gray-500">{subValue}</p>}
    </div>
  )
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string | number
  highlight?: 'green' | 'red'
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span
        className={`font-medium ${
          highlight === 'green'
            ? 'text-green-600'
            : highlight === 'red'
              ? 'text-red-600'
              : ''
        }`}
      >
        {value}
      </span>
    </div>
  )
}
