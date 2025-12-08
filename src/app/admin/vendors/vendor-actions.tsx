'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ApiResponse {
  error?: string
}

export function VendorActions({ vendorId }: { vendorId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const handleApprove = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/vendors/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId }),
      })

      if (!response.ok) {
        const data = (await response.json()) as ApiResponse
        alert(data.error ?? 'Failed to approve vendor')
        return
      }

      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }, [vendorId, router])

  const handleReject = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/vendors/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, reason: rejectionReason || undefined }),
      })

      if (!response.ok) {
        const data = (await response.json()) as ApiResponse
        alert(data.error ?? 'Failed to reject vendor')
        return
      }

      setShowRejectModal(false)
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }, [vendorId, rejectionReason, router])

  return (
    <>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => {
            void handleApprove()
          }}
          disabled={isLoading}
          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={isLoading}
          className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
        >
          Reject
        </button>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Reject Application</h2>
            <p className="mt-2 text-sm text-gray-600">
              Optionally provide a reason for rejection. This will be shown to the applicant.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="mt-4 w-full rounded-md border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handleReject()
                }}
                disabled={isLoading}
                className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Rejecting...' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
