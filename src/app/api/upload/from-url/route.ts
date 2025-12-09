import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'
import { UTApi } from 'uploadthing/server'

const utapi = new UTApi()

interface UploadFromUrlRequest {
  url: string
  type: 'product' | 'logo' | 'banner'
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const vendor = await getVendorByUserId(user.id)
    if (!vendor || vendor.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Vendor not approved' }, { status: 403 })
    }

    const body = (await req.json()) as UploadFromUrlRequest
    const { url, type } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the image
    const response = await fetch(url)
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image from URL' }, { status: 400 })
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.startsWith('image/')) {
      return NextResponse.json({ error: 'URL does not point to an image' }, { status: 400 })
    }

    const blob = await response.blob()

    // Size limits based on type
    const maxSizes = {
      product: 4 * 1024 * 1024, // 4MB
      logo: 2 * 1024 * 1024, // 2MB
      banner: 4 * 1024 * 1024, // 4MB
    }

    if (blob.size > maxSizes[type]) {
      return NextResponse.json(
        { error: `Image too large. Max size: ${maxSizes[type] / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    // Extract filename from URL or generate one
    const urlPath = new URL(url).pathname
    const originalName = urlPath.split('/').pop() || 'image'
    const extension = contentType.split('/')[1] || 'jpg'
    const fileName = originalName.includes('.') ? originalName : `${originalName}.${extension}`

    // Upload to Uploadthing
    const file = new File([blob], fileName, { type: contentType })
    const uploadResult = await utapi.uploadFiles([file])

    if (!uploadResult[0]?.data?.url) {
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    return NextResponse.json({ url: uploadResult[0].data.url })
  } catch (error) {
    console.error('Error uploading from URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
