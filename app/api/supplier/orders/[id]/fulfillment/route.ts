import { NextResponse } from 'next/server'
import { NotificationType, OrderItemStatus, OrderStatus, Role, ShippingStatus } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { notifyAdmins, notifyUsers } from '@/lib/notifications'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'

type Params = { params: Promise<{ id: string }> }

type FulfillmentPayload = {
  status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  shippingMethod?: string
  trackingNumber?: string
  estimatedDeliveryDays?: number
  notes?: string
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.SUPPLIER || !user.supplier) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const body: FulfillmentPayload = await request.json()

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

    if (order.paymentStatus !== 'PAID' || !['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status)) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'الطلب غير معتمد من الأدمن بعد', 'Order is not approved by admin yet') },
        { status: 400 },
      )
    }

    const now = new Date()
    let orderStatus: OrderStatus = order.status
    let shippingStatus: ShippingStatus = order.shippingStatus
    let itemStatus: OrderItemStatus = 'PENDING'
    let notificationType: NotificationType = 'SYSTEM'

    if (body.status === 'PROCESSING') {
      orderStatus = 'PROCESSING'
      shippingStatus = 'PROCESSING'
      itemStatus = 'PROCESSING'
      notificationType = 'SYSTEM'
    }

    if (body.status === 'SHIPPED') {
      orderStatus = 'SHIPPED'
      shippingStatus = 'SHIPPED'
      itemStatus = 'SHIPPED'
      notificationType = 'ORDER_SHIPPED'
    }

    if (body.status === 'DELIVERED') {
      orderStatus = 'DELIVERED'
      shippingStatus = 'DELIVERED'
      itemStatus = 'DELIVERED'
      notificationType = 'ORDER_DELIVERED'
    }

    if (body.status === 'CANCELLED') {
      orderStatus = 'CANCELLED'
      shippingStatus = 'FAILED'
      itemStatus = 'CANCELLED'
      notificationType = 'ORDER_CANCELLED'
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { orderId: order.id, supplierId: user.supplier!.id },
        data: { status: itemStatus },
      })

      return tx.order.update({
        where: { id: order.id },
        data: {
          status: orderStatus,
          shippingStatus,
          shippingMethod: body.shippingMethod ?? order.shippingMethod,
          trackingNumber: body.trackingNumber ?? order.trackingNumber,
          estimatedDelivery: body.estimatedDeliveryDays ? new Date(now.getTime() + body.estimatedDeliveryDays * 86400000) : order.estimatedDelivery,
          processedAt: body.status === 'PROCESSING' ? now : order.processedAt,
          shippedAt: body.status === 'SHIPPED' ? now : order.shippedAt,
          deliveredAt: body.status === 'DELIVERED' ? now : order.deliveredAt,
          cancelledAt: body.status === 'CANCELLED' ? now : order.cancelledAt,
          cancelledReason: body.status === 'CANCELLED' ? body.notes || 'Cancelled by supplier' : order.cancelledReason,
        },
      })
    })

    await notifyUsers({
      userIds: [order.trader.user.id],
      type: notificationType,
      title: i18nText(language, `تم تحديث الطلب ${order.orderNumber}`, `Order ${order.orderNumber} updated`),
      message: i18nText(
        language,
        `قام المورد بتغيير حالة الطلب إلى ${body.status}. طريقة الشحن: ${body.shippingMethod || '-'}، رقم التتبع: ${body.trackingNumber || '-'}، المدة المتوقعة بالأيام: ${body.estimatedDeliveryDays ?? '-'}.`,
        `Supplier changed order status to ${body.status}. Shipping method: ${body.shippingMethod || '-'}, tracking: ${body.trackingNumber || '-'}, ETA days: ${body.estimatedDeliveryDays ?? '-'}.`,
      ),
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: body.status,
        shippingMethod: body.shippingMethod || null,
        trackingNumber: body.trackingNumber || null,
        estimatedDeliveryDays: body.estimatedDeliveryDays ?? null,
      },
    })

    await notifyAdmins({
      type: notificationType,
      title: i18nText(language, `المورد حدّث الطلب ${order.orderNumber}`, `Supplier updated order ${order.orderNumber}`),
      message: i18nText(
        language,
        `تم تغيير الحالة إلى ${body.status}. طريقة الشحن: ${body.shippingMethod || '-'}، رقم التتبع: ${body.trackingNumber || '-'}.`,
        `Status changed to ${body.status}. Shipping method: ${body.shippingMethod || '-'}, tracking: ${body.trackingNumber || '-'}.`,
      ),
      data: {
        orderId: order.id,
        status: body.status,
        shippingMethod: body.shippingMethod || null,
        trackingNumber: body.trackingNumber || null,
        estimatedDeliveryDays: body.estimatedDeliveryDays ?? null,
      },
    })

    return NextResponse.json({ success: true, data: updated, message: i18nText(language, 'تم تحديث تنفيذ الطلب', 'Order fulfillment updated') })
  } catch (error) {
    console.error('Failed to update fulfillment:', error)
    return NextResponse.json({ success: false, error: 'Failed to update fulfillment' }, { status: 500 })
  }
}

