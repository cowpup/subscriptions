'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { formatAmountForDisplay } from '@/lib/stripe'

interface OrderItem {
  id: string
  quantity: number
  priceInCents: number
  product: {
    name: string
    images: string[]
  }
}

interface ShippingAddress {
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  country: string
}

interface Order {
  id: string
  status: string
  totalInCents: number
  createdAt: Date
  notes: string | null
  user: {
    name: string | null
    email: string
  }
  shippingAddress: ShippingAddress | null
  items: OrderItem[]
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
}

interface ShipmentCardProps {
  order: Order
}

export function ShipmentCard({ order }: ShipmentCardProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [showTrackingInput, setShowTrackingInput] = useState(false)

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true)

    try {
      const response = await fetch(`/api/vendor/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        router.refresh()
      }
    } catch {
      // Handle error silently
    }

    setIsUpdating(false)
    setShowTrackingInput(false)
  }

  const isAwaiting = order.status === 'PAID' || order.status === 'PROCESSING'

  return (
    <div className="rounded-lg border bg-white shadow-sm">
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
              {new Date(order.createdAt).toLocaleDateString()} at{' '}
              {new Date(order.createdAt).toLocaleTimeString()}
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
          {/* Customer & Shipping Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-700">Ship To</h3>
            <p className="mt-1 text-sm font-medium">{order.user.name || 'No name'}</p>
            <p className="text-sm text-gray-500">{order.user.email}</p>

            {order.shippingAddress && (
              <div className="mt-2 text-sm text-gray-600">
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            )}

            {order.notes && (
              <div className="mt-3 rounded-md bg-yellow-50 p-2">
                <p className="text-xs font-medium text-yellow-800">Order Notes</p>
                <p className="text-sm text-yellow-700">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Items */}
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
                      Qty: {item.quantity} × {formatAmountForDisplay(item.priceInCents)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t">
          {isAwaiting ? (
            <div className="flex flex-wrap items-center gap-3">
              {order.status === 'PAID' && (
                <button
                  onClick={() => void updateStatus('PROCESSING')}
                  disabled={isUpdating}
                  className="rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  Start Processing
                </button>
              )}

              {showTrackingInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tracking number (optional)"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <button
                    onClick={() => void updateStatus('SHIPPED')}
                    disabled={isUpdating}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Confirm Shipped
                  </button>
                  <button
                    onClick={() => setShowTrackingInput(false)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTrackingInput(true)}
                  disabled={isUpdating}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Mark as Shipped
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {order.status === 'SHIPPED' && (
                <button
                  onClick={() => void updateStatus('DELIVERED')}
                  disabled={isUpdating}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Mark as Delivered
                </button>
              )}
              <span className="text-sm text-gray-500">
                {order.status === 'DELIVERED' && '✓ Order completed'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
