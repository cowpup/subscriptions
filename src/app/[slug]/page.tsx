import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { formatAmountForDisplay } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'
import { getSubscriptionForVendor } from '@/lib/subscription'
import { SubscribeButton } from './subscribe-button'
import { ChangeTierButton } from './change-tier-button'
import { VendorAvatarWithBadge } from '@/components/ui/vendor-badge'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ canceled?: string; success?: string; upgraded?: string }>
}

export default async function VendorStorefrontPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { canceled, upgraded } = await searchParams

  const vendor = await prisma.vendor.findUnique({
    where: { slug },
    include: {
      user: {
        select: { name: true, avatarUrl: true },
      },
      tiers: {
        where: { isActive: true },
        orderBy: { priceInCents: 'asc' },
      },
      products: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        include: {
          tierAccess: true,
        },
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

  // Find current tier and higher tiers for upgrade prompts
  const currentTierIndex = vendor.tiers.findIndex(
    (t) => t.id === existingSubscription?.tierId
  )
  const higherTiers = currentTierIndex >= 0 ? vendor.tiers.slice(currentTierIndex + 1) : []

  // Products the user can access
  const accessibleProducts = vendor.products.filter((product) => {
    if (product.tierAccess.length === 0) {
      return true
    }
    return product.tierAccess.some((ta) => ta.tierId === existingSubscription?.tierId)
  })

  // Products that require a higher tier
  const lockedProducts = vendor.products.filter((product) => {
    if (product.tierAccess.length === 0) {
      return false
    }
    return !product.tierAccess.some((ta) => ta.tierId === existingSubscription?.tierId)
  })

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

      <main className="mx-auto max-w-5xl px-4 py-8">
        {canceled && (
          <div className="mb-6 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
            Checkout was canceled. You can try again when you&apos;re ready.
          </div>
        )}

        {upgraded && (
          <div className="mb-6 rounded-md bg-green-50 p-4 text-sm text-green-800">
            Your subscription has been upgraded successfully!
          </div>
        )}

        {/* Compact Vendor Header */}
        <div className="flex items-center justify-between rounded-lg border bg-white p-4">
          <div className="flex items-center gap-3">
            <VendorAvatarWithBadge
              avatarUrl={vendor.logoUrl}
              name={vendor.storeName}
              size="md"
              showBadge={true}
            />
            <div>
              <h1 className="text-xl font-bold">{vendor.storeName}</h1>
              {vendor.description && (
                <p className="text-sm text-gray-600 line-clamp-1 max-w-md">
                  {vendor.description}
                </p>
              )}
            </div>
          </div>

          {hasActiveSubscription && (
            <div className="text-right">
              <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                {existingSubscription?.tier.name}
              </span>
            </div>
          )}
        </div>

        {/* Products Section - Shows first for subscribers */}
        {hasActiveSubscription && vendor.products.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold">Products</h2>

            {accessibleProducts.length > 0 && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {accessibleProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/${vendor.slug}/products/${product.id}`}
                    className="group rounded-lg border bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {product.images.length > 0 ? (
                      <div className="relative h-40 w-full bg-gray-100">
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center bg-gray-100">
                        <span className="text-3xl text-gray-400">📦</span>
                      </div>
                    )}

                    <div className="p-3">
                      <h3 className="font-semibold text-sm">{product.name}</h3>
                      <p className="mt-1 text-lg font-bold">
                        {formatAmountForDisplay(product.priceInCents)}
                      </p>
                      <div className="mt-1 text-xs text-gray-500">
                        {product.stockQuantity > 0 ? (
                          `${product.stockQuantity} left`
                        ) : product.isLimited ? (
                          <span className="text-red-600">Out of stock</span>
                        ) : (
                          'In stock'
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Locked Products - Upgrade Upsell */}
            {lockedProducts.length > 0 && higherTiers.length > 0 && (
              <div className="mt-8">
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <div>
                      <h3 className="font-semibold">
                        {lockedProducts.length} more {lockedProducts.length === 1 ? 'product' : 'products'} available
                      </h3>
                      <p className="text-sm text-gray-600">
                        Upgrade to {higherTiers[0].name} to unlock exclusive items
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {lockedProducts.slice(0, 4).map((product) => (
                      <div
                        key={product.id}
                        className="relative h-16 w-16 rounded-lg overflow-hidden opacity-50"
                      >
                        {product.images.length > 0 ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover blur-sm"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-200">
                            <span className="text-gray-400">📦</span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <span className="text-white text-lg">🔒</span>
                        </div>
                      </div>
                    ))}
                    {lockedProducts.length > 4 && (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-200 text-sm text-gray-600">
                        +{lockedProducts.length - 4}
                      </div>
                    )}
                  </div>

                  <a
                    href="#tiers"
                    className="mt-4 inline-block rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
                  >
                    View Upgrade Options
                  </a>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Non-subscribers see a teaser */}
        {!hasActiveSubscription && vendor.products.length > 0 && (
          <section className="mt-8">
            <div className="rounded-lg border bg-white p-8 text-center">
              <span className="text-4xl">🔒</span>
              <h2 className="mt-4 text-xl font-bold">
                {vendor.products.length} Exclusive {vendor.products.length === 1 ? 'Product' : 'Products'}
              </h2>
              <p className="mt-2 text-gray-600">
                Subscribe to unlock access to exclusive items from {vendor.storeName}
              </p>
              <a
                href="#tiers"
                className="mt-4 inline-block rounded-md bg-black px-6 py-2 text-white hover:bg-gray-800"
              >
                View Plans
              </a>
            </div>
          </section>
        )}

        {/* Subscription Tiers */}
        <section id="tiers" className="mt-10 scroll-mt-8">
          <h2 className="text-xl font-bold">
            {hasActiveSubscription ? 'Subscription Plans' : 'Subscribe'}
          </h2>

          {vendor.tiers.length === 0 ? (
            <div className="mt-4 rounded-lg border bg-white p-8 text-center">
              <p className="text-gray-600">
                This creator hasn&apos;t set up any subscription tiers yet.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vendor.tiers.map((tier, index) => {
                const isCurrentTier = existingSubscription?.tierId === tier.id
                const isUpgrade = hasActiveSubscription && index > currentTierIndex
                const isDowngrade = hasActiveSubscription && !isCurrentTier && index < currentTierIndex
                const daysRemaining = existingSubscription?.accessExpiresAt
                  ? Math.max(0, Math.ceil((existingSubscription.accessExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : 0

                return (
                  <div
                    key={tier.id}
                    className={`flex flex-col rounded-lg border bg-white p-5 shadow-sm ${
                      isCurrentTier ? 'ring-2 ring-black' : ''
                    } ${isUpgrade ? 'border-green-200 bg-green-50/30' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{tier.name}</h3>
                      {isCurrentTier && (
                        <span className="rounded-full bg-black px-2 py-0.5 text-xs text-white">
                          Current
                        </span>
                      )}
                      {isUpgrade && (
                        <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs text-white">
                          Upgrade
                        </span>
                      )}
                      {isDowngrade && (
                        <span className="rounded-full bg-gray-500 px-2 py-0.5 text-xs text-white">
                          Downgrade
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-2xl font-bold">
                      {formatAmountForDisplay(tier.priceInCents)}
                      <span className="text-sm font-normal text-gray-500">/mo</span>
                    </p>

                    {tier.description && (
                      <p className="mt-2 text-sm text-gray-600">{tier.description}</p>
                    )}

                    {tier.benefits.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm">
                        {tier.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-auto pt-4">
                      <SignedIn>
                        {isCurrentTier ? (
                          <button
                            disabled
                            className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-500"
                          >
                            Current Plan
                          </button>
                        ) : hasActiveSubscription && existingSubscription ? (
                          <ChangeTierButton
                            currentSubscriptionId={existingSubscription.id}
                            newTierId={tier.id}
                            newTierName={tier.name}
                            newTierPrice={formatAmountForDisplay(tier.priceInCents)}
                            isUpgrade={isUpgrade ?? false}
                            daysRemaining={daysRemaining}
                            currentTierName={existingSubscription.tier.name}
                          />
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
        </section>
      </main>
    </div>
  )
}
