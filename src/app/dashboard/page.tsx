import { currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await currentUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">
            SubscribeX
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Welcome, {user?.firstName ?? 'there'}!</h1>
        <p className="mt-2 text-gray-600">This is your dashboard. More features coming soon.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="My Subscriptions"
            description="View and manage your active subscriptions"
            href="/dashboard/subscriptions"
          />
          <DashboardCard
            title="Browse Creators"
            description="Discover new creators to subscribe to"
            href="/creators"
          />
          <DashboardCard
            title="Become a Creator"
            description="Start your own subscription storefront"
            href="/dashboard/become-creator"
          />
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
