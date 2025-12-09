import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { formatAmountForDisplay } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'
import { getSubscriptionForVendor } from '@/lib/subscription'
import { PurchaseButton } from './purchase-button'

interface PageProps {
  params: Promise<{ slug: string; productId: string }>
}

export default async function ProductPage({ params }: PageProps) {
  const { slug, productId } = await params

  const vendor = await prisma.vendor.findUnique({
    where: { slug },
    select: {
      id: true,
      storeName: true,
      slug: true,
      status: true,
      isActive: true,
    },
  })

  if (!vendor || vendor.status !== 'APPROVED' || !vendor.isActive) {
    notFound()
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      tierAccess: true,
    },
  })

  if (!product || product.vendorId !== vendor.id || !product.isActive) {
    notFound()
  }

  const user = await getCurrentUser()

  if (!user) {
    redirect(`/sign-in?redirect_url=/${slug}/products/${productId}`)
  }

  const subscription = await getSubscriptionForVendor(user.id, vendor.id)

  const hasActiveSubscription =
    subscription &&
    subscription.accessExpiresAt &&
    subscription.accessExpiresAt > new Date()

  if (!hasActiveSubscription) {
    redirect(`/${slug}`)
  }

  // Check tier access
  const hasTierAccess =
    product.tierAccess.length === 0 ||
    product.tierAccess.some((ta) => ta.tierId === subscription?.tierId)

  if (!hasTierAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-xl font-bold">
              subr.net
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-lg border bg-white p-8 text-center">
            <span className="text-4xl">🔒</span>
            <h1 className="mt-4 text-xl font-bold">Tier Restricted</h1>
            <p className="mt-2 text-gray-600">
              This product is only available to higher tier subscribers.
            </p>
            <Link
              href={`/${slug}`}
              className="mt-6 inline-block rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
            >
              Back to Store
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const isOutOfStock = product.isLimited && product.stockQuantity <= 0

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
            </SignedOut>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-black"
        >
          ← Back to {vendor.storeName}
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {/* Product Image */}
          <div className="rounded-lg border bg-white overflow-hidden">
            {product.images.length > 0 ? (
              <div className="relative aspect-square bg-gray-100">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center bg-gray-100">
                <span className="text-6xl text-gray-400">📦</span>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="mt-2 text-3xl font-bold">
              {formatAmountForDisplay(product.priceInCents)}
            </p>

            {product.description && (
              <p className="mt-4 text-gray-700">{product.description}</p>
            )}

            <div className="mt-4 text-sm text-gray-500">
              {product.isLimited ? (
                product.stockQuantity > 0 ? (
                  <span>
                    {product.stockQuantity === 1
                      ? 'Only 1 left!'
                      : `${product.stockQuantity} available`}
                  </span>
                ) : (
                  <span className="text-red-600">Out of stock</span>
                )
              ) : (
                <span>In stock</span>
              )}
            </div>

            <div className="mt-6">
              {isOutOfStock ? (
                <button
                  disabled
                  className="w-full rounded-md bg-gray-300 px-6 py-3 text-gray-500 cursor-not-allowed"
                >
                  Out of Stock
                </button>
              ) : (
                <PurchaseButton productId={product.id} vendorSlug={slug} />
              )}
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
