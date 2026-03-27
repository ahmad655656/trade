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

type OrderItemSummary = {
  quantity: number
  product: { nameAr: string | null; nameEn: string | null }
}

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
        trader: { include: { user: { select: { id: true, name: true, email: true } } } },
        address: true,
        items: {
          include: {
            supplier: { include: { user: { select: { id: true } } } },
            product: { select: { nameAr: true, nameEn: true } },
          },
        },
      },
    })

    if (!order || order.traderId !== user.trader.id) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الطلب غير موجود', 'Order not found') }, { status: 404 })
    }

    const now = new Date()
    const canConfirmAfterEstimatedDelivery =
      order.status === 'SHIPPED' &&
      order.estimatedDelivery instanceof Date &&
      now >= order.estimatedDelivery

    if (!['AWAITING_DELIVERY_CONFIRMATION', 'DELIVERED'].includes(order.status) && !canConfirmAfterEstimatedDelivery) {
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
        note: i18nText(language, 'التاجر أكد استلام البضاعة', 'Merchant confirmed delivery'),
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
    const separator = language === 'ar' ? '، ' : ', '
    const itemSummary = (order.items as OrderItemSummary[])
      .map((item) => {
        const name = language === 'ar' ? item.product.nameAr || item.product.nameEn : item.product.nameEn || item.product.nameAr
        return `${name ?? '-'} x ${item.quantity}`
      })
      .join(separator)

    const addressSummary = order.address
      ? `${order.address.country} - ${order.address.city}${order.address.state ? ` - ${order.address.state}` : ''} | ${order.address.address}`
      : (language === 'ar' ? 'غير محدد' : 'Not provided')

    await notifyUsers({
      userIds: supplierUserIds,
      type: NotificationType.DELIVERY_CONFIRMED,
      title: i18nText(language, `تأكيد استلام البضاعة ${order.orderNumber}`, `Delivery confirmed for ${order.orderNumber}`),
      message: i18nText(
        language,
        'التاجر أكد استلام البضاعة. الرجاء تأكيد استلام المال النقدي لإكمال الطلب وطلب التحويل.',
        'Trader confirmed goods receipt. Please confirm cash payment received to complete order and request payout.',
      ),
      data: { orderId: order.id, orderNumber: order.orderNumber },
    })

    await notifyAdmins({
      type: NotificationType.DELIVERY_CONFIRMED,
      title: i18nText(language, `تم تسليم الطلب ${order.orderNumber}`, `Order ${order.orderNumber} delivered`),
      message: i18nText(
        language,
        `تم تأكيد الاستلام. التاجر: ${order.trader?.user?.name || '-'}، العناصر: ${itemSummary || '-'}. طريقة الشحن: ${order.shippingMethod || '-'}، رقم التتبع: ${order.trackingNumber || '-'}، العنوان: ${addressSummary}.`,
        `Delivery confirmed. Trader: ${order.trader?.user?.name || '-'}, items: ${itemSummary || '-'}. Shipping method: ${order.shippingMethod || '-'}, tracking: ${order.trackingNumber || '-'}, address: ${addressSummary}.`,
      ),
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        traderName: order.trader?.user?.name || null,
        items: order.items.map((item) => ({
          name: item.product.nameAr || item.product.nameEn || '-',
          quantity: item.quantity,
        })),
        shippingMethod: order.shippingMethod || null,
        trackingNumber: order.trackingNumber || null,
        address: order.address
          ? {
              title: order.address.title,
              recipient: order.address.recipient,
              phone: order.address.phone,
              country: order.address.country,
              city: order.address.city,
              state: order.address.state,
              address: order.address.address,
              postalCode: order.address.postalCode,
            }
          : null,
      },
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
