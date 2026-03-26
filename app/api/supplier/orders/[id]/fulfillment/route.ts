import { NextResponse } from 'next/server'
import { NotificationType, OrderItemStatus, OrderStatus, Role, ShippingStatus } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { notifyAdmins, notifyUsers } from '@/lib/notifications'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { appendOrderTimelineEvent } from '@/lib/order-timeline'
import { writeAuditLog } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/security'
import { sanitizePlainText } from '@/lib/sanitize'

type Params = { params: Promise<{ id: string }> }

type FulfillmentPayload = {
  status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  shippingMethod?: string
  trackingNumber?: string
  estimatedDeliveryDays?: number
  notes?: string
}

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>

export async function PATCH(request: Request, { params }: Params) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.SUPPLIER || !user.supplier) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const body: FulfillmentPayload = await request.json()
    const shippingMethod = sanitizePlainText(body.shippingMethod, 120)
    const trackingNumber = sanitizePlainText(body.trackingNumber, 120)
    const notes = sanitizePlainText(body.notes, 2000)

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        trader: { include: { user: { select: { id: true } } } },
        items: { where: { supplierId: user.supplier.id } },
      },
    })

    if (!order || !order.items.length) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الطلب غير موجود', 'Order not found') }, { status: 404 })
    }

    if (
      order.paymentStatus !== 'PAID' ||
      ![
        'PLATFORM_FEE_CONFIRMED',
        'ADMIN_APPROVED',
        'SUPPLIER_PREPARING_ORDER',
        'SHIPPED',
        'AWAITING_DELIVERY_CONFIRMATION',
        'DELIVERED',
      ].includes(order.status)
    ) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'الطلب غير معتمد من الإدارة بعد', 'Order is not approved by admin yet') },
        { status: 400 },
      )
    }

    const now = new Date()
    let orderStatus: OrderStatus = order.status as OrderStatus
    let shippingStatus: ShippingStatus = order.shippingStatus as ShippingStatus
    let itemStatus: OrderItemStatus = 'PENDING'
    let notificationType: NotificationType = 'SYSTEM'
    let timelineStatus: 'SUPPLIER_PREPARING_ORDER' | 'SHIPPED' | 'AWAITING_DELIVERY_CONFIRMATION' | 'CANCELLED'

    if (body.status === 'PROCESSING') {
      orderStatus = 'SUPPLIER_PREPARING_ORDER'
      shippingStatus = 'PROCESSING'
      itemStatus = 'PROCESSING'
      notificationType = 'SYSTEM'
      timelineStatus = 'SUPPLIER_PREPARING_ORDER'
    } else if (body.status === 'SHIPPED') {
      orderStatus = 'SHIPPED'
      shippingStatus = 'SHIPPED'
      itemStatus = 'SHIPPED'
      notificationType = 'ORDER_SHIPPED'
      timelineStatus = 'SHIPPED'
    } else if (body.status === 'DELIVERED') {
      orderStatus = 'AWAITING_DELIVERY_CONFIRMATION'
      shippingStatus = 'DELIVERED'
      itemStatus = 'DELIVERED'
      notificationType = 'ORDER_DELIVERED'
      timelineStatus = 'AWAITING_DELIVERY_CONFIRMATION'
    } else {
      orderStatus = 'CANCELLED'
      shippingStatus = 'FAILED'
      itemStatus = 'CANCELLED'
      notificationType = 'ORDER_CANCELLED'
      timelineStatus = 'CANCELLED'
    }

    const updated = await prisma.$transaction(async (tx: TxClient) => {
      await tx.orderItem.updateMany({
        where: { orderId: order.id, supplierId: user.supplier!.id },
        data: { status: itemStatus },
      })

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: orderStatus,
          shippingStatus,
          shippingMethod: shippingMethod || order.shippingMethod,
          trackingNumber: trackingNumber || order.trackingNumber,
          estimatedDelivery:
            body.estimatedDeliveryDays && Number.isFinite(body.estimatedDeliveryDays)
              ? new Date(now.getTime() + body.estimatedDeliveryDays * 86400000)
              : order.estimatedDelivery,
          processedAt: body.status === 'PROCESSING' ? now : order.processedAt,
          shippedAt: body.status === 'SHIPPED' ? now : order.shippedAt,
          deliveredAt: body.status === 'DELIVERED' ? now : order.deliveredAt,
          cancelledAt: body.status === 'CANCELLED' ? now : order.cancelledAt,
          cancelledReason: body.status === 'CANCELLED' ? notes || 'Cancelled by supplier' : order.cancelledReason,
        },
      })

      await appendOrderTimelineEvent(tx, {
        orderId: order.id,
        status: timelineStatus,
        actorUserId: user.id,
        language,
        note:
          notes ||
          i18nText(
            language,
            `تحديث المورد: ${body.status}`,
            `Supplier status update: ${body.status}`,
          ),
      })

      return updatedOrder
    })

    await notifyUsers({
      userIds: [order.trader.user.id],
      type: notificationType,
      title: i18nText(language, `تم تحديث الطلب ${order.orderNumber}`, `Order ${order.orderNumber} updated`),
      message: i18nText(
        language,
        `قام المورد بتغيير الحالة إلى ${body.status}. طريقة الشحن: ${shippingMethod || '-'}، رقم التتبع: ${trackingNumber || '-'}، المدة المتوقعة: ${body.estimatedDeliveryDays ?? '-'}.`,
        `Supplier changed order status to ${body.status}. Shipping method: ${shippingMethod || '-'}, tracking: ${trackingNumber || '-'}, ETA days: ${body.estimatedDeliveryDays ?? '-'}.`,
      ),
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: body.status,
        shippingMethod: shippingMethod || null,
        trackingNumber: trackingNumber || null,
        estimatedDeliveryDays: body.estimatedDeliveryDays ?? null,
      },
    })

    await notifyAdmins({
      type: notificationType,
      title: i18nText(language, `المورد حدّث الطلب ${order.orderNumber}`, `Supplier updated order ${order.orderNumber}`),
      message: i18nText(
        language,
        `تم تغيير الحالة إلى ${body.status}. طريقة الشحن: ${shippingMethod || '-'}، رقم التتبع: ${trackingNumber || '-'}.`,
        `Status changed to ${body.status}. Shipping method: ${shippingMethod || '-'}, tracking: ${trackingNumber || '-'}.`,
      ),
      data: {
        orderId: order.id,
        status: body.status,
        shippingMethod: shippingMethod || null,
        trackingNumber: trackingNumber || null,
        estimatedDeliveryDays: body.estimatedDeliveryDays ?? null,
      },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'SUPPLIER_UPDATE_FULFILLMENT',
      entityType: 'ORDER',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        status: body.status,
        shippingMethod: shippingMethod || null,
        trackingNumber: trackingNumber || null,
      },
    })

    return NextResponse.json({ success: true, data: updated, message: i18nText(language, 'تم تحديث تنفيذ الطلب', 'Order fulfillment updated') })
  } catch (error) {
    console.error('Failed to update fulfillment:', error)
    return NextResponse.json({ success: false, error: 'Failed to update fulfillment' }, { status: 500 })
  }
}

