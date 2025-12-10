import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatAmountForDisplay } from '@/lib/stripe'

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
}

export default async function OrdersPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      vendor: {
        select: { storeName: true, slug: true },
      },
      items: {
        include: {
          product: {
            select: { name: true, images: true },
          },
        },
      },
      shippingAddress: {
        select: { name: true, line1: true, line2: true, city: true, state: true, postalCode: true },
      },
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
              <Link href="/dashboard" className="text-gray-600 hover:text-black">
                Dashboard
              </Link>
              <Link href="/dashboard/subscriptions" className="text-gray-600 hover:text-black">
                Subscriptions
              </Link>
              <Link href="/dashboard/orders" className="font-medium text-black">
                Orders
              </Link>
            </nav>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Your Orders</h1>
        <p className="mt-1 text-gray-600">Track and manage your purchases</p>

        {orders.length === 0 ? (
          <div className="mt-8 rounded-lg border bg-white p-8 text-center">
            <span className="text-4xl">📦</span>
            <p className="mt-4 text-gray-600">You haven&apos;t placed any orders yet.</p>
            <p className="mt-1 text-sm text-gray-500">
              Browse stores and purchase products from your favorite creators.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      Order #{order.id.slice(-8).toUpperCase()}
                    </p>
                    <Link
                      href={`/${order.vendor.slug}`}
                      className="font-medium hover:underline"
                    >
                      {order.vendor.storeName}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {order.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                        statusColors[order.status]
                      }`}
                    >
                      {statusLabels[order.status]}
                    </span>
                    <p className="mt-1 font-bold">
                      {formatAmountForDisplay(order.totalInCents)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      {item.product.images.length > 0 ? (
                        <div className="relative h-12 w-12 rounded overflow-hidden">
                          <Image
                            src={item.product.images[0]}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100 text-gray-400">
                          📦
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{item.product.name}</p>
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity} × {formatAmountForDisplay(item.priceInCents)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tracking Information */}
                {order.trackingNumber && (
                  <div className="mt-3 border-t pt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Tracking:</span>
                      <a
                        href={`https://parcelsapp.com/en/tracking/${order.trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-600 hover:underline"
                      >
                        {order.trackingNumber}
                      </a>
                    </div>
                  </div>
                )}

                {/* Pre-order Badge */}
                {order.isPreOrder && order.preOrderShipDate && (
                  <div className="mt-3 border-t pt-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                      Pre-order - Ships {order.preOrderShipDate.toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Shipping Address */}
                {order.shippingAddress && (
                  <div className="mt-3 border-t pt-3 text-sm text-gray-500">
                    <p className="font-medium text-gray-700">Shipping to:</p>
                    <p>{order.shippingAddress.name}</p>
                    <p>{order.shippingAddress.line1}</p>
                    {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                  </div>
                )}

                {order.notes && (
                  <p className="mt-3 text-sm text-gray-600 border-t pt-3">
                    {order.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
