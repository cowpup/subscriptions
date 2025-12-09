import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'

export default async function VendorDashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const vendor = await getVendorByUserId(user.id)

  if (!vendor) {
    redirect('/dashboard/become-creator')
  }

  // Show pending/rejected status
  if (vendor.status === 'PENDING') {
    return <PendingApprovalPage storeName={vendor.storeName} />
  }

  if (vendor.status === 'REJECTED') {
    return <RejectedPage storeName={vendor.storeName} reason={vendor.rejectionReason} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              subr.net
            </Link>
            <nav className="hidden items-center gap-4 text-sm md:flex">
              <Link href="/vendor" className="font-medium text-black">
                Dashboard
              </Link>
              <Link href="/vendor/products" className="text-gray-600 hover:text-black">
                Products
              </Link>
              <Link href="/vendor/orders" className="text-gray-600 hover:text-black">
                Orders
              </Link>
              <Link href="/vendor/subscribers" className="text-gray-600 hover:text-black">
                Subscribers
              </Link>
              <Link href="/vendor/tiers" className="text-gray-600 hover:text-black">
                Tiers
              </Link>
              <Link href="/vendor/giveaways" className="text-gray-600 hover:text-black">
                Giveaways
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
          <h1 className="text-2xl font-bold">{vendor.storeName}</h1>
          <p className="text-gray-600">subr.net/{vendor.slug}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Subscribers" value="0" />
          <StatCard title="Monthly Revenue" value="$0" />
          <StatCard title="Products" value="0" />
          <StatCard title="Active Giveaways" value="0" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="font-semibold">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <QuickActionLink href="/vendor/tiers/new" label="Create Subscription Tier" />
              <QuickActionLink href="/vendor/products/new" label="Add Product" />
              <QuickActionLink href="/vendor/giveaways/new" label="Start Giveaway" />
              <QuickActionLink href="/vendor/settings" label="Customize Storefront" />
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6">
            <h2 className="font-semibold">Getting Started</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <ChecklistItem done={false} label="Create your first subscription tier" />
              <ChecklistItem done={false} label="Add products to your inventory" />
              <ChecklistItem done={false} label="Connect your Stripe account" />
              <ChecklistItem done={false} label="Customize your storefront" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

function QuickActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md border px-4 py-2 text-sm hover:border-gray-400 hover:bg-gray-50"
    >
      {label}
    </Link>
  )
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
          done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'
        }`}
      >
        {done && '✓'}
      </span>
      <span className={done ? 'text-gray-400 line-through' : ''}>{label}</span>
    </div>
  )
}

function PendingApprovalPage({ storeName }: { storeName: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <span className="text-2xl">⏳</span>
        </div>
        <h1 className="text-xl font-bold">Application Under Review</h1>
        <p className="mt-2 text-gray-600">
          Your application for <strong>{storeName}</strong> is being reviewed by our team.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          This usually takes 1-2 business days. We&apos;ll notify you by email once a decision has
          been made.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

function RejectedPage({
  storeName,
  reason,
}: {
  storeName: string
  reason: string | null
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <span className="text-2xl">✕</span>
        </div>
        <h1 className="text-xl font-bold">Application Not Approved</h1>
        <p className="mt-2 text-gray-600">
          Unfortunately, your application for <strong>{storeName}</strong> was not approved.
        </p>
        {reason && (
          <div className="mt-4 rounded-md bg-gray-50 p-3 text-left text-sm">
            <p className="font-medium text-gray-700">Reason:</p>
            <p className="mt-1 text-gray-600">{reason}</p>
          </div>
        )}
        <p className="mt-4 text-sm text-gray-500">
          If you believe this was a mistake, please contact support.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
