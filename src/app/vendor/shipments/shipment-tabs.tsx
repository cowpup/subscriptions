'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface ShipmentTabsProps {
  currentTab: string
  awaitingCount: number
  shippedCount: number
  currentSort: string
  currentOrder: string
  currentSearch: string
}

const sortOptions = [
  { value: 'date', label: 'Date' },
  { value: 'total', label: 'Order Total' },
  { value: 'customer', label: 'Customer Name' },
]

export function ShipmentTabs({
  currentTab,
  awaitingCount,
  shippedCount,
  currentSort,
  currentOrder,
  currentSearch,
}: ShipmentTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })
      router.push(`/vendor/shipments?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      const search = formData.get('search') as string
      updateParams({ search })
    },
    [updateParams]
  )

  return (
    <div className="mt-6">
      {/* Tab Buttons */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => updateParams({ tab: 'awaiting' })}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            currentTab === 'awaiting'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-black'
          }`}
        >
          Awaiting Shipment
          {awaitingCount > 0 && (
            <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
              {awaitingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => updateParams({ tab: 'shipped' })}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            currentTab === 'shipped'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-black'
          }`}
        >
          Shipped
          {shippedCount > 0 && (
            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
              {shippedCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <input
            type="text"
            name="search"
            placeholder="Search by order # or customer..."
            defaultValue={currentSearch}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </form>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={currentSort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => updateParams({ order: currentOrder === 'asc' ? 'desc' : 'asc' })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            title={currentOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {currentOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
    </div>
  )
}
