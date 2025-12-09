import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { isCurrentUserAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { VendorStatus } from '@prisma/client'
import { VendorActions } from './vendor-actions'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminVendorsPage({ searchParams }: Props) {
  const isAdmin = await isCurrentUserAdmin()

  if (!isAdmin) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const statusFilter = params.status?.toUpperCase() as VendorStatus | undefined

  const vendors = await prisma.vendor.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
    orderBy: { appliedAt: 'desc' },
  })

  const counts = await prisma.vendor.groupBy({
    by: ['status'],
    _count: true,
  })

  const countMap = counts.reduce(
    (acc, c) => ({ ...acc, [c.status]: c._count }),
    {} as Record<string, number>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              subr.net
            </Link>
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-gray-600 hover:text-black">
              Dashboard
            </Link>
            <Link href="/admin/vendors" className="text-sm font-medium">
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
        <h1 className="text-2xl font-bold">Vendor Applications</h1>

        <div className="mt-4 flex gap-2">
          <FilterButton href="/admin/vendors" active={!statusFilter} label="All" count={vendors.length} />
          <FilterButton
            href="/admin/vendors?status=pending"
            active={statusFilter === 'PENDING'}
            label="Pending"
            count={countMap.PENDING ?? 0}
            highlight
          />
          <FilterButton
            href="/admin/vendors?status=approved"
            active={statusFilter === 'APPROVED'}
            label="Approved"
            count={countMap.APPROVED ?? 0}
          />
          <FilterButton
            href="/admin/vendors?status=rejected"
            active={statusFilter === 'REJECTED'}
            label="Rejected"
            count={countMap.REJECTED ?? 0}
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Applied
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div>
                      <div className="font-medium">{vendor.storeName}</div>
                      <div className="text-sm text-gray-500">/{vendor.slug}</div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm">{vendor.user.name ?? 'No name'}</div>
                    <div className="text-sm text-gray-500">{vendor.user.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {vendor.appliedAt.toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={vendor.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    {vendor.status === 'PENDING' && <VendorActions vendorId={vendor.id} />}
                  </td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No vendors found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

function FilterButton({
  href,
  active,
  label,
  count,
  highlight,
}: {
  href: string
  active: boolean
  label: string
  count: number
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm ${
        active
          ? 'bg-black text-white'
          : highlight && count > 0
            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label} ({count})
    </Link>
  )
}

function StatusBadge({ status }: { status: VendorStatus }) {
  const styles = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}
