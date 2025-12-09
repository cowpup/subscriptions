import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'
import { EditProductForm } from './edit-product-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: PageProps) {
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

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      tierAccess: {
        include: { tier: true },
      },
    },
  })

  if (!product || product.vendorId !== vendor.id) {
    notFound()
  }

  const tiers = await prisma.subscriptionTier.findMany({
    where: { vendorId: vendor.id, isActive: true },
    orderBy: { priceInCents: 'asc' },
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
              <Link href="/vendor/products" className="font-medium text-black">
                Products
              </Link>
              <Link href="/vendor/orders" className="text-gray-600 hover:text-black">
                Orders
              </Link>
              <Link href="/vendor/tiers" className="text-gray-600 hover:text-black">
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

      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Edit Product</h1>
          <p className="mt-2 text-gray-600">Update your product details.</p>

          <EditProductForm
            product={{
              id: product.id,
              name: product.name,
              description: product.description,
              priceInCents: product.priceInCents,
              imageUrl: product.images[0] ?? null,
              stockQuantity: product.stockQuantity,
              isActive: product.isActive,
              tierAccessIds: product.tierAccess.map((ta) => ta.tierId),
            }}
            tiers={tiers.map((t) => ({
              id: t.id,
              name: t.name,
              priceInCents: t.priceInCents,
            }))}
          />
        </div>
      </main>
    </div>
  )
}
