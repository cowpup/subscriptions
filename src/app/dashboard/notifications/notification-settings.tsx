'use client'

import { useState } from 'react'

interface NotificationPreferences {
  emailDrops: boolean
  emailGiveaways: boolean
  pushDrops: boolean
  pushGiveaways: boolean
}

interface NotificationSettingsProps {
  initialPreferences: NotificationPreferences
}

export function NotificationSettings({ initialPreferences }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    const oldPreferences = { ...preferences }
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    setSaving(true)
    setSaveStatus('idle')

    fetch('/api/user/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to update')
        }
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 2000)
      })
      .catch(() => {
        // Revert on error
        setPreferences(oldPreferences)
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      })
      .finally(() => {
        setSaving(false)
      })
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Email Notifications</h2>
        <p className="mt-1 text-sm text-gray-500">
          Receive emails about important updates from your subscriptions
        </p>

        <div className="mt-4 space-y-4">
          <ToggleRow
            label="Product Drops"
            description="Get notified when subscribed vendors release new products"
            checked={preferences.emailDrops}
            onChange={(checked) => updatePreference('emailDrops', checked)}
            disabled={saving}
          />
          <ToggleRow
            label="Giveaways"
            description="Get notified about giveaways from your subscribed vendors"
            checked={preferences.emailGiveaways}
            onChange={(checked) => updatePreference('emailGiveaways', checked)}
            disabled={saving}
          />
        </div>
      </div>

      {/* Push Notifications */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Push Notifications</h2>
        <p className="mt-1 text-sm text-gray-500">
          Receive browser notifications for time-sensitive updates
        </p>

        <div className="mt-4 space-y-4">
          <ToggleRow
            label="Product Drops"
            description="Get instant alerts when new products drop"
            checked={preferences.pushDrops}
            onChange={(checked) => updatePreference('pushDrops', checked)}
            disabled={saving}
          />
          <ToggleRow
            label="Giveaways"
            description="Get instant alerts when giveaways are announced"
            checked={preferences.pushGiveaways}
            onChange={(checked) => updatePreference('pushGiveaways', checked)}
            disabled={saving}
          />
        </div>
      </div>

      {/* Save Status */}
      {saveStatus === 'success' && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Preferences saved
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Failed to save preferences. Please try again.
        </div>
      )}
    </div>
  )
}

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-black' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
