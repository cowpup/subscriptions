'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Tier {
  id: string
  name: string
  priceInCents: number
}

interface ProductData {
  id: string
  name: string
  description: string | null
  priceInCents: number
  imageUrl: string | null
  stockQuantity: number | null
  isActive: boolean
  tierAccessIds: string[]
  isPreOrder: boolean
  preOrderShipDate: string | null
}

interface EditProductFormProps {
  product: ProductData
  tiers: Tier[]
}

interface ApiResponse {
  error?: string
  product?: unknown
}

export function EditProductForm({ product, tiers }: EditProductFormProps) {
  const router = useRouter()
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description ?? '')
  const [price, setPrice] = useState((product.priceInCents / 100).toFixed(2))
  const [imageUrl, setImageUrl] = useState(product.imageUrl ?? '')
  const [stockQuantity, setStockQuantity] = useState(
    product.stockQuantity?.toString() ?? ''
  )
  const [isActive, setIsActive] = useState(product.isActive)
  const [selectedTiers, setSelectedTiers] = useState<string[]>(product.tierAccessIds)
  const [isPreOrder, setIsPreOrder] = useState(product.isPreOrder)
  const [preOrderShipDate, setPreOrderShipDate] = useState(product.preOrderShipDate ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const toggleTier = (tierId: string) => {
    setSelectedTiers((prev) =>
      prev.includes(tierId) ? prev.filter((id) => id !== tierId) : [...prev, tierId]
    )
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setSuccess(false)
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

      // Validate pre-order date if enabled
      if (isPreOrder && !preOrderShipDate) {
        setError('Please enter a ship date for pre-orders')
        setIsSubmitting(false)
        return
      }

      try {
        const response = await fetch(`/api/vendor/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            priceInCents,
            imageUrl: imageUrl.trim() || null,
            stockQuantity: stock,
            isActive,
            tierIds: selectedTiers,
            isPreOrder,
            preOrderShipDate: isPreOrder && preOrderShipDate ? new Date(preOrderShipDate).toISOString() : null,
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
    [name, description, price, imageUrl, stockQuantity, isActive, selectedTiers, isPreOrder, preOrderShipDate, product.id, router]
  )

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/vendor/products/${product.id}`, {
        method: 'DELETE',
      })

      const data = (await response.json()) as ApiResponse

      if (!response.ok) {
        setError(data.error ?? 'Something went wrong')
        setIsDeleting(false)
        return
      }

      router.push('/vendor/products')
    } catch {
      setError('Something went wrong. Please try again.')
      setIsDeleting(false)
    }
  }, [product.id, router])

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
          Product updated successfully!
        </div>
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
        <p className="mt-1 text-xs text-gray-500">
          Note: Changing the price will create a new Stripe price.
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
          placeholder="Describe your product..."
          rows={3}
          maxLength={1000}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
          Image URL
        </label>
        <input
          type="url"
          id="imageUrl"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/product.jpg"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
        {imageUrl && (
          <div className="mt-2">
            <img
              src={imageUrl}
              alt="Product preview"
              className="h-32 w-32 rounded-md object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
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

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <span className="text-sm font-medium text-gray-700">Active</span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Inactive products won&apos;t be visible to subscribers.
        </p>
      </div>

      {/* Pre-Order Settings */}
      <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPreOrder}
            onChange={(e) => setIsPreOrder(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">Pre-Order Product</span>
        </label>
        <p className="mt-1 text-xs text-gray-600">
          Pre-orders won&apos;t appear in shipments until the ship date has passed.
        </p>

        {isPreOrder && (
          <div className="mt-3">
            <label htmlFor="preOrderShipDate" className="block text-sm font-medium text-gray-700">
              Expected Ship Date
            </label>
            <input
              type="date"
              id="preOrderShipDate"
              value={preOrderShipDate}
              onChange={(e) => setPreOrderShipDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        )}
      </div>

      {tiers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Tier Access</label>
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

      <div className="flex items-center justify-between pt-4 border-t">
        <button
          type="button"
          onClick={() => {
            void handleDelete()
          }}
          disabled={isDeleting}
          className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete Product'}
        </button>

        <div className="flex items-center gap-3">
          <Link
            href="/vendor/products"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !price}
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
