'use client'

import { useState } from 'react'

interface SubscribeButtonProps {
  tierId: string
}

interface CheckoutResponse {
  url?: string
  error?: string
}

export function SubscribeButton({ tierId }: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubscribe = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId }),
      })

      const data = (await response.json()) as CheckoutResponse

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
  }

  return (
    <div>
      <button
        onClick={() => void handleSubscribe()}
        disabled={isLoading}
        className="w-full rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : 'Subscribe'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
