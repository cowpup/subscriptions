'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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

interface AddressCardProps {
  address: Address
}

export function AddressCard({ address }: AddressCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSettingDefault, setIsSettingDefault] = useState(false)

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/user/addresses/${address.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      }
    } catch {
      // Handle error silently
    }

    setIsDeleting(false)
  }, [address.id, router])

  const handleSetDefault = useCallback(async () => {
    setIsSettingDefault(true)

    try {
      const response = await fetch(`/api/user/addresses/${address.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })

      if (response.ok) {
        router.refresh()
      }
    } catch {
      // Handle error silently
    }

    setIsSettingDefault(false)
  }, [address.id, router])

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{address.name}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {address.label}
            </span>
            {address.isDefault && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Default
              </span>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <p>{address.line1}</p>
            {address.line2 && <p>{address.line2}</p>}
            <p>
              {address.city}, {address.state} {address.postalCode}
            </p>
            <p>{address.country === 'US' ? 'United States' : address.country}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!address.isDefault && (
            <button
              onClick={() => void handleSetDefault()}
              disabled={isSettingDefault}
              className="text-sm text-gray-600 hover:text-black disabled:opacity-50"
            >
              {isSettingDefault ? 'Setting...' : 'Set Default'}
            </button>
          )}
          <button
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
