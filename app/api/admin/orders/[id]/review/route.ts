import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { notifyAdmins, notifyUsers } from '@/lib/notifications'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { appendOrderTimelineEvent } from '@/lib/order-timeline'
import { writeAuditLog } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/security'
import { sanitizePlainText } from '@/lib/sanitize'

type Params = { params: Promise<{ id: string }> }

type ReviewPayload = {
  approved: boolean
  notes?: string
}

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>

type OrderSupplierItem = { supplier: { user: { id: string } } }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const body: ReviewPayload = await request.json()
    const notes = sanitizePlainText(body.notes, 2000)

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        trader: { include: { user: { select: { id: true, name: true, email: true } } } },
        address: true,
        items: {
          include: {
            supplier: { include: { user: { select: { id: true, name: true } } } },
            product: { select: { id: true, nameAr: true, nameEn: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الطلب غير موجود', 'Order not found') }, { status: 404 })
    }

    if (order.paymentStatus !== 'PAID' || order.status !== 'WAITING_FOR_ADMIN_REVIEW') {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'لا يمكن مراجعة الطلب في حالته الحالية', 'Order is not waiting for admin review') },
        { status: 400 },
      )
    }

    if (body.approved) {
      const updated = await prisma.$transaction(async (tx: TxClient) => {
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'ADMIN_APPROVED',
          },
        })

        await appendOrderTimelineEvent(tx, {
          orderId: order.id,
          status: 'ADMIN_APPROVED',
          actorUserId: user.id,
          language,
          note: notes || i18nText(language, 'تم اعتماد الطلب وإرساله للمورد', 'Order approved and sent to supplier'),
        })

        return updatedOrder
      })

      const supplierUserIds = Array.from(new Set(order.items.map((item: OrderSupplierItem) => item.supplier.user.id)))

      await notifyUsers({
        userIds: [order.trader.user.id, ...supplierUserIds],
        type: 'ORDER_CONFIRMED',
        title: i18nText(language, `تم اعتماد الطلب ${order.orderNumber}`, `Order ${order.orderNumber} approved`),
        message: i18nText(
          language,
          `اعتمدت الإدارة الطلب ${order.orderNumber} وتم إرساله للمورد. ${notes ? `ملاحظات الإدارة: ${notes}` : ''}`.trim(),
          `Admin approved order ${order.orderNumber} and sent it to supplier. ${notes ? `Admin notes: ${notes}` : ''}`.trim(),
        ),
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: 'ADMIN_APPROVED',
          shippingMethod: order.shippingMethod || null,
          trackingNumber: order.trackingNumber || null,
          addressId: order.shippingAddressId || null,
        },
      })

      await notifyAdmins({
        type: 'SYSTEM',
        title: i18nText(language, `تم اعتماد الطلب ${order.orderNumber}`, `Order ${order.orderNumber} approved`),
        message: i18nText(
          language,
          `تم اعتماد الطلب ${order.orderNumber} وإرساله للمورد.`,
          `Order ${order.orderNumber} approved and sent to supplier.`,
        ),
        data: { orderId: order.id, orderNumber: order.orderNumber, status: 'ADMIN_APPROVED' },
      })

      await writeAuditLog({
        request,
        actorUserId: user.id,
        actorRole: user.role,
        action: 'ADMIN_REVIEW_APPROVE_ORDER',
        entityType: 'ORDER',
        entityId: order.id,
        metadata: { orderNumber: order.orderNumber, notes: notes || null },
      })

      return NextResponse.json({
        success: true,
        data: updated,
        message: i18nText(language, 'تم اعتماد الطلب وإرساله للمورد', 'Order approved and sent to supplier'),
      })
    }

    const rejected = await prisma.$transaction(async (tx: TxClient) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'ADMIN_REJECTED',
          cancelledAt: new Date(),
          cancelledReason: notes || 'Rejected by admin review',
        },
      })

      await appendOrderTimelineEvent(tx, {
        orderId: order.id,
        status: 'ADMIN_REJECTED',
        actorUserId: user.id,
        language,
        note: notes || i18nText(language, 'تم رفض الطلب من الإدارة', 'Order rejected by admin'),
      })

      return updatedOrder
    })

    await notifyUsers({
      userIds: [order.trader.user.id],
      type: 'ORDER_CANCELLED',
      title: i18nText(language, `تم رفض الطلب ${order.orderNumber}`, `Order ${order.orderNumber} rejected`),
      message: i18nText(
        language,
        notes ? `سبب الرفض: ${notes}` : 'تم رفض الطلب من الإدارة. يمكن تعديل بيانات الشحن وإعادة الطلب.',
        notes ? `Rejection reason: ${notes}` : 'Order was rejected by admin. Please update shipping details and reorder.',
      ),
      data: { orderId: order.id, orderNumber: order.orderNumber, status: 'ADMIN_REJECTED', reason: notes || null },
    })

    await notifyAdmins({
      type: 'SYSTEM',
      title: i18nText(language, `تم رفض الطلب ${order.orderNumber}`, `Order ${order.orderNumber} rejected`),
      message: i18nText(
        language,
        notes ? `سبب الرفض: ${notes}` : 'تم رفض الطلب من الإدارة.',
        notes ? `Rejection reason: ${notes}` : 'Order rejected by admin.',
      ),
      data: { orderId: order.id, orderNumber: order.orderNumber, status: 'ADMIN_REJECTED', reason: notes || null },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'ADMIN_REVIEW_REJECT_ORDER',
      entityType: 'ORDER',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, notes: notes || null },
    })

    return NextResponse.json({
      success: true,
      data: rejected,
      message: i18nText(language, 'تم رفض الطلب', 'Order rejected'),
    })
  } catch (error) {
    console.error('Failed to review order:', error)
    return NextResponse.json({ success: false, error: 'Failed to review order' }, { status: 500 })
  }
}