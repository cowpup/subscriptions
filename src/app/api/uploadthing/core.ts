import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { auth } from '@clerk/nextjs/server'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'

const f = createUploadthing()

async function validateVendor() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const user = await getCurrentUser()
  if (!user) {
    throw new Error('User not found')
  }

  const vendor = await getVendorByUserId(user.id)
  if (!vendor || vendor.status !== 'APPROVED') {
    throw new Error('Vendor not approved')
  }

  return { userId: user.id, vendorId: vendor.id }
}

export const ourFileRouter = {
  // Product image uploader - only for approved vendors
  productImage: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(validateVendor)
    .onUploadComplete(({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url }
    }),

  // Vendor logo uploader
  vendorLogo: f({ image: { maxFileSize: '2MB', maxFileCount: 1 } })
    .middleware(validateVendor)
    .onUploadComplete(({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url }
    }),

  // Vendor banner uploader
  vendorBanner: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(validateVendor)
    .onUploadComplete(({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
