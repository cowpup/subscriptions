import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { isCurrentUserAdmin } from '@/lib/admin'

interface ApproveRequest {
  vendorId: string
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = (await req.json()) as ApproveRequest
    const { vendorId } = body

    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID required' }, { status: 400 })
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (vendor.status !== 'PENDING') {
      return NextResponse.json({ error: 'Vendor is not pending approval' }, { status: 400 })
    }

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error approving vendor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
