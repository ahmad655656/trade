import { NextResponse } from 'next/server'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { appendOrderTimelineEvent } from '@/lib/order-timeline'
import { notifyAdmins, notifyUsers } from '@/lib/notifications'
import { writeAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }
type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>
type SupplierItem = { supplier: { user: { id: string } } }

export async function POST(request: Request, { params }: Params) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            supplier: { include: { user: { select: { id: true } } } },
          },
        },
      },
    })

    if (!order || order.traderId !== user.trader.id) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الطلب غير موجود', 'Order not found') }, { status: 404 })
    }

    if (!['AWAITING_DELIVERY_CONFIRMATION', 'DELIVERED'].includes(order.status)) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'لا يمكن تأكيد الاستلام في الحالة الحالية', 'Cannot confirm delivery for current status') },
        { status: 400 },
      )
    }

    const updated = await prisma.$transaction(async (tx: TxClient) => {
      const delivered = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'DELIVERED',
          merchantConfirmedAt: new Date(),
        },
      })

      await appendOrderTimelineEvent(tx, {
        orderId: order.id,
        status: 'DELIVERED',
        actorUserId: user.id,
        language,
        note: i18nText(language, 'قام التاجر بتأكيد الاستلام', 'Merchant confirmed delivery'),
      })

      const closed = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'ORDER_CLOSED',
          closedAt: new Date(),
        },
      })

      await appendOrderTimelineEvent(tx, {
        orderId: order.id,
        status: 'ORDER_CLOSED',
        actorUserId: user.id,
        language,
        note: i18nText(language, 'تم إغلاق الطلب بعد تأكيد الاستلام', 'Order closed after delivery confirmation'),
      })

      return { delivered, closed }
    })

    const supplierUserIds = Array.from(new Set(order.items.map((item: SupplierItem) => item.supplier.user.id)))
    await notifyUsers({
      userIds: supplierUserIds,
      type: NotificationType.DELIVERY_CONFIRMED,
      title: i18nText(language, `تم تأكيد استلام الطلب ${order.orderNumber}`, `Delivery confirmed for ${order.orderNumber}`),
      message: i18nText(
        language,
        'أكد التاجر استلام الطلب وتم إغلاقه.',
        'Merchant confirmed delivery and order has been closed.',
      ),
      data: { orderId: order.id, orderNumber: order.orderNumber },
    })

    await notifyAdmins({
      type: NotificationType.DELIVERY_CONFIRMED,
      title: i18nText(language, `إغلاق الطلب ${order.orderNumber}`, `Order ${order.orderNumber} closed`),
      message: i18nText(language, 'أكد التاجر التسليم وتم إغلاق الطلب.', 'Merchant confirmed delivery and order is closed.'),
      data: { orderId: order.id, orderNumber: order.orderNumber },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'TRADER_CONFIRM_DELIVERY',
      entityType: 'ORDER',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber },
    })

    return NextResponse.json({
      success: true,
      data: updated.closed,
      message: i18nText(language, 'تم تأكيد الاستلام وإغلاق الطلب', 'Delivery confirmed and order closed'),
    })
  } catch (error) {
    console.error('Failed to confirm delivery:', error)
    return NextResponse.json({ success: false, error: 'Failed to confirm delivery' }, { status: 500 })
  }
}

