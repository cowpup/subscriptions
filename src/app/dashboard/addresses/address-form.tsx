'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ApiResponse {
  error?: string
  address?: unknown
}

export function AddressForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [label, setLabel] = useState('Home')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('US')
  const [isDefault, setIsDefault] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setSuccess(false)
      setIsSubmitting(true)

      try {
        const response = await fetch('/api/user/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            label: label.trim(),
            line1: line1.trim(),
            line2: line2.trim() || null,
            city: city.trim(),
            state: state.trim(),
            postalCode: postalCode.trim(),
            country,
            isDefault,
          }),
        })

        const data = (await response.json()) as ApiResponse

        if (!response.ok) {
          setError(data.error ?? 'Something went wrong')
          setIsSubmitting(false)
          return
        }

        setSuccess(true)
        setIsSubmitting(false)
        // Reset form
        setName('')
        setLabel('Home')
        setLine1('')
        setLine2('')
        setCity('')
        setState('')
        setPostalCode('')
        setCountry('US')
        setIsDefault(false)
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
        setIsSubmitting(false)
      }
    },
    [name, label, line1, line2, city, state, postalCode, country, isDefault, router]
  )

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e)
      }}
      className="mt-4 space-y-4"
    >
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Address added successfully!
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div>
          <label htmlFor="label" className="block text-sm font-medium text-gray-700">
            Label *
          </label>
          <select
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="Home">Home</option>
            <option value="Work">Work</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="line1" className="block text-sm font-medium text-gray-700">
          Street Address *
        </label>
        <input
          type="text"
          id="line1"
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          placeholder="123 Main St"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      <div>
        <label htmlFor="line2" className="block text-sm font-medium text-gray-700">
          Apartment, suite, etc.
        </label>
        <input
          type="text"
          id="line2"
          value={line2}
          onChange={(e) => setLine2(e.target.value)}
          placeholder="Apt 4B"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            City *
          </label>
          <input
            type="text"
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="San Francisco"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            State *
          </label>
          <input
            type="text"
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="CA"
            maxLength={2}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
            ZIP Code *
          </label>
          <input
            type="text"
            id="postalCode"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="94102"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700">
          Country *
        </label>
        <select
          id="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <span className="text-sm text-gray-700">Set as default address</span>
        </label>
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting || !name.trim() || !line1.trim() || !city.trim() || !state.trim() || !postalCode.trim()}
          className="w-full rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : 'Add Address'}
        </button>
      </div>
    </form>
  )
}
