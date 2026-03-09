import { NextResponse } from 'next/server'
import { OrderStatus, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { notifyUsers } from '@/lib/notifications'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'

type Params = { params: Promise<{ id: string }> }

type VerifyPayload = {
  approved: boolean
  notes?: string
}
type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>

export async function PATCH(request: Request, { params }: Params) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
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
      return NextResponse.json({ success: false, error: i18nText(language, 'الطلب غير موجود', 'Order not found') }, { status: 404 })
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
              'بيانات الدفع اليدوي غير مكتملة. يجب على التاجر إرسال الوصل أولاً.',
              'Manual payment details are missing. Trader must submit receipt first.',
            ),
          },
          { status: 400 },
        )
      }

      const updated = await prisma.$transaction(async (tx: TxClient) => {
        const payment = await tx.payment.update({
          where: { orderId: order.id },
          data: {
            status: 'PAID',
            transactionId: null,
            paidAt: new Date(),
          },
        })

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            status: OrderStatus.CONFIRMED,
            transactionId: null,
            confirmedAt: new Date(),
          },
        })

        return { payment, updatedOrder }
      })

      await notifyUsers({
        userIds: [
          order.trader.user.id,
          ...order.items.map((item) => item.supplier.user.id),
        ],
        type: 'ORDER_CONFIRMED',
        title: i18nText(language, 'تم اعتماد الدفع يدويًا', 'Payment verified manually'),
        message: i18nText(
          language,
          `قام الأدمن باعتماد الدفع اليدوي للطلب ${order.orderNumber}. تم تأكيد الطلب.`,
          `Admin verified manual payment for order ${order.orderNumber}. Order is now confirmed.`,
        ),
        data: { orderId: order.id, orderNumber: order.orderNumber },
      })

      return NextResponse.json({ success: true, data: updated, message: i18nText(language, 'تم قبول الدفع وتأكيد الطلب', 'Payment approved and order confirmed') })
    }

    const failed = await prisma.$transaction(async (tx: TxClient) => {
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          status: 'FAILED',
          transactionId: null,
        },
      })

      return tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledReason: body.notes || 'Manual payment not received',
        },
      })
    })

    await notifyUsers({
      userIds: [
        order.trader.user.id,
        ...order.items.map((item) => item.supplier.user.id),
      ],
      type: 'PAYMENT_FAILED',
      title: i18nText(language, 'تم رفض التحقق من الدفع', 'Payment verification failed'),
      message: i18nText(
        language,
        `قام الأدمن برفض الدفع اليدوي للطلب ${order.orderNumber}.`,
        `Admin rejected manual payment for order ${order.orderNumber}.`,
      ),
      data: { orderId: order.id, orderNumber: order.orderNumber, reason: body.notes || null },
    })

    return NextResponse.json({ success: true, data: failed, message: i18nText(language, 'تم رفض الدفع وإلغاء الطلب', 'Payment rejected and order cancelled') })
  } catch (error) {
    console.error('Failed to verify manual payment:', error)
    return NextResponse.json({ success: false, error: 'Failed to verify manual payment' }, { status: 500 })
  }
}

