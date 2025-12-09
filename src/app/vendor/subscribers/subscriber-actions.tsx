'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SubscriberActionsProps {
  subscriptionId: string
  userId: string
  userName: string
  isActive: boolean
}

export function SubscriberActions({
  subscriptionId,
  userId,
  userName,
  isActive,
}: SubscriberActionsProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reportReason, setReportReason] = useState('')

  const handleCancelSubscription = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/vendor/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
      })

      if (response.ok) {
        router.refresh()
      }
    } catch {
      // Handle error silently
    }

    setIsLoading(false)
    setShowCancelConfirm(false)
    setShowMenu(false)
  }

  const handleReportUser = async () => {
    if (!reportReason.trim()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/vendor/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          reason: reportReason,
        }),
      })

      if (response.ok) {
        setReportReason('')
        setShowReportModal(false)
        setShowMenu(false)
      }
    } catch {
      // Handle error silently
    }

    setIsLoading(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border bg-white py-1 shadow-lg">
            {isActive && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
              >
                Cancel Subscription
              </button>
            )}
            <button
              onClick={() => setShowReportModal(true)}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Report User
            </button>
          </div>
        </>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Cancel Subscription</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to cancel {userName}&apos;s subscription? They will retain access
              until their current billing period ends.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={isLoading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={() => void handleCancelSubscription()}
                disabled={isLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Report User</h3>
            <p className="mt-2 text-sm text-gray-600">
              Report {userName} for abusive behavior. Our team will review your report.
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the issue..."
              rows={4}
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setReportReason('')
                }}
                disabled={isLoading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleReportUser()}
                disabled={isLoading || !reportReason.trim()}
                className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isLoading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
