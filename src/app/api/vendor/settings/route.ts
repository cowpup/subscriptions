import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'

interface UpdateSettingsRequest {
  storeName?: string
  description?: string | null
  logoUrl?: string | null
  bannerUrl?: string | null
  accentColor?: string | null
}

export async function PATCH(req: Request) {
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
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (vendor.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Vendor not approved' }, { status: 403 })
    }

    const body = (await req.json()) as UpdateSettingsRequest
    const { storeName, description, logoUrl, bannerUrl, accentColor } = body

    // Validate store name if provided
    if (storeName !== undefined) {
      if (!storeName.trim()) {
        return NextResponse.json({ error: 'Store name is required' }, { status: 400 })
      }
      if (storeName.length > 50) {
        return NextResponse.json({ error: 'Store name must be 50 characters or less' }, { status: 400 })
      }
    }

    // Validate description length
    if (description && description.length > 500) {
      return NextResponse.json({ error: 'Description must be 500 characters or less' }, { status: 400 })
    }

    // Validate URLs if provided
    if (logoUrl && !isValidUrl(logoUrl)) {
      return NextResponse.json({ error: 'Invalid logo URL' }, { status: 400 })
    }
    if (bannerUrl && !isValidUrl(bannerUrl)) {
      return NextResponse.json({ error: 'Invalid banner URL' }, { status: 400 })
    }

    // Validate accent color format
    if (accentColor && !/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
      return NextResponse.json({ error: 'Invalid accent color format' }, { status: 400 })
    }

    // Update the vendor
    const updatedVendor = await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        ...(storeName !== undefined && { storeName: storeName.trim() }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(accentColor !== undefined && { accentColor }),
      },
    })

    return NextResponse.json({ vendor: updatedVendor })
  } catch (error) {
    console.error('Error updating vendor settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
