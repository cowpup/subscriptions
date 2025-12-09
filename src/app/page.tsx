import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">subr.net</h1>
      <p className="mt-4 text-lg text-gray-600">Creator-centric subscription marketplace</p>

      <div className="mt-8">
        <SignedOut>
          <div className="flex gap-4">
            <Link
              href="/sign-in"
              className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md border border-black px-4 py-2 hover:bg-gray-100"
            >
              Sign Up
            </Link>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="flex flex-col items-center gap-4">
            <UserButton afterSignOutUrl="/" />
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              Go to Dashboard
            </Link>
          </div>
        </SignedIn>
      </div>
    </main>
  )
}
