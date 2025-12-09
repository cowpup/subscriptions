import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AddressForm } from './address-form'
import { AddressCard } from './address-card'

export default async function AddressesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Shipping Addresses</h1>
            <p className="mt-1 text-gray-600">Manage your shipping addresses</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-black"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Add New Address Form */}
        <div className="mt-8">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Add New Address</h2>
            <AddressForm />
          </div>
        </div>

        {/* Existing Addresses */}
        <div className="mt-8">
          <h2 className="font-semibold">Your Addresses</h2>
          {addresses.length === 0 ? (
            <div className="mt-4 rounded-lg border bg-white p-6 text-center">
              <p className="text-gray-600">No addresses saved yet.</p>
              <p className="mt-1 text-sm text-gray-500">
                Add an address above to use during checkout.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {addresses.map((address) => (
                <AddressCard key={address.id} address={address} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
