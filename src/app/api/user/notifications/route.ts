import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface UpdateNotificationRequest {
  emailDrops?: boolean
  emailGiveaways?: boolean
  pushDrops?: boolean
  pushGiveaways?: boolean
}

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get or create notification preferences with defaults
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: user.id },
    })

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: user.id,
          emailDrops: true,
          emailGiveaways: true,
          pushDrops: true,
          pushGiveaways: true,
        },
      })
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = (await req.json()) as UpdateNotificationRequest
    const { emailDrops, emailGiveaways, pushDrops, pushGiveaways } = body

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: {
        emailDrops: emailDrops ?? undefined,
        emailGiveaways: emailGiveaways ?? undefined,
        pushDrops: pushDrops ?? undefined,
        pushGiveaways: pushGiveaways ?? undefined,
      },
      create: {
        userId: user.id,
        emailDrops: emailDrops ?? true,
        emailGiveaways: emailGiveaways ?? true,
        pushDrops: pushDrops ?? true,
        pushGiveaways: pushGiveaways ?? true,
      },
    })

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
