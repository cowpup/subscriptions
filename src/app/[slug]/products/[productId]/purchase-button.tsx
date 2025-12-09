'use client'

import { useState, useCallback } from 'react'

interface PurchaseButtonProps {
  productId: string
  vendorSlug: string
}

interface ApiResponse {
  url?: string
  error?: string
}

export function PurchaseButton({ productId, vendorSlug }: PurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePurchase = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/products/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          vendorSlug,
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
  }, [productId, vendorSlug])

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <button
        onClick={() => {
          void handlePurchase()
        }}
        disabled={isLoading}
        className="w-full rounded-md bg-black px-6 py-3 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : 'Buy Now'}
      </button>
    </div>
  )
}
