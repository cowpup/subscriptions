import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { isCurrentUserAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export default async function AdminDashboardPage() {
  const isAdmin = await isCurrentUserAdmin()

  if (!isAdmin) {
    redirect('/dashboard')
  }

  const [pendingCount, totalVendors, totalUsers] = await Promise.all([
    prisma.vendor.count({ where: { status: 'PENDING' } }),
    prisma.vendor.count(),
    prisma.user.count(),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              SubscribeX
            </Link>
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/admin/vendors" className="text-sm text-gray-600 hover:text-black">
              Vendors
            </Link>
            <Link href="/admin/users" className="text-sm text-gray-600 hover:text-black">
              Users
            </Link>
            <UserButton afterSignOutUrl="/" />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <StatCard title="Pending Applications" value={pendingCount} href="/admin/vendors?status=pending" highlight={pendingCount > 0} />
          <StatCard title="Total Vendors" value={totalVendors} href="/admin/vendors" />
          <StatCard title="Total Users" value={totalUsers} href="/admin/users" />
        </div>

        {pendingCount > 0 && (
          <div className="mt-8">
            <Link
              href="/admin/vendors?status=pending"
              className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
            >
              Review {pendingCount} Pending Application{pendingCount > 1 ? 's' : ''}
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({
  title,
  value,
  href,
  highlight,
}: {
  title: string
  value: number
  href: string
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border bg-white p-6 transition hover:shadow-md ${
        highlight ? 'border-yellow-400 bg-yellow-50' : ''
      }`}
    >
      <p className="text-sm text-gray-600">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? 'text-yellow-700' : ''}`}>{value}</p>
    </Link>
  )
}
