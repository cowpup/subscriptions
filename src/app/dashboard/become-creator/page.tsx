'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ApiResponse {
  error?: string
  vendor?: unknown
}

export default function BecomeCreatorPage() {
  const router = useRouter()
  const [storeName, setStoreName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Auto-generate slug from store name unless manually edited
  useEffect(() => {
    if (!isSlugManuallyEdited && storeName) {
      const generatedSlug = storeName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50)
      setSlug(generatedSlug)
    }
  }, [storeName, isSlugManuallyEdited])

  const handleSlugChange = (value: string) => {
    setIsSlugManuallyEdited(true)
    // Only allow valid slug characters
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(sanitized)
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setIsSubmitting(true)

      try {
        const response = await fetch('/api/vendor/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeName: storeName.trim(),
            slug: slug.trim(),
            description: description.trim() || undefined,
          }),
        })

        const data = (await response.json()) as ApiResponse

        if (!response.ok) {
          setError(data.error ?? 'Something went wrong')
          setIsSubmitting(false)
          return
        }

        // Redirect to vendor dashboard
        router.push('/vendor')
      } catch {
        setError('Something went wrong. Please try again.')
        setIsSubmitting(false)
      }
    },
    [storeName, slug, description, router]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">
            subr.net
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Become a Creator</h1>
          <p className="mt-2 text-gray-600">
            Set up your storefront and start building your subscriber community.
          </p>

          <form
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
            className="mt-8 space-y-6"
          >
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
                Store Name *
              </label>
              <input
                type="text"
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="My Awesome Store"
                maxLength={50}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
              <p className="mt-1 text-xs text-gray-500">
                This is how your store will appear to subscribers.
              </p>
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                Store URL
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                  subr.net/
                </span>
                <input
                  type="text"
                  id="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="my-store"
                  maxLength={50}
                  required
                  className="block w-full rounded-r-md border border-gray-300 px-3 py-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Lowercase letters, numbers, and hyphens only.
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
              <p className="mt-1 text-xs text-gray-500">Optional. You can add this later.</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !storeName.trim() || !slug.trim()}
              className="w-full rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Store'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
