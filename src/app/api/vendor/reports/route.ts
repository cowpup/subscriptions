import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCurrentUser } from '@/lib/auth'
import { getVendorByUserId } from '@/lib/vendor'

interface ReportRequest {
  userId: string
  reason: string
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
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    const body = (await req.json()) as ReportRequest
    const { userId: reportedUserId, reason } = body

    if (!reportedUserId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // For now, we'll log the report. In a production system, you'd store this
    // in a UserReport model and notify admins
    console.log('User report submitted:', {
      reportedBy: vendor.id,
      vendorName: vendor.storeName,
      reportedUserId,
      reason,
      timestamp: new Date().toISOString(),
    })

    // In the future, you could create a UserReport model and store this:
    // await prisma.userReport.create({
    //   data: {
    //     reportedUserId,
    //     reportedByVendorId: vendor.id,
    //     reason,
    //   },
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
