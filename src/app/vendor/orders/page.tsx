import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'
import { formatAmountForDisplay } from '@/lib/stripe'
import { OrderStatusSelect } from './order-status-select'

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
}

export default async function VendorOrdersPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const vendor = await getVendorByUserId(user.id)

  if (!vendor || vendor.status !== 'APPROVED') {
    redirect('/vendor')
  }

  const orders = await prisma.order.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: 'desc' },
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

  const orderStats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'PENDING' || o.status === 'PAID').length,
    processing: orders.filter((o) => o.status === 'PROCESSING').length,
    shipped: orders.filter((o) => o.status === 'SHIPPED').length,
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
              <Link href="/vendor" className="text-gray-600 hover:text-black">
                Dashboard
              </Link>
              <Link href="/vendor/products" className="text-gray-600 hover:text-black">
                Products
              </Link>
              <Link href="/vendor/orders" className="font-medium text-black">
                Orders
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
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="mt-1 text-gray-600">Manage and fulfill customer orders</p>

        {/* Order Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className="mt-1 text-2xl font-bold">{orderStats.total}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-600">Needs Action</p>
            <p className="mt-1 text-2xl font-bold text-yellow-600">{orderStats.pending}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-600">Processing</p>
            <p className="mt-1 text-2xl font-bold text-purple-600">{orderStats.processing}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-600">Shipped</p>
            <p className="mt-1 text-2xl font-bold text-indigo-600">{orderStats.shipped}</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="mt-8 rounded-lg border bg-white p-8 text-center">
            <span className="text-4xl">📦</span>
            <p className="mt-4 text-gray-600">No orders yet.</p>
            <p className="mt-1 text-sm text-gray-500">
              Orders will appear here when customers make purchases.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border bg-white shadow-sm"
              >
                <div className="border-b p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-medium">
                          Order #{order.id.slice(-8).toUpperCase()}
                        </p>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColors[order.status]
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {order.createdAt.toLocaleDateString()} at{' '}
                        {order.createdAt.toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {formatAmountForDisplay(order.totalInCents)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Customer Info */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Customer</h3>
                      <p className="mt-1 text-sm">{order.user.name || 'No name'}</p>
                      <p className="text-sm text-gray-500">{order.user.email}</p>

                      {order.shippingAddress && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-700">Shipping Address</h4>
                          <p className="mt-1 text-sm text-gray-600">
                            {order.shippingAddress.line1}
                            {order.shippingAddress.line2 && (
                              <>, {order.shippingAddress.line2}</>
                            )}
                            <br />
                            {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                            {order.shippingAddress.postalCode}
                            <br />
                            {order.shippingAddress.country}
                          </p>
                        </div>
                      )}

                      {order.notes && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-700">Order Notes</h4>
                          <p className="mt-1 text-sm text-gray-600">{order.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Order Items */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Items</h3>
                      <div className="mt-2 space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            {item.product.images.length > 0 ? (
                              <div className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0">
                                <Image
                                  src={item.product.images[0]}
                                  alt={item.product.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-gray-400 flex-shrink-0">
                                📦
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.product.name}</p>
                              <p className="text-xs text-gray-500">
                                {item.quantity} × {formatAmountForDisplay(item.priceInCents)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Status Update */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700">
                          Update Status:
                        </label>
                        <OrderStatusSelect
                          orderId={order.id}
                          currentStatus={order.status}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
