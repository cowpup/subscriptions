'use client'

import { useState } from 'react'
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

interface ShippingRate {
  objectId: string
  provider: string
  servicelevel: {
    name: string
    token: string
  }
  amount: string
  currency: string
  estimatedDays: number
  durationTerms: string
}

interface OrderRates {
  orderId: string
  success: boolean
  shipmentId?: string
  rates?: ShippingRate[]
  customerName?: string
  error?: string
}

interface BulkActionsProps {
  selectedOrderIds: string[]
  shippingProfiles: ShippingProfile[]
  onClearSelection: () => void
}

export function BulkActions({ selectedOrderIds, shippingProfiles, onClearSelection }: BulkActionsProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [showRatesModal, setShowRatesModal] = useState(false)
  const [orderRates, setOrderRates] = useState<OrderRates[]>([])
  const [selectedRates, setSelectedRates] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  // Package dimensions
  const defaultProfile = shippingProfiles.find((p) => p.isDefault)
  const [selectedProfileId, setSelectedProfileId] = useState<string>(defaultProfile?.id ?? '')
  const [weightOz, setWeightOz] = useState(defaultProfile?.weightOz.toString() ?? '')
  const [lengthIn, setLengthIn] = useState(defaultProfile?.lengthIn.toString() ?? '')
  const [widthIn, setWidthIn] = useState(defaultProfile?.widthIn.toString() ?? '')
  const [heightIn, setHeightIn] = useState(defaultProfile?.heightIn.toString() ?? '')

  const applyProfile = (profileId: string) => {
    const profile = shippingProfiles.find((p) => p.id === profileId)
    if (profile) {
      setWeightOz(profile.weightOz.toString())
      setLengthIn(profile.lengthIn.toString())
      setWidthIn(profile.widthIn.toString())
      setHeightIn(profile.heightIn.toString())
      setSelectedProfileId(profileId)
    }
  }

  const getRates = async () => {
    if (!weightOz || !lengthIn || !widthIn || !heightIn) {
      setError('Please enter all package dimensions')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const response = await fetch('/api/vendor/orders/bulk-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          weightOz: parseFloat(weightOz),
          lengthIn: parseFloat(lengthIn),
          widthIn: parseFloat(widthIn),
          heightIn: parseFloat(heightIn),
        }),
      })

      const data = (await response.json()) as { error?: string; results?: OrderRates[] }

      if (!response.ok) {
        setError(data.error ?? 'Failed to get rates')
        setIsProcessing(false)
        return
      }

      setOrderRates(data.results ?? [])

      // Auto-select cheapest rate for each order
      const autoSelected: Record<string, string> = {}
      for (const result of data.results ?? []) {
        if (result.success && result.rates && result.rates.length > 0) {
          // Sort by price and pick cheapest
          const cheapest = [...result.rates].sort(
            (a, b) => parseFloat(a.amount) - parseFloat(b.amount)
          )[0]
          autoSelected[result.orderId] = cheapest.objectId
        }
      }
      setSelectedRates(autoSelected)

      setShowRatesModal(true)
    } catch {
      setError('Failed to get rates')
    }

    setIsProcessing(false)
  }

  const purchaseLabels = async () => {
    // Verify all successful orders have a rate selected
    const ordersToProcess = orderRates.filter((r) => r.success && selectedRates[r.orderId])

    if (ordersToProcess.length === 0) {
      setError('No rates selected')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const response = await fetch('/api/vendor/orders/bulk-shipping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: ordersToProcess.map((o) => ({
            orderId: o.orderId,
            rateId: selectedRates[o.orderId],
          })),
          weightOz: parseFloat(weightOz),
          lengthIn: parseFloat(lengthIn),
          widthIn: parseFloat(widthIn),
          heightIn: parseFloat(heightIn),
        }),
      })

      const data = (await response.json()) as {
        error?: string
        successCount?: number
        labelUrls?: string[]
      }

      if (!response.ok) {
        setError(data.error ?? 'Failed to purchase labels')
        setIsProcessing(false)
        return
      }

      // Open all label URLs in new tabs
      if (data.labelUrls && data.labelUrls.length > 0) {
        for (const url of data.labelUrls) {
          window.open(url, '_blank')
        }
      }

      setShowRatesModal(false)
      onClearSelection()
      router.refresh()
    } catch {
      setError('Failed to purchase labels')
    }

    setIsProcessing(false)
  }

  const totalCost = orderRates
    .filter((r) => r.success && selectedRates[r.orderId])
    .reduce((sum, r) => {
      const rate = r.rates?.find((rt) => rt.objectId === selectedRates[r.orderId])
      return sum + (rate ? parseFloat(rate.amount) : 0)
    }, 0)

  if (selectedOrderIds.length === 0) {
    return null
  }

  return (
    <>
      {/* Sticky bulk actions bar */}
      <div className="sticky top-0 z-10 mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-900">
              {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Profile selector */}
            {shippingProfiles.length > 0 && (
              <select
                value={selectedProfileId}
                onChange={(e) => applyProfile(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none"
              >
                <option value="">Select profile...</option>
                {shippingProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            )}

            {/* Dimension inputs */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={weightOz}
                onChange={(e) => setWeightOz(e.target.value)}
                placeholder="oz"
                className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <span className="text-xs text-gray-500">oz</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={lengthIn}
                onChange={(e) => setLengthIn(e.target.value)}
                placeholder="L"
                className="w-12 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <span className="text-xs text-gray-500">×</span>
              <input
                type="number"
                value={widthIn}
                onChange={(e) => setWidthIn(e.target.value)}
                placeholder="W"
                className="w-12 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <span className="text-xs text-gray-500">×</span>
              <input
                type="number"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                placeholder="H"
                className="w-12 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <span className="text-xs text-gray-500">in</span>
            </div>

            <button
              onClick={() => void getRates()}
              disabled={isProcessing}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isProcessing ? 'Getting Rates...' : 'Get Bulk Rates'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-2 text-sm text-red-600">{error}</div>
        )}
      </div>

      {/* Rates modal */}
      {showRatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Select Shipping Rates</h2>
              <button
                onClick={() => setShowRatesModal(false)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {orderRates.map((result) => (
                <div key={result.orderId} className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Order #{result.orderId.slice(-8).toUpperCase()} - {result.customerName}
                    </span>
                    {!result.success && (
                      <span className="text-sm text-red-600">{result.error}</span>
                    )}
                  </div>

                  {result.success && result.rates && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {result.rates.map((rate) => (
                        <label
                          key={rate.objectId}
                          className={`flex cursor-pointer items-center justify-between rounded-md border p-2 text-sm ${
                            selectedRates[result.orderId] === rate.objectId
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`rate-${result.orderId}`}
                              value={rate.objectId}
                              checked={selectedRates[result.orderId] === rate.objectId}
                              onChange={() =>
                                setSelectedRates((prev) => ({
                                  ...prev,
                                  [result.orderId]: rate.objectId,
                                }))
                              }
                              className="h-4 w-4"
                            />
                            <div>
                              <p className="font-medium">{rate.provider}</p>
                              <p className="text-xs text-gray-500">{rate.servicelevel.name}</p>
                            </div>
                          </div>
                          <span className="font-bold">${parseFloat(rate.amount).toFixed(2)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="text-lg font-bold">
                Total: ${totalCost.toFixed(2)}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRatesModal(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void purchaseLabels()}
                  disabled={isProcessing || totalCost === 0}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Purchasing...' : `Purchase ${Object.keys(selectedRates).length} Labels`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
