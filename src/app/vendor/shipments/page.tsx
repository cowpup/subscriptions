import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'
import { ShipmentTabs } from './shipment-tabs'
import { ShipmentCard } from './shipment-card'
import { Prisma } from '@prisma/client'

interface PageProps {
  searchParams: Promise<{
    tab?: string
    sort?: string
    order?: string
    search?: string
  }>
}

export default async function VendorShipmentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const tab = params.tab ?? 'awaiting'
  const sort = params.sort ?? 'date'
  const order = params.order ?? 'desc'
  const search = params.search ?? ''

  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const vendor = await getVendorByUserId(user.id)

  if (!vendor || vendor.status !== 'APPROVED') {
    redirect('/vendor')
  }

  // Build where clause based on tab
  const where: Prisma.OrderWhereInput = {
    vendorId: vendor.id,
    status: tab === 'awaiting'
      ? { in: ['PAID', 'PROCESSING'] }
      : { in: ['SHIPPED', 'DELIVERED'] },
  }

  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ]
  }

  // Build orderBy clause
  let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: 'desc' }
  if (sort === 'date') {
    orderBy = { createdAt: order as Prisma.SortOrder }
  } else if (sort === 'total') {
    orderBy = { totalInCents: order as Prisma.SortOrder }
  } else if (sort === 'customer') {
    orderBy = { user: { name: order as Prisma.SortOrder } }
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy,
    include: {
      user: {
        select: { name: true, email: true },
      },
      shippingAddress: true,
      items: {
        include: {
          product: {
            select: { name: true, images: true },
          },
        },
      },
    },
  })

  // Get counts for tabs
  const awaitingCount = await prisma.order.count({
    where: {
      vendorId: vendor.id,
      status: { in: ['PAID', 'PROCESSING'] },
    },
  })

  const shippedCount = await prisma.order.count({
    where: {
      vendorId: vendor.id,
      status: { in: ['SHIPPED', 'DELIVERED'] },
    },
  })

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
              <Link href="/vendor/shipments" className="font-medium text-black">
                Shipments
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Shipments</h1>
            <p className="mt-1 text-gray-600">Track and manage order fulfillment</p>
          </div>
          <Link
            href="/vendor/orders"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            View All Orders
          </Link>
        </div>

        {/* Tabs */}
        <ShipmentTabs
          currentTab={tab}
          awaitingCount={awaitingCount}
          shippedCount={shippedCount}
          currentSort={sort}
          currentOrder={order}
          currentSearch={search}
        />

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="mt-6 rounded-lg border bg-white p-8 text-center">
            <span className="text-4xl">📦</span>
            <p className="mt-4 text-gray-600">
              {tab === 'awaiting'
                ? 'No orders awaiting shipment.'
                : 'No shipped orders yet.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <ShipmentCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
