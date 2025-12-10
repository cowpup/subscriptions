import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NotificationSettings } from './notification-settings'

export default async function NotificationsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Get or create notification preferences
  let preferences = await prisma.notificationPreference.findUnique({
    where: { userId: user.id },
  })

  if (!preferences) {
    preferences = await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        emailDrops: true,
        emailGiveaways: true,
        pushDrops: true,
        pushGiveaways: true,
      },
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notification Preferences</h1>
            <p className="mt-1 text-gray-600">Choose how you want to be notified</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-black"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="mt-8">
          <NotificationSettings
            initialPreferences={{
              emailDrops: preferences.emailDrops,
              emailGiveaways: preferences.emailGiveaways,
              pushDrops: preferences.pushDrops,
              pushGiveaways: preferences.pushGiveaways,
            }}
          />
        </div>
      </main>
    </div>
  )
}
