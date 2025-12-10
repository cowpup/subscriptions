import { currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'

export default async function DashboardPage() {
  const clerkUser = await currentUser()
  const user = await getCurrentUser()
  let vendor = null

  if (user) {
    vendor = await getVendorByUserId(user.id)
  }

  const isApprovedVendor = vendor?.status === 'APPROVED'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Welcome, {clerkUser?.firstName ?? 'there'}!</h1>
        <p className="mt-2 text-gray-600">This is your dashboard.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="My Subscriptions"
            description="View and manage your active subscriptions"
            href="/dashboard/subscriptions"
          />
          <DashboardCard
            title="My Orders"
            description="Track your purchases and order history"
            href="/dashboard/orders"
          />
          <DashboardCard
            title="Shipping Addresses"
            description="Manage your shipping addresses"
            href="/dashboard/addresses"
          />
          <DashboardCard
            title="Notifications"
            description="Configure your notification preferences"
            href="/dashboard/notifications"
          />
          <DashboardCard
            title="Browse Creators"
            description="Discover new creators to subscribe to"
            href="/creators"
          />
          {!isApprovedVendor && (
            <DashboardCard
              title="Become a Creator"
              description="Start your own subscription storefront"
              href="/dashboard/become-creator"
            />
          )}
        </div>
      </main>
    </div>
  )
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border bg-white p-6 shadow-sm transition hover:shadow-md"
    >
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </Link>
  )
}
