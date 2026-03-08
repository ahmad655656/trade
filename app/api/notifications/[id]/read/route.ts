import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(_: Request, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const notification = await prisma.notification.findUnique({ where: { id } })
    if (!notification || notification.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 })
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    return NextResponse.json({ success: false, error: 'Failed to mark as read' }, { status: 500 })
  }
}
