'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'

interface Address {
  id: string
  name: string
  label: string
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  isDefault: boolean
}

interface PurchaseButtonProps {
  productId: string
  vendorSlug: string
}

interface ApiResponse {
  url?: string
  error?: string
}

interface AddressesResponse {
  addresses?: Address[]
  error?: string
}

export function PurchaseButton({ productId, vendorSlug }: PurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [error, setError] = useState('')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')

  useEffect(() => {
    async function fetchAddresses() {
      try {
        const response = await fetch('/api/user/addresses')
        const data = (await response.json()) as AddressesResponse

        if (response.ok && data.addresses) {
          setAddresses(data.addresses)
          // Auto-select default address
          const defaultAddress = data.addresses.find((a) => a.isDefault)
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id)
          } else if (data.addresses.length > 0) {
            setSelectedAddressId(data.addresses[0].id)
          }
        }
      } catch {
        // Silent fail - addresses will be empty
      }
      setIsLoadingAddresses(false)
    }

    void fetchAddresses()
  }, [])

  const handlePurchase = useCallback(async () => {
    if (!selectedAddressId) {
      setError('Please select a shipping address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/products/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          vendorSlug,
          addressId: selectedAddressId,
        }),
      })

      const data = (await response.json()) as ApiResponse

      if (!response.ok) {
        setError(data.error ?? 'Something went wrong')
        setIsLoading(false)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }, [productId, vendorSlug, selectedAddressId])

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId)

  if (isLoadingAddresses) {
    return (
      <div className="animate-pulse">
        <div className="h-10 rounded-md bg-gray-200" />
        <div className="mt-4 h-12 rounded-md bg-gray-200" />
      </div>
    )
  }

  if (addresses.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          You need to add a shipping address before purchasing.
        </p>
        <Link
          href="/dashboard/addresses"
          className="mt-2 inline-block text-sm font-medium text-yellow-900 underline hover:no-underline"
        >
          Add a shipping address
        </Link>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4">
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          Ship to
        </label>
        <select
          id="address"
          value={selectedAddressId}
          onChange={(e) => setSelectedAddressId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        >
          {addresses.map((address) => (
            <option key={address.id} value={address.id}>
              {address.label}: {address.line1}, {address.city}, {address.state}
            </option>
          ))}
        </select>

        {selectedAddress && (
          <div className="mt-2 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            <p className="font-medium">{selectedAddress.name}</p>
            <p>{selectedAddress.line1}</p>
            {selectedAddress.line2 && <p>{selectedAddress.line2}</p>}
            <p>
              {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postalCode}
            </p>
          </div>
        )}

        <Link
          href="/dashboard/addresses"
          className="mt-2 inline-block text-xs text-gray-500 hover:text-black"
        >
          Manage addresses
        </Link>
      </div>

      <button
        onClick={() => {
          void handlePurchase()
        }}
        disabled={isLoading || !selectedAddressId}
        className="w-full rounded-md bg-black px-6 py-3 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : 'Buy Now'}
      </button>
    </div>
  )
}
