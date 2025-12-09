'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { formatAmountForDisplay } from '@/lib/format'

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
  name: string
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  country: string
}

interface ShippingRate {
  objectId: string
  provider: string
  servicelevel: {
    name: string
    token: string
  }
  amount: string
  currency: string
  estimatedDays: number
  durationTerms: string
}

interface Order {
  id: string
  status: string
  totalInCents: number
  createdAt: Date
  notes: string | null
  isPreOrder: boolean
  preOrderShipDate: Date | null
  trackingNumber: string | null
  shippingLabelUrl: string | null
  weightOz: number | null
  lengthIn: number | null
  widthIn: number | null
  heightIn: number | null
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
  const [showShippingForm, setShowShippingForm] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [showRates, setShowRates] = useState(false)
  const [rates, setRates] = useState<ShippingRate[]>([])
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Package dimensions form
  const [weightOz, setWeightOz] = useState(order.weightOz?.toString() ?? '')
  const [lengthIn, setLengthIn] = useState(order.lengthIn?.toString() ?? '')
  const [widthIn, setWidthIn] = useState(order.widthIn?.toString() ?? '')
  const [heightIn, setHeightIn] = useState(order.heightIn?.toString() ?? '')

  // Manual address form
  const [addrName, setAddrName] = useState('')
  const [addrLine1, setAddrLine1] = useState('')
  const [addrLine2, setAddrLine2] = useState('')
  const [addrCity, setAddrCity] = useState('')
  const [addrState, setAddrState] = useState('')
  const [addrPostalCode, setAddrPostalCode] = useState('')
  const [addrCountry, setAddrCountry] = useState('US')

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    setError('')

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
      setError('Failed to update status')
    }

    setIsUpdating(false)
  }

  const getRates = async () => {
    if (!weightOz || !lengthIn || !widthIn || !heightIn) {
      setError('Please enter all package dimensions')
      return
    }

    setIsUpdating(true)
    setError('')

    try {
      const response = await fetch(`/api/vendor/orders/${order.id}/shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weightOz: parseFloat(weightOz),
          lengthIn: parseFloat(lengthIn),
          widthIn: parseFloat(widthIn),
          heightIn: parseFloat(heightIn),
        }),
      })

      const data = (await response.json()) as { error?: string; rates?: ShippingRate[] }

      if (!response.ok) {
        setError(data.error ?? 'Failed to get shipping rates')
        setIsUpdating(false)
        return
      }

      setRates(data.rates ?? [])
      setShowRates(true)
      setShowShippingForm(false)
    } catch {
      setError('Failed to get shipping rates')
    }

    setIsUpdating(false)
  }

  const purchaseLabel = async () => {
    if (!selectedRateId) {
      setError('Please select a shipping rate')
      return
    }

    setIsUpdating(true)
    setError('')

    try {
      const response = await fetch(`/api/vendor/orders/${order.id}/shipping`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rateId: selectedRateId,
          weightOz: parseFloat(weightOz),
          lengthIn: parseFloat(lengthIn),
          widthIn: parseFloat(widthIn),
          heightIn: parseFloat(heightIn),
        }),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(data.error ?? 'Failed to purchase shipping label')
        setIsUpdating(false)
        return
      }

      router.refresh()
    } catch {
      setError('Failed to purchase shipping label')
    }

    setIsUpdating(false)
  }

  const saveAddress = async () => {
    if (!addrName || !addrLine1 || !addrCity || !addrState || !addrPostalCode) {
      setError('Please fill in all required address fields')
      return
    }

    setIsUpdating(true)
    setError('')

    try {
      const response = await fetch(`/api/vendor/orders/${order.id}/address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addrName,
          line1: addrLine1,
          line2: addrLine2 || null,
          city: addrCity,
          state: addrState,
          postalCode: addrPostalCode,
          country: addrCountry,
        }),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(data.error ?? 'Failed to save address')
        setIsUpdating(false)
        return
      }

      setShowAddressForm(false)
      router.refresh()
    } catch {
      setError('Failed to save address')
    }

    setIsUpdating(false)
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
              {order.isPreOrder && (
                <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  Pre-Order
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(order.createdAt).toLocaleDateString()} at{' '}
              {new Date(order.createdAt).toLocaleTimeString()}
            </p>
            {order.isPreOrder && order.preOrderShipDate && (
              <p className="mt-1 text-xs text-blue-600">
                Ship by: {new Date(order.preOrderShipDate).toLocaleDateString()}
              </p>
            )}
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

            {order.shippingAddress ? (
              <div className="mt-2 text-sm text-gray-600">
                <p>{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            ) : (
              <div className="mt-2 rounded-md bg-yellow-50 border border-yellow-200 p-2">
                <p className="text-xs font-medium text-yellow-800">No shipping address</p>
                <p className="text-xs text-yellow-700">
                  Contact customer at {order.user.email} for shipping details
                </p>
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="mt-2 text-xs font-medium text-yellow-900 underline hover:no-underline"
                >
                  Add address manually
                </button>
              </div>
            )}

            {order.notes && (
              <div className="mt-3 rounded-md bg-yellow-50 p-2">
                <p className="text-xs font-medium text-yellow-800">Order Notes</p>
                <p className="text-sm text-yellow-700">{order.notes}</p>
              </div>
            )}

            {/* Tracking Info */}
            {order.trackingNumber && (
              <div className="mt-3 rounded-md bg-indigo-50 p-2">
                <p className="text-xs font-medium text-indigo-800">Tracking</p>
                <p className="text-sm font-mono text-indigo-700">{order.trackingNumber}</p>
                {order.shippingLabelUrl && (
                  <a
                    href={order.shippingLabelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-indigo-600 hover:text-indigo-800 underline"
                  >
                    Download Label
                  </a>
                )}
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

        {/* Error Message */}
        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Manual Address Form */}
        {showAddressForm && (
          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
            <h4 className="text-sm font-medium text-gray-700">Add Shipping Address</h4>
            <div className="mt-3 grid gap-3">
              <div>
                <label className="block text-xs text-gray-600">Full Name *</label>
                <input
                  type="text"
                  value={addrName}
                  onChange={(e) => setAddrName(e.target.value)}
                  placeholder="John Doe"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Street Address *</label>
                <input
                  type="text"
                  value={addrLine1}
                  onChange={(e) => setAddrLine1(e.target.value)}
                  placeholder="123 Main St"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Apt, Suite, etc.</label>
                <input
                  type="text"
                  value={addrLine2}
                  onChange={(e) => setAddrLine2(e.target.value)}
                  placeholder="Apt 4B"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-600">City *</label>
                  <input
                    type="text"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    placeholder="San Francisco"
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">State *</label>
                  <input
                    type="text"
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    placeholder="CA"
                    maxLength={2}
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">ZIP *</label>
                  <input
                    type="text"
                    value={addrPostalCode}
                    onChange={(e) => setAddrPostalCode(e.target.value)}
                    placeholder="94102"
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Country</label>
                  <select
                    value={addrCountry}
                    onChange={(e) => setAddrCountry(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    <option value="US">US</option>
                    <option value="CA">CA</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => void saveAddress()}
                disabled={isUpdating}
                className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save Address'}
              </button>
              <button
                onClick={() => setShowAddressForm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Shipping Form */}
        {showShippingForm && (
          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
            <h4 className="text-sm font-medium text-gray-700">Package Dimensions</h4>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs text-gray-600">Weight (oz)</label>
                <input
                  type="number"
                  value={weightOz}
                  onChange={(e) => setWeightOz(e.target.value)}
                  placeholder="16"
                  min="0.1"
                  step="0.1"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Length (in)</label>
                <input
                  type="number"
                  value={lengthIn}
                  onChange={(e) => setLengthIn(e.target.value)}
                  placeholder="10"
                  min="0.1"
                  step="0.1"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Width (in)</label>
                <input
                  type="number"
                  value={widthIn}
                  onChange={(e) => setWidthIn(e.target.value)}
                  placeholder="8"
                  min="0.1"
                  step="0.1"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Height (in)</label>
                <input
                  type="number"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  placeholder="4"
                  min="0.1"
                  step="0.1"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => void getRates()}
                disabled={isUpdating}
                className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isUpdating ? 'Getting Rates...' : 'Get Shipping Rates'}
              </button>
              <button
                onClick={() => setShowShippingForm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Shipping Rates */}
        {showRates && rates.length > 0 && (
          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
            <h4 className="text-sm font-medium text-gray-700">Select Shipping Rate</h4>
            <div className="mt-3 space-y-2">
              {rates.map((rate) => (
                <label
                  key={rate.objectId}
                  className={`flex cursor-pointer items-center justify-between rounded-md border p-3 ${
                    selectedRateId === rate.objectId
                      ? 'border-black bg-white'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingRate"
                      value={rate.objectId}
                      checked={selectedRateId === rate.objectId}
                      onChange={() => setSelectedRateId(rate.objectId)}
                      className="h-4 w-4 text-black focus:ring-black"
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {rate.provider} - {rate.servicelevel.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {rate.estimatedDays > 0
                          ? `${rate.estimatedDays} business day${rate.estimatedDays > 1 ? 's' : ''}`
                          : rate.durationTerms}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold">
                    ${parseFloat(rate.amount).toFixed(2)}
                  </p>
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => void purchaseLabel()}
                disabled={isUpdating || !selectedRateId}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isUpdating ? 'Purchasing...' : 'Purchase Label'}
              </button>
              <button
                onClick={() => {
                  setShowRates(false)
                  setShowShippingForm(true)
                  setSelectedRateId(null)
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!showShippingForm && !showRates && !showAddressForm && (
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

                {!order.trackingNumber && order.shippingAddress && (
                  <button
                    onClick={() => setShowShippingForm(true)}
                    disabled={isUpdating}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Create Shipping Label
                  </button>
                )}

                {!order.trackingNumber && !order.shippingAddress && (
                  <span className="text-sm text-yellow-700">
                    Shipping address required to create label
                  </span>
                )}

                {order.trackingNumber && (
                  <button
                    onClick={() => void updateStatus('SHIPPED')}
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
        )}
      </div>
    </div>
  )
}
