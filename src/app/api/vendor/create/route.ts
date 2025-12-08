import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { generateSlug, isSlugAvailable, isStoreNameAvailable } from '@/lib/vendor'
import { getCurrentUser } from '@/lib/auth'

interface CreateVendorRequest {
  storeName: string
  slug?: string
  description?: string
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user exists in our database
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is already a vendor
    const existingVendor = await prisma.vendor.findUnique({
      where: { userId },
    })

    if (existingVendor) {
      return NextResponse.json({ error: 'Already a vendor' }, { status: 400 })
    }

    const body = (await req.json()) as CreateVendorRequest
    const { storeName, description } = body

    if (!storeName || storeName.trim().length < 3) {
      return NextResponse.json(
        { error: 'Store name must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (storeName.trim().length > 50) {
      return NextResponse.json(
        { error: 'Store name must be 50 characters or less' },
        { status: 400 }
      )
    }

    // Check store name availability
    const storeNameAvailable = await isStoreNameAvailable(storeName.trim())
    if (!storeNameAvailable) {
      return NextResponse.json({ error: 'Store name already taken' }, { status: 400 })
    }

    // Generate or validate slug
    const slug = body.slug?.trim() ?? generateSlug(storeName)

    if (slug.length < 3) {
      return NextResponse.json({ error: 'Slug must be at least 3 characters' }, { status: 400 })
    }

    // Ensure slug is URL-safe
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Slug can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    // Check slug availability
    const slugAvailable = await isSlugAvailable(slug)
    if (!slugAvailable) {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 400 })
    }

    // Create vendor
    const vendor = await prisma.vendor.create({
      data: {
        userId,
        storeName: storeName.trim(),
        slug,
        description: description?.trim() ?? null,
      },
    })

    return NextResponse.json({ vendor }, { status: 201 })
  } catch (error) {
    console.error('Error creating vendor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
