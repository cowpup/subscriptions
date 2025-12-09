import Link from 'next/link'
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { VendorBadge } from '@/components/ui/vendor-badge'

interface HeaderProps {
  showVendorLink?: boolean
}

export async function Header({ showVendorLink = true }: HeaderProps) {
  const user = await getCurrentUser()
  let vendor = null

  if (user) {
    vendor = await getVendorByUserId(user.id)
  }

  const isApprovedVendor = vendor?.status === 'APPROVED'

  return (
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
            {showVendorLink && isApprovedVendor && (
              <Link
                href="/vendor"
                className="flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800"
              >
                <VendorBadge size="sm" />
                Vendor Hub
              </Link>
            )}
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
  )
}
