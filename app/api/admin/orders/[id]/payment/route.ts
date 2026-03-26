import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { notifyAdmins, notifyUsers } from '@/lib/notifications'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { appendOrderTimelineEvent } from '@/lib/order-timeline'
import { writeAuditLog } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/security'

type Params = { params: Promise<{ id: string }> }

type VerifyPayload = {
  approved: boolean
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
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'ط؛ظٹط± ظ…طµط±ط­', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const body: VerifyPayload = await request.json()

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        trader: { include: { user: { select: { id: true } } } },
        items: {
          include: {
            supplier: { include: { user: { select: { id: true } } } },
          },
        },
        payment: true,
      },
    })

    if (!order || !order.payment) {
      return NextResponse.json({ success: false, error: i18nText(language, 'ط§ظ„ط·ظ„ط¨ ط؛ظٹط± ظ…ظˆط¬ظˆط¯', 'Order not found') }, { status: 404 })
    }

    if (body.approved) {
      let manualPaymentPayload: {
        senderPhone?: string
        transferTo?: string
        receiptUrl?: string
      } | null = null
      try {
        manualPaymentPayload = order.payment.refundReason ? JSON.parse(order.payment.refundReason) : null
      } catch {
        manualPaymentPayload = null
      }

      if (!manualPaymentPayload?.receiptUrl || !manualPaymentPayload?.senderPhone || !manualPaymentPayload?.transferTo) {
        return NextResponse.json(
          {
            success: false,
            error: i18nText(
              language,
              'ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¯ظپط¹ ط§ظ„ظٹط¯ظˆظٹ ط؛ظٹط± ظ…ظƒطھظ…ظ„ط©. ظٹط¬ط¨ ط¹ظ„ظ‰ ط§ظ„طھط§ط¬ط± ط¥ط±ط³ط§ظ„ ط§ظ„ظˆطµظ„ ط£ظˆظ„ط§ظ‹.',
              'Manual payment details are missing. Trader must submit receipt first.',
            ),
          },
          { status: 400 },
        )
      }

      const updated = await prisma.$transaction(async (tx: TxClient) => {
        await tx.payment.update({
          where: { orderId: order.id },
          data: {
            status: 'PAID',
            verifiedByAdminId: user.id,
            verifiedAt: new Date(),
            paidAt: new Date(),
          },
        })

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            status: 'ADMIN_APPROVED',
            confirmedAt: new Date(),
          },
        })

        await appendOrderTimelineEvent(tx, {
          orderId: order.id,
          status: 'PLATFORM_FEE_CONFIRMED',
          actorUserId: user.id,
          language,
          note: i18nText(language, 'طھظ… ط§ط¹طھظ…ط§ط¯ ط¹ظ…ظˆظ„ط© ط§ظ„ظ…ظ†طµط© ظ…ظ† ط§ظ„ط¥ط¯ط§ط±ط©', 'Platform fee verified by admin'),
        })

        await appendOrderTimelineEvent(tx, {
          orderId: order.id,
          status: 'ADMIN_APPROVED',
          actorUserId: user.id,
          language,
          note: i18nText(language, 'تم اعتماد الطلب وإرساله للمورد', 'Order approved and sent to supplier'),
        })

        return updatedOrder
      })

      await notifyUsers({
        userIds: [order.trader.user.id],
        type: 'SYSTEM',
        title: i18nText(language, `تم تأكيد الدفع للطلب ${order.orderNumber}`, `Payment confirmed for ${order.orderNumber}`),
        message: i18nText(
          language,
          `تم التحقق من عمولة المنصة للطلب ${order.orderNumber}. تم إرسال الطلب إلى المورد.`, 
          `Platform fee verified for order ${order.orderNumber}. Order has been sent to supplier.`,
        ),
        data: { orderId: order.id, orderNumber: order.orderNumber, status: 'ADMIN_APPROVED' },
      })

      await notifyAdmins({
        type: 'SYSTEM',
        title: i18nText(language, `تم اعتماد الطلب ${order.orderNumber}`, `Order ${order.orderNumber} approved`),
        message: i18nText(
          language,
          `تم اعتماد الطلب ${order.orderNumber} وإرساله إلى المورد.`, 
          `Order ${order.orderNumber} approved and sent to supplier.`,
        ),
        data: { orderId: order.id, orderNumber: order.orderNumber, status: 'ADMIN_APPROVED' },
      })

      await writeAuditLog({
        request,
        actorUserId: user.id,
        actorRole: user.role,
        action: 'ADMIN_APPROVE_PLATFORM_FEE',
        entityType: 'ORDER',
        entityId: order.id,
        metadata: { orderNumber: order.orderNumber },
      })

      return NextResponse.json({
        success: true,
        data: updated,
        message: i18nText(language, 'تم اعتماد الدفع وبانتظار مراجعة الإدارة', 'Payment approved and waiting for admin review'),
      })
    }

    const failed = await prisma.$transaction(async (tx: TxClient) => {
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          status: 'FAILED',
          verifiedByAdminId: user.id,
          verifiedAt: new Date(),
        },
      })

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          status: 'PAYMENT_REJECTED',
          cancelledAt: new Date(),
          cancelledReason: body.notes || 'Platform fee payment rejected',
        },
      })

      await appendOrderTimelineEvent(tx, {
        orderId: order.id,
        status: 'PAYMENT_REJECTED',
        actorUserId: user.id,
        language,
        note: body.notes || i18nText(language, 'طھظ… ط±ظپط¶ ط¥ط«ط¨ط§طھ ط§ظ„ط¯ظپط¹', 'Payment proof rejected'),
      })

      return updatedOrder
    })

    await notifyUsers({
      userIds: [order.trader.user.id],
      type: 'PAYMENT_FAILED',
      title: i18nText(language, 'طھظ… ط±ظپط¶ ط¥ط«ط¨ط§طھ ط§ظ„ط¯ظپط¹', 'Payment verification failed'),
      message: i18nText(
        language,
        `ظ‚ط§ظ… ط§ظ„ط£ط¯ظ…ظ† ط¨ط±ظپط¶ ط¥ط«ط¨ط§طھ ط§ظ„ط¯ظپط¹ ظ„ظ„ط·ظ„ط¨ ${order.orderNumber}.`,
        `Admin rejected manual payment for order ${order.orderNumber}.`,
      ),
      data: { orderId: order.id, orderNumber: order.orderNumber, reason: body.notes || null },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'ADMIN_REJECT_PLATFORM_FEE',
      entityType: 'ORDER',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, notes: body.notes || null },
    })

    return NextResponse.json({
      success: true,
      data: failed,
      message: i18nText(language, 'طھظ… ط±ظپط¶ ط§ظ„ط¯ظپط¹', 'Payment rejected'),
    })
  } catch (error) {
    console.error('Failed to verify manual payment:', error)
    return NextResponse.json({ success: false, error: 'Failed to verify manual payment' }, { status: 500 })
  }
}