import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { User } from '@prisma/client'

export async function getCurrentUser(): Promise<User | null> {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    return null
  }

  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { id: clerkUser.id },
  })

  // If not found, create from Clerk data (webhook may not have fired yet)
  if (!user) {
    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )

    if (!primaryEmail) {
      return null
    }

    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null

    user = await prisma.user.create({
      data: {
        id: clerkUser.id,
        email: primaryEmail.emailAddress,
        name,
        avatarUrl: clerkUser.imageUrl,
      },
    })
  }

  return user
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}
