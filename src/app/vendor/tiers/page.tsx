import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'
import { formatAmountForDisplay } from '@/lib/stripe'

export default async function VendorTiersPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const vendor = await getVendorByUserId(user.id)

  if (!vendor) {
    redirect('/dashboard/become-creator')
  }

  if (vendor.status !== 'APPROVED') {
    redirect('/vendor')
  }

  const tiers = await prisma.subscriptionTier.findMany({
    where: { vendorId: vendor.id },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              subr.net
            </Link>
            <nav className="hidden items-center gap-4 text-sm md:flex">
              <Link href="/vendor" className="text-gray-600 hover:text-black">
                Dashboard
              </Link>
              <Link href="/vendor/products" className="text-gray-600 hover:text-black">
                Products
              </Link>
              <Link href="/vendor/tiers" className="font-medium text-black">
                Tiers
              </Link>
              <Link href="/vendor/giveaways" className="text-gray-600 hover:text-black">
                Giveaways
              </Link>
              <Link href="/vendor/settings" className="text-gray-600 hover:text-black">
                Settings
              </Link>
            </nav>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Subscription Tiers</h1>
          <Link
            href="/vendor/tiers/new"
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Create Tier
          </Link>
        </div>

        {tiers.length === 0 ? (
          <div className="mt-8 rounded-lg border bg-white p-8 text-center">
            <p className="text-gray-600">You haven&apos;t created any subscription tiers yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Create tiers to let subscribers access your exclusive content and products.
            </p>
            <Link
              href="/vendor/tiers/new"
              className="mt-4 inline-block rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
            >
              Create Your First Tier
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className="rounded-lg border bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold">{tier.name}</h2>
                    <p className="text-2xl font-bold">
                      {formatAmountForDisplay(tier.priceInCents)}
                      <span className="text-sm font-normal text-gray-500">/mo</span>
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      tier.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tier.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {tier.description && (
                  <p className="mt-2 text-sm text-gray-600">{tier.description}</p>
                )}

                {tier.benefits.length > 0 && (
                  <ul className="mt-4 space-y-1 text-sm">
                    {tier.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-gray-500">
                  <span>{tier._count.subscriptions} subscribers</span>
                  <Link
                    href={`/vendor/tiers/${tier.id}`}
                    className="text-black hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
