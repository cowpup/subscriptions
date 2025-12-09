'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface VendorData {
  id: string
  storeName: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  accentColor: string | null
}

interface VendorSettingsFormProps {
  vendor: VendorData
}

interface ApiResponse {
  error?: string
  vendor?: unknown
}

export function VendorSettingsForm({ vendor }: VendorSettingsFormProps) {
  const router = useRouter()
  const [storeName, setStoreName] = useState(vendor.storeName)
  const [description, setDescription] = useState(vendor.description ?? '')
  const [logoUrl, setLogoUrl] = useState(vendor.logoUrl ?? '')
  const [bannerUrl, setBannerUrl] = useState(vendor.bannerUrl ?? '')
  const [accentColor, setAccentColor] = useState(vendor.accentColor ?? '#000000')
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
        const response = await fetch('/api/vendor/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeName: storeName.trim(),
            description: description.trim() || null,
            logoUrl: logoUrl.trim() || null,
            bannerUrl: bannerUrl.trim() || null,
            accentColor: accentColor || null,
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
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
        setIsSubmitting(false)
      }
    },
    [storeName, description, logoUrl, bannerUrl, accentColor, router]
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

      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          Settings saved successfully!
        </div>
      )}

      <div className="rounded-lg border bg-white p-6">
        <h2 className="font-semibold">Basic Information</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
              Store Name *
            </label>
            <input
              type="text"
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              maxLength={50}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Store URL</label>
            <p className="mt-1 text-sm text-gray-500">
              subr.net/<span className="font-medium">{vendor.slug}</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Store URL cannot be changed after creation.
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell subscribers what you offer..."
              rows={3}
              maxLength={500}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            <p className="mt-1 text-xs text-gray-500">
              {description.length}/500 characters
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="font-semibold">Branding</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">
              Logo URL
            </label>
            <input
              type="url"
              id="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            <p className="mt-1 text-xs text-gray-500">
              Recommended: Square image, at least 200x200px
            </p>
            {logoUrl && (
              <div className="mt-2">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-16 w-16 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="bannerUrl" className="block text-sm font-medium text-gray-700">
              Banner URL
            </label>
            <input
              type="url"
              id="bannerUrl"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://example.com/banner.png"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            <p className="mt-1 text-xs text-gray-500">
              Recommended: 1200x400px or similar aspect ratio
            </p>
            {bannerUrl && (
              <div className="mt-2">
                <img
                  src={bannerUrl}
                  alt="Banner preview"
                  className="h-24 w-full rounded-md object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="accentColor" className="block text-sm font-medium text-gray-700">
              Accent Color
            </label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                id="accentColor"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded border border-gray-300"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#000000"
                pattern="^#[0-9A-Fa-f]{6}$"
                className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Used for buttons and highlights on your storefront
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !storeName.trim()}
          className="rounded-md bg-black px-6 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
