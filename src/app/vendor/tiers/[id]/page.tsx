import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'
import { EditTierForm } from './edit-tier-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditTierPage({ params }: PageProps) {
  const { id } = await params
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

  const tier = await prisma.subscriptionTier.findUnique({
    where: { id },
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  })

  if (!tier || tier.vendorId !== vendor.id) {
    notFound()
  }

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
              <Link href="/vendor/tiers" className="font-medium text-black">
                Tiers
              </Link>
            </nav>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Edit Tier</h1>
              <p className="mt-1 text-sm text-gray-600">
                {tier._count.subscriptions} active subscriber{tier._count.subscriptions !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href="/vendor/tiers"
              className="text-sm text-gray-600 hover:text-black"
            >
              Back to Tiers
            </Link>
          </div>

          <EditTierForm
            tier={{
              id: tier.id,
              name: tier.name,
              description: tier.description,
              priceInCents: tier.priceInCents,
              benefits: tier.benefits,
              isActive: tier.isActive,
            }}
            hasSubscribers={tier._count.subscriptions > 0}
          />
        </div>
      </main>
    </div>
  )
}
