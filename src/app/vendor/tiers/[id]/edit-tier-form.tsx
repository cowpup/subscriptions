'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface TierData {
  id: string
  name: string
  description: string | null
  priceInCents: number
  benefits: string[]
  isActive: boolean
}

interface EditTierFormProps {
  tier: TierData
  hasSubscribers: boolean
}

interface ApiResponse {
  error?: string
  tier?: unknown
}

export function EditTierForm({ tier, hasSubscribers }: EditTierFormProps) {
  const router = useRouter()
  const [name, setName] = useState(tier.name)
  const [description, setDescription] = useState(tier.description ?? '')
  const [price, setPrice] = useState((tier.priceInCents / 100).toFixed(2))
  const [benefits, setBenefits] = useState<string[]>(
    tier.benefits.length > 0 ? tier.benefits : ['']
  )
  const [isActive, setIsActive] = useState(tier.isActive)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const addBenefit = () => {
    setBenefits([...benefits, ''])
  }

  const updateBenefit = (index: number, value: string) => {
    const updated = [...benefits]
    updated[index] = value
    setBenefits(updated)
  }

  const removeBenefit = (index: number) => {
    if (benefits.length > 1) {
      setBenefits(benefits.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setIsSubmitting(true)

      const priceInCents = Math.round(parseFloat(price) * 100)

      if (isNaN(priceInCents) || priceInCents < 100) {
        setError('Price must be at least $1.00')
        setIsSubmitting(false)
        return
      }

      const filteredBenefits = benefits.filter((b) => b.trim().length > 0)

      try {
        const response = await fetch(`/api/vendor/tiers/${tier.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            priceInCents,
            benefits: filteredBenefits,
            isActive,
          }),
        })

        const data = (await response.json()) as ApiResponse

        if (!response.ok) {
          setError(data.error ?? 'Something went wrong')
          setIsSubmitting(false)
          return
        }

        router.push('/vendor/tiers')
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
        setIsSubmitting(false)
      }
    },
    [name, description, price, benefits, isActive, tier.id, router]
  )

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e)
      }}
      className="mt-8 space-y-6"
    >
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {hasSubscribers && (
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
          This tier has active subscribers. Price changes will only apply to new subscribers.
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Tier Name *
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Basic, Pro, VIP"
          maxLength={50}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
          Monthly Price (USD) *
        </label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="9.99"
            min="1"
            step="0.01"
            required
            disabled={hasSubscribers}
            className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
        {hasSubscribers ? (
          <p className="mt-1 text-xs text-yellow-600">
            Price cannot be changed while there are active subscribers
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">Minimum $1.00</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What subscribers get at this tier..."
          rows={3}
          maxLength={500}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Benefits</label>
        <p className="text-xs text-gray-500">List what&apos;s included in this tier</p>
        <div className="mt-2 space-y-2">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={benefit}
                onChange={(e) => updateBenefit(index, e.target.value)}
                placeholder={`Benefit ${index + 1}`}
                maxLength={100}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
              {benefits.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBenefit(index)}
                  className="rounded-md px-2 text-gray-400 hover:text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addBenefit}
          className="mt-2 text-sm text-gray-600 hover:text-black"
        >
          + Add another benefit
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
        />
        <label htmlFor="isActive" className="text-sm text-gray-700">
          Tier is active and visible to subscribers
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="flex-1 rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/vendor/tiers')}
          className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
