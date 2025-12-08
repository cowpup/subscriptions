import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import { getActiveSubscriptions } from '@/lib/subscription'
import { formatAmountForDisplay } from '@/lib/stripe'

interface PageProps {
  searchParams: Promise<{ success?: string }>
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  const { success } = await searchParams

  if (!user) {
    redirect('/sign-in')
  }

  const subscriptions = await getActiveSubscriptions(user.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              SubscribeX
            </Link>
            <nav className="hidden items-center gap-4 text-sm md:flex">
              <Link href="/dashboard" className="text-gray-600 hover:text-black">
                Dashboard
              </Link>
              <Link href="/dashboard/subscriptions" className="font-medium text-black">
                My Subscriptions
              </Link>
            </nav>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">My Subscriptions</h1>

        {success && (
          <div className="mt-4 rounded-md bg-green-50 p-4 text-sm text-green-800">
            Your subscription was successful! You now have access to exclusive content.
          </div>
        )}

        {subscriptions.length === 0 ? (
          <div className="mt-8 rounded-lg border bg-white p-8 text-center">
            <p className="text-gray-600">You don&apos;t have any active subscriptions.</p>
            <p className="mt-2 text-sm text-gray-500">
              Browse creators and subscribe to access their exclusive content.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
            >
              Explore Creators
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="rounded-lg border bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {subscription.tier.vendor.logoUrl ? (
                      <Image
                        src={subscription.tier.vendor.logoUrl}
                        alt={subscription.tier.vendor.storeName}
                        width={48}
                        height={48}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-bold text-gray-600">
                        {subscription.tier.vendor.storeName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <Link
                        href={`/${subscription.tier.vendor.slug}`}
                        className="font-semibold hover:underline"
                      >
                        {subscription.tier.vendor.storeName}
                      </Link>
                      <p className="text-sm text-gray-600">{subscription.tier.name}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">
                      {formatAmountForDisplay(subscription.tier.priceInCents)}
                      <span className="text-sm font-normal text-gray-500">/mo</span>
                    </p>
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs ${
                        subscription.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : subscription.status === 'CANCELLED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {subscription.status === 'CANCELLED' ? 'Cancelled' : subscription.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t pt-4 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Access until:</span>
                    <span className="font-medium">
                      {subscription.accessExpiresAt?.toLocaleDateString() ?? 'N/A'}
                    </span>
                  </div>
                  {subscription.cancelledAt && (
                    <div className="mt-1 flex justify-between text-yellow-700">
                      <span>Cancelled on:</span>
                      <span>{subscription.cancelledAt.toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/${subscription.tier.vendor.slug}`}
                    className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
                  >
                    View Content
                  </Link>
                  {subscription.status === 'ACTIVE' && (
                    <button className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Manage Subscription
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
