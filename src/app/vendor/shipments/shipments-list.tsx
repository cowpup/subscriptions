'use client'

import { useState } from 'react'
import { ShipmentCard } from './shipment-card'
import { BulkActions } from './bulk-actions'

interface ProductShippingProfile {
  id: string
  name: string
  weightOz: number
  lengthIn: number
  widthIn: number
  heightIn: number
  defaultCarrier: string | null
  defaultServiceToken: string | null
}

interface OrderItem {
  id: string
  quantity: number
  priceInCents: number
  product: {
    name: string
    images: string[]
    shippingProfileId: string | null
    shippingProfile: ProductShippingProfile | null
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

interface Order {
  id: string
  status: string
  totalInCents: number
  createdAt: string | Date
  notes: string | null
  isPreOrder: boolean
  preOrderShipDate: string | Date | null
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

interface ShippingProfile {
  id: string
  name: string
  weightOz: number
  lengthIn: number
  widthIn: number
  heightIn: number
  isDefault: boolean
  defaultCarrier: string | null
  defaultServiceToken: string | null
}

interface ShipmentsListProps {
  orders: Order[]
  shippingProfiles: ShippingProfile[]
  tab: string
}

export function ShipmentsList({ orders, shippingProfiles, tab }: ShipmentsListProps) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])

  // Only show bulk selection for awaiting tab
  const showBulkSelection = tab === 'awaiting'

  // Filter eligible orders (have shipping address, no tracking yet)
  const eligibleOrders = orders.filter(
    (o) => o.shippingAddress && !o.trackingNumber
  )

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    )
  }

  const toggleAll = () => {
    if (selectedOrderIds.length === eligibleOrders.length) {
      setSelectedOrderIds([])
    } else {
      setSelectedOrderIds(eligibleOrders.map((o) => o.id))
    }
  }

  const clearSelection = () => {
    setSelectedOrderIds([])
  }

  const isSelected = (orderId: string) => selectedOrderIds.includes(orderId)
  const isEligible = (order: Order) => order.shippingAddress && !order.trackingNumber

  return (
    <div>
      {/* Bulk actions bar */}
      {showBulkSelection && (
        <BulkActions
          selectedOrderIds={selectedOrderIds}
          shippingProfiles={shippingProfiles}
          onClearSelection={clearSelection}
        />
      )}

      {/* Select all checkbox */}
      {showBulkSelection && eligibleOrders.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="select-all"
            checked={selectedOrderIds.length === eligibleOrders.length && eligibleOrders.length > 0}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="select-all" className="text-sm text-gray-600">
            Select all eligible orders ({eligibleOrders.length})
          </label>
        </div>
      )}

      {/* Orders list */}
      <div className="mt-4 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="flex gap-3">
            {/* Checkbox */}
            {showBulkSelection && (
              <div className="flex items-start pt-5">
                <input
                  type="checkbox"
                  checked={isSelected(order.id)}
                  onChange={() => toggleOrder(order.id)}
                  disabled={!isEligible(order)}
                  className="h-4 w-4 rounded border-gray-300 disabled:opacity-50"
                  title={
                    !isEligible(order)
                      ? order.trackingNumber
                        ? 'Already has label'
                        : 'No shipping address'
                      : 'Select for bulk actions'
                  }
                />
              </div>
            )}

            {/* Order card */}
            <div className="flex-1">
              <ShipmentCard order={order} shippingProfiles={shippingProfiles} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
