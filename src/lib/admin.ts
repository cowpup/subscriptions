import { currentUser } from '@clerk/nextjs/server'

export function getAdminEmails(): string[] {
  const emails = process.env.ADMIN_EMAILS ?? ''
  return emails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await currentUser()
  if (!user) {
    return false
  }

  const primaryEmail = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId
  )
  if (!primaryEmail) {
    return false
  }

  const adminEmails = getAdminEmails()
  return adminEmails.includes(primaryEmail.emailAddress.toLowerCase())
}

export async function requireAdmin(): Promise<void> {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required')
  }
}
