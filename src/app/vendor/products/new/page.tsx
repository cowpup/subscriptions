'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { UploadButton } from '@/lib/uploadthing'

interface Tier {
  id: string
  name: string
  priceInCents: number
}

interface ApiResponse {
  error?: string
  product?: unknown
}

interface TiersResponse {
  tiers?: Tier[]
  error?: string
}

export default function NewProductPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [selectedTiers, setSelectedTiers] = useState<string[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) {
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const response = await fetch('/api/upload/from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim(), type: 'product' }),
      })

      const data = await response.json() as { url?: string; error?: string }

      if (!response.ok) {
        setError(data.error ?? 'Failed to upload image')
        setIsUploading(false)
        return
      }

      if (data.url) {
        setImageUrl(data.url)
        setUrlInput('')
      }
    } catch {
      setError('Failed to upload image from URL')
    }
    setIsUploading(false)
  }

  useEffect(() => {
    async function loadTiers() {
      try {
        const response = await fetch('/api/vendor/tiers')
        const data = (await response.json()) as TiersResponse
        if (data.tiers) {
          setTiers(data.tiers)
        }
      } catch {
        // Tiers will just be empty
      }
    }
    void loadTiers()
  }, [])

  const toggleTier = (tierId: string) => {
    setSelectedTiers((prev) =>
      prev.includes(tierId) ? prev.filter((id) => id !== tierId) : [...prev, tierId]
    )
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setIsSubmitting(true)

      const priceInCents = Math.round(parseFloat(price) * 100)

      if (isNaN(priceInCents) || priceInCents < 0) {
        setError('Please enter a valid price')
        setIsSubmitting(false)
        return
      }

      const stock = stockQuantity ? parseInt(stockQuantity, 10) : null
      if (stockQuantity && (isNaN(stock!) || stock! < 0)) {
        setError('Please enter a valid stock quantity')
        setIsSubmitting(false)
        return
      }

      try {
        const response = await fetch('/api/vendor/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            priceInCents,
            imageUrl: imageUrl.trim() || null,
            stockQuantity: stock,
            tierIds: selectedTiers,
          }),
        })

        const data = (await response.json()) as ApiResponse

        if (!response.ok) {
          setError(data.error ?? 'Something went wrong')
          setIsSubmitting(false)
          return
        }

        router.push('/vendor/products')
      } catch {
        setError('Something went wrong. Please try again.')
        setIsSubmitting(false)
      }
    },
    [name, description, price, imageUrl, stockQuantity, selectedTiers, router]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">
            subr.net
          </Link>
          <Link href="/vendor/products" className="text-sm text-gray-600 hover:text-gray-900">
            Back to Products
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Add Product</h1>
          <p className="mt-2 text-gray-600">
            Create a new product for your subscribers to purchase.
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Product Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Limited Edition T-Shirt"
                maxLength={100}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Price (USD) *
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="29.99"
                  min="0"
                  step="0.01"
                  required
                  className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Set to $0 for free products</p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your product..."
                rows={3}
                maxLength={1000}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Image
              </label>

              {imageUrl ? (
                <div className="mt-2">
                  <div className="relative h-48 w-48 rounded-lg overflow-hidden border">
                    <Image
                      src={imageUrl}
                      alt="Product preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove image
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <UploadButton
                    endpoint="productImage"
                    onUploadBegin={() => setIsUploading(true)}
                    onClientUploadComplete={(res) => {
                      setIsUploading(false)
                      if (res?.[0]?.url) {
                        setImageUrl(res[0].url)
                      }
                    }}
                    onUploadError={(error: Error) => {
                      setIsUploading(false)
                      setError(`Upload failed: ${error.message}`)
                    }}
                    appearance={{
                      button: 'bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 text-sm',
                      allowedContent: 'text-xs text-gray-500',
                    }}
                  />
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">
                      Or paste an image URL (will be uploaded to our servers):
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/product.jpg"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <button
                        type="button"
                        onClick={() => void handleUrlUpload()}
                        disabled={isUploading || !urlInput.trim()}
                        className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      >
                        {isUploading ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="stockQuantity" className="block text-sm font-medium text-gray-700">
                Stock Quantity
              </label>
              <input
                type="number"
                id="stockQuantity"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Leave empty for unlimited"
                min="0"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
              <p className="mt-1 text-xs text-gray-500">Leave empty for unlimited stock</p>
            </div>

            {tiers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tier Access
                </label>
                <p className="text-xs text-gray-500">
                  Select which tiers can purchase this product. Leave empty for all subscribers.
                </p>
                <div className="mt-2 space-y-2">
                  {tiers.map((tier) => (
                    <label key={tier.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTiers.includes(tier.id)}
                        onChange={() => toggleTier(tier.id)}
                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                      />
                      <span className="text-sm">{tier.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isUploading || !name.trim() || !price}
              className="w-full rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : isUploading ? 'Uploading...' : 'Create Product'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
