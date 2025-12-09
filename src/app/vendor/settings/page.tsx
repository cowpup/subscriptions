import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { VendorSettingsForm } from './settings-form'

export default async function VendorSettingsPage() {
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
              <Link href="/vendor/orders" className="text-gray-600 hover:text-black">
                Orders
              </Link>
              <Link href="/vendor/tiers" className="text-gray-600 hover:text-black">
                Tiers
              </Link>
              <Link href="/vendor/giveaways" className="text-gray-600 hover:text-black">
                Giveaways
              </Link>
              <Link href="/vendor/settings" className="font-medium text-black">
                Settings
              </Link>
            </nav>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Store Settings</h1>
        <p className="mt-1 text-gray-600">Customize your storefront appearance</p>

        <VendorSettingsForm
          vendor={{
            id: vendor.id,
            storeName: vendor.storeName,
            slug: vendor.slug,
            description: vendor.description,
            logoUrl: vendor.logoUrl,
            bannerUrl: vendor.bannerUrl,
            accentColor: vendor.accentColor,
          }}
        />
      </main>
    </div>
  )
}
