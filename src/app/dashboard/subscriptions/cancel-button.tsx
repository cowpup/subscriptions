'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CancelButtonProps {
  subscriptionId: string
  tierName: string
}

interface CancelResponse {
  success?: boolean
  error?: string
}

export function CancelButton({ subscriptionId, tierName }: CancelButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  const handleCancel = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      })

      const data = (await response.json()) as CancelResponse

      if (!response.ok) {
        setError(data.error ?? 'Something went wrong')
        setIsLoading(false)
        return
      }

      router.refresh()
      setShowConfirm(false)
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          Are you sure you want to cancel your <strong>{tierName}</strong> subscription?
        </p>
        <p className="mt-1 text-xs text-red-600">
          You&apos;ll keep access until the end of your current billing period.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => void handleCancel()}
            disabled={isLoading}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isLoading}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Keep Subscription
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
    >
      Cancel Subscription
    </button>
  )
}
