'use client'

import { useState } from 'react'

interface ChangeTierButtonProps {
  currentSubscriptionId: string
  newTierId: string
  newTierName: string
  newTierPrice: string
  isUpgrade: boolean
  daysRemaining: number
  currentTierName: string
}

interface ChangeTierResponse {
  url?: string
  success?: boolean
  type?: string
  message?: string
  error?: string
}

export function ChangeTierButton({
  currentSubscriptionId,
  newTierId,
  newTierName,
  newTierPrice,
  isUpgrade,
  daysRemaining,
  currentTierName,
}: ChangeTierButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  const handleChangeTier = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/subscriptions/change-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSubscriptionId,
          newTierId,
        }),
      })

      const data = (await response.json()) as ChangeTierResponse

      if (!response.ok) {
        setError(data.error ?? 'Something went wrong')
        setIsLoading(false)
        return
      }

      if (data.url) {
        window.location.href = data.url
      } else if (data.success) {
        window.location.reload()
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="rounded-md border bg-white p-4 shadow-lg">
        <h4 className="font-semibold">
          {isUpgrade ? 'Confirm Upgrade' : 'Confirm Downgrade'}
        </h4>

        {isUpgrade ? (
          <div className="mt-2 text-sm text-gray-600">
            <p>
              By upgrading to <strong>{newTierName}</strong>, you will:
            </p>
            <ul className="mt-2 list-disc pl-4 space-y-1">
              <li>Forfeit the remaining {daysRemaining} days of your current {currentTierName} subscription</li>
              <li>Start a new billing cycle at {newTierPrice}/mo</li>
              <li>Keep any unique benefits from {currentTierName} until your original period expires</li>
            </ul>
          </div>
        ) : (
          <div className="mt-2 text-sm text-gray-600">
            <p>
              By downgrading to <strong>{newTierName}</strong>:
            </p>
            <ul className="mt-2 list-disc pl-4 space-y-1">
              <li>Your current {currentTierName} tier will continue for {daysRemaining} more days</li>
              <li>After that, your subscription will renew at {newTierPrice}/mo</li>
            </ul>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isLoading}
            className="flex-1 rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleChangeTier()}
            disabled={isLoading}
            className={`flex-1 rounded-md px-3 py-2 text-sm text-white disabled:opacity-50 ${
              isUpgrade
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-black hover:bg-gray-800'
            }`}
          >
            {isLoading ? 'Processing...' : isUpgrade ? 'Upgrade Now' : 'Confirm Downgrade'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={`w-full rounded-md px-4 py-2 text-sm text-white ${
        isUpgrade
          ? 'bg-green-600 hover:bg-green-700'
          : 'bg-gray-600 hover:bg-gray-700'
      }`}
    >
      {isUpgrade ? 'Upgrade' : 'Downgrade'}
    </button>
  )
}
