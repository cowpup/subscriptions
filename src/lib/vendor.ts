import { prisma } from '@/lib/prisma'
import { Vendor } from '@prisma/client'

export async function getVendorByUserId(userId: string): Promise<Vendor | null> {
  return prisma.vendor.findUnique({
    where: { userId },
  })
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  return prisma.vendor.findUnique({
    where: { slug },
  })
}

export function generateSlug(storeName: string): string {
  return storeName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await prisma.vendor.findUnique({
    where: { slug },
    select: { id: true },
  })
  return !existing
}

export async function isStoreNameAvailable(storeName: string): Promise<boolean> {
  const existing = await prisma.vendor.findUnique({
    where: { storeName },
    select: { id: true },
  })
  return !existing
}
