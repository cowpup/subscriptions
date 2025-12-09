'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface Tier {
  id: string
  name: string
}

interface SubscriberFiltersProps {
  tiers: Tier[]
  currentSort: string
  currentOrder: string
  currentTier: string
  currentStatus: string
  currentSearch: string
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
]

const sortOptions = [
  { value: 'date', label: 'Subscribe Date' },
  { value: 'tier', label: 'Tier Level' },
  { value: 'expiry', label: 'Expiry Date' },
  { value: 'name', label: 'Name' },
]

export function SubscriberFilters({
  tiers,
  currentSort,
  currentOrder,
  currentTier,
  currentStatus,
  currentSearch,
}: SubscriberFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`/vendor/subscribers?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      const search = formData.get('search') as string
      updateParams('search', search)
    },
    [updateParams]
  )

  return (
    <div className="flex flex-wrap items-center gap-4">
      <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
        <input
          type="text"
          name="search"
          placeholder="Search by name or email..."
          defaultValue={currentSearch}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
      </form>

      <select
        value={currentTier}
        onChange={(e) => updateParams('tier', e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
      >
        <option value="">All Tiers</option>
        {tiers.map((tier) => (
          <option key={tier.id} value={tier.id}>
            {tier.name}
          </option>
        ))}
      </select>

      <select
        value={currentStatus}
        onChange={(e) => updateParams('status', e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Sort by:</span>
        <select
          value={currentSort}
          onChange={(e) => updateParams('sort', e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => updateParams('order', currentOrder === 'asc' ? 'desc' : 'asc')}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          title={currentOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          {currentOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  )
}
