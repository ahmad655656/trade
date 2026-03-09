import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        trader: { select: { userId: true } },
        items: { select: { supplierId: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    if (user.role === Role.TRADER && order.trader.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    if (user.role === Role.SUPPLIER) {
      const supplier = await prisma.supplier.findUnique({ where: { userId: user.id }, select: { id: true } })
      if (!supplier || !order.items.some((item) => item.supplierId === supplier.id)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
      }
    }

    const events = await prisma.orderTimelineEvent.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json({ success: true, data: events })
  } catch (error) {
    console.error('Failed to load order timeline:', error)
    return NextResponse.json({ success: false, error: 'Failed to load order timeline' }, { status: 500 })
  }
}

