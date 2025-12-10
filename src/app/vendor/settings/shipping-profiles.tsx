'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ShippingProfile {
  id: string
  name: string
  weightOz: number
  lengthIn: number
  widthIn: number
  heightIn: number
  isDefault: boolean
}

interface ShippingProfilesProps {
  profiles: ShippingProfile[]
}

export function ShippingProfiles({ profiles: initialProfiles }: ShippingProfilesProps) {
  const router = useRouter()
  const [profiles, setProfiles] = useState(initialProfiles)
  const [isAdding, setIsAdding] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // New profile form
  const [name, setName] = useState('')
  const [weightOz, setWeightOz] = useState('')
  const [lengthIn, setLengthIn] = useState('')
  const [widthIn, setWidthIn] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  const resetForm = () => {
    setName('')
    setWeightOz('')
    setLengthIn('')
    setWidthIn('')
    setHeightIn('')
    setIsDefault(false)
    setIsAdding(false)
    setError('')
  }

  const handleAdd = useCallback(async () => {
    if (!name || !weightOz || !lengthIn || !widthIn || !heightIn) {
      setError('All fields are required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/vendor/shipping-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          weightOz: parseFloat(weightOz),
          lengthIn: parseFloat(lengthIn),
          widthIn: parseFloat(widthIn),
          heightIn: parseFloat(heightIn),
          isDefault,
        }),
      })

      const data = (await response.json()) as { error?: string; profile?: ShippingProfile }

      if (!response.ok) {
        setError(data.error ?? 'Failed to add profile')
        setIsSubmitting(false)
        return
      }

      if (data.profile) {
        // Update local state
        if (data.profile.isDefault) {
          setProfiles((prev) =>
            [...prev.map((p) => ({ ...p, isDefault: false })), data.profile!]
          )
        } else {
          setProfiles((prev) => [...prev, data.profile!])
        }
      }

      resetForm()
      router.refresh()
    } catch {
      setError('Failed to add profile')
    }

    setIsSubmitting(false)
  }, [name, weightOz, lengthIn, widthIn, heightIn, isDefault, router])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Delete this shipping profile?')) {
        return
      }

      try {
        const response = await fetch(`/api/vendor/shipping-profiles/${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          setProfiles((prev) => prev.filter((p) => p.id !== id))
          router.refresh()
        }
      } catch {
        setError('Failed to delete profile')
      }
    },
    [router]
  )

  const handleSetDefault = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/vendor/shipping-profiles/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isDefault: true }),
        })

        if (response.ok) {
          setProfiles((prev) =>
            prev.map((p) => ({ ...p, isDefault: p.id === id }))
          )
          router.refresh()
        }
      } catch {
        setError('Failed to set default')
      }
    },
    [router]
  )

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Shipping Profiles</h2>
          <p className="text-sm text-gray-600">
            Save commonly used package dimensions for faster label creation
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Add Profile
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Add Profile Form */}
      {isAdding && (
        <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-medium">New Shipping Profile</h3>
          <div className="mt-3 grid gap-3">
            <div>
              <label className="block text-xs text-gray-600">Profile Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Small Box, Large Envelope"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs text-gray-600">Weight (oz) *</label>
                <input
                  type="number"
                  value={weightOz}
                  onChange={(e) => setWeightOz(e.target.value)}
                  placeholder="16"
                  min="0.1"
                  step="0.1"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Length (in) *</label>
                <input
                  type="number"
                  value={lengthIn}
                  onChange={(e) => setLengthIn(e.target.value)}
                  placeholder="10"
                  min="0.1"
                  step="0.1"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Width (in) *</label>
                <input
                  type="number"
                  value={widthIn}
                  onChange={(e) => setWidthIn(e.target.value)}
                  placeholder="8"
                  min="0.1"
                  step="0.1"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Height (in) *</label>
                <input
                  type="number"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  placeholder="4"
                  min="0.1"
                  step="0.1"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Set as default profile</span>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => void handleAdd()}
              disabled={isSubmitting}
              className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Profile'}
            </button>
            <button
              onClick={resetForm}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing Profiles */}
      {profiles.length > 0 ? (
        <div className="mt-4 space-y-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between rounded-md border bg-white p-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{profile.name}</span>
                  {profile.isDefault && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {profile.weightOz}oz • {profile.lengthIn}&quot; × {profile.widthIn}&quot; × {profile.heightIn}&quot;
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!profile.isDefault && (
                  <button
                    onClick={() => void handleSetDefault(profile.id)}
                    className="text-sm text-gray-600 hover:text-black"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => void handleDelete(profile.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !isAdding && (
          <p className="mt-4 text-sm text-gray-500">
            No shipping profiles yet. Add one to speed up label creation.
          </p>
        )
      )}
    </div>
  )
}
