import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { formatAmountForDisplay } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'
import { getSubscriptionForVendor } from '@/lib/subscription'
import { SubscribeButton } from './subscribe-button'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ canceled?: string; success?: string }>
}

export default async function VendorStorefrontPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { canceled } = await searchParams

  const vendor = await prisma.vendor.findUnique({
    where: { slug },
    include: {
      user: {
        select: { name: true, avatarUrl: true },
      },
      tiers: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!vendor || vendor.status !== 'APPROVED' || !vendor.isActive) {
    notFound()
  }

  const user = await getCurrentUser()
  let existingSubscription = null

  if (user) {
    existingSubscription = await getSubscriptionForVendor(user.id, vendor.id)
  }

  const hasActiveSubscription =
    existingSubscription &&
    existingSubscription.accessExpiresAt &&
    existingSubscription.accessExpiresAt > new Date()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">
            subr.net
          </Link>
          <div className="flex items-center gap-4">
            <SignedIn>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-black">
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <Link href="/sign-in" className="text-sm text-gray-600 hover:text-black">
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
              >
                Sign Up
              </Link>
            </SignedOut>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        {canceled && (
          <div className="mb-6 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
            Checkout was canceled. You can try again when you&apos;re ready.
          </div>
        )}

        {/* Vendor Header */}
        <div className="rounded-lg border bg-white p-8">
          <div className="flex items-center gap-4">
            {vendor.logoUrl ? (
              <Image
                src={vendor.logoUrl}
                alt={vendor.storeName}
                width={64}
                height={64}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-2xl font-bold text-gray-600">
                {vendor.storeName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{vendor.storeName}</h1>
              {vendor.user.name && (
                <p className="text-gray-600">by {vendor.user.name}</p>
              )}
            </div>
          </div>

          {vendor.description && (
            <p className="mt-4 text-gray-700">{vendor.description}</p>
          )}

          {hasActiveSubscription && (
            <div className="mt-6 rounded-md bg-green-50 p-4">
              <p className="font-medium text-green-800">
                You&apos;re subscribed to {existingSubscription?.tier.name}
              </p>
              <p className="text-sm text-green-700">
                Access expires on{' '}
                {existingSubscription?.accessExpiresAt?.toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Subscription Tiers */}
        <h2 className="mt-10 text-xl font-bold">Subscription Tiers</h2>

        {vendor.tiers.length === 0 ? (
          <div className="mt-4 rounded-lg border bg-white p-8 text-center">
            <p className="text-gray-600">
              This creator hasn&apos;t set up any subscription tiers yet.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vendor.tiers.map((tier) => {
              const isCurrentTier = existingSubscription?.tierId === tier.id

              return (
                <div
                  key={tier.id}
                  className={`rounded-lg border bg-white p-6 shadow-sm ${
                    isCurrentTier ? 'ring-2 ring-black' : ''
                  }`}
                >
                  {isCurrentTier && (
                    <span className="mb-2 inline-block rounded-full bg-black px-2 py-1 text-xs text-white">
                      Current Plan
                    </span>
                  )}

                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  <p className="mt-1 text-2xl font-bold">
                    {formatAmountForDisplay(tier.priceInCents)}
                    <span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>

                  {tier.description && (
                    <p className="mt-3 text-sm text-gray-600">{tier.description}</p>
                  )}

                  {tier.benefits.length > 0 && (
                    <ul className="mt-4 space-y-2 text-sm">
                      {tier.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-0.5 text-green-600">✓</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-6">
                    <SignedIn>
                      {isCurrentTier ? (
                        <button
                          disabled
                          className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-500"
                        >
                          Current Plan
                        </button>
                      ) : hasActiveSubscription ? (
                        <button
                          disabled
                          className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-500"
                        >
                          Already Subscribed
                        </button>
                      ) : (
                        <SubscribeButton tierId={tier.id} />
                      )}
                    </SignedIn>
                    <SignedOut>
                      <Link
                        href={`/sign-up?redirect_url=/${vendor.slug}`}
                        className="block w-full rounded-md bg-black px-4 py-2 text-center text-sm text-white hover:bg-gray-800"
                      >
                        Sign up to Subscribe
                      </Link>
                    </SignedOut>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
