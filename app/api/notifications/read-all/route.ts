import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export async function PATCH() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const result = await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true, readAt: new Date() },
    })

    return NextResponse.json({ success: true, data: { updated: result.count } })
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
    return NextResponse.json({ success: false, error: 'Failed to mark all as read' }, { status: 500 })
  }
}
