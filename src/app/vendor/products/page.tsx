import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { prisma } from '@/lib/prisma'
import { formatAmountForDisplay } from '@/lib/stripe'

export default async function VendorProductsPage() {
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

  const products = await prisma.product.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: 'desc' },
    include: {
      tierAccess: {
        include: { tier: true },
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

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Products</h1>
          <Link
            href="/vendor/products/new"
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Add Product
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 rounded-lg border bg-white p-8 text-center">
            <p className="text-gray-600">You haven&apos;t added any products yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Add products that your subscribers can purchase.
            </p>
            <Link
              href="/vendor/products/new"
              className="mt-4 inline-block rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
            >
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-lg border bg-white shadow-sm overflow-hidden"
              >
                {product.images.length > 0 ? (
                  <div className="relative h-48 w-full">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center bg-gray-100">
                    <span className="text-4xl text-gray-400">📦</span>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-semibold">{product.name}</h2>
                      <p className="text-lg font-bold">
                        {formatAmountForDisplay(product.priceInCents)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        product.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {product.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <span>Stock: {product.stockQuantity ?? '∞'}</span>
                    {product.tierAccess.length > 0 && (
                      <>
                        <span>•</span>
                        <span>
                          {product.tierAccess.map((ta) => ta.tier.name).join(', ')}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Link
                      href={`/vendor/products/${product.id}`}
                      className="text-sm text-black hover:underline"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
