import { NextResponse } from 'next/server'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { notifyAdmins, notifyUsers } from '@/lib/notifications'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { appendOrderTimelineEvent } from '@/lib/order-timeline'
import { writeAuditLog } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/security'
import { sanitizePlainText } from '@/lib/sanitize'

type Params = { params: Promise<{ id: string }> }

type ManualPaymentPayload = {
  senderPhone: string
  transferTo: string
  receiptUrl: string
  notes?: string
}

type SupplierItem = { supplier: { user: { id: string } } }
type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>

export async function PATCH(request: Request, { params }: Params) {
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
    const body: ManualPaymentPayload = await request.json()
    const senderPhone = sanitizePlainText(body.senderPhone, 30)
    const transferTo = sanitizePlainText(body.transferTo, 30)
    const receiptUrl = sanitizePlainText(body.receiptUrl, 600)
    const notes = sanitizePlainText(body.notes, 2000)

    if (!senderPhone || !transferTo || !receiptUrl) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'يجب إدخال رقم المرسل ورقم التحويل وصورة الوصل', 'senderPhone, transferTo, and receipt image are required') },
        { status: 400 },
      )
    }

    if (!receiptUrl.startsWith('/uploads/receipts/')) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'يجب رفع صورة الوصل من الجهاز أولاً', 'Please upload the receipt image first') },
        { status: 400 },
      )
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        trader: { include: { user: { select: { id: true } } } },
        payment: true,
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

    if (order.paymentStatus === 'PAID') {
      return NextResponse.json({ success: false, error: i18nText(language, 'تم اعتماد الدفع بالفعل', 'Payment already approved') }, { status: 400 })
    }

    if (!order.payment) {
      return NextResponse.json({ success: false, error: i18nText(language, 'لا توجد عملية دفع مرتبطة بالطلب', 'Payment record is missing') }, { status: 400 })
    }

    const manualPayload = {
      senderPhone,
      transferTo,
      receiptUrl,
      notes: notes || null,
      submittedAt: new Date().toISOString(),
      purpose: 'PLATFORM_FEE',
    }

    const updatedOrder = await prisma.$transaction(async (tx: TxClient) => {
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          refundReason: JSON.stringify(manualPayload),
          status: 'PENDING',
        },
      })

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'WAITING_FOR_PAYMENT_VERIFICATION',
          paymentStatus: 'PENDING',
        },
      })

      await appendOrderTimelineEvent(tx, {
        orderId: order.id,
        status: 'WAITING_FOR_PAYMENT_VERIFICATION',
        actorUserId: user.id,
        language,
        note: i18nText(language, 'تم إرسال/تحديث إثبات عمولة المنصة', 'Platform fee proof submitted/updated'),
      })

      return updated
    })

    await notifyAdmins({
      type: NotificationType.PAYMENT_RECEIVED,
      title: i18nText(language, `تم إرسال إثبات الدفع للطلب ${order.orderNumber}`, `Manual payment proof submitted for ${order.orderNumber}`),
      message: i18nText(
        language,
        `قام التاجر بإرسال إثبات عمولة المنصة. المرسل: ${senderPhone}، التحويل إلى: ${transferTo}.`,
        `Trader submitted platform fee proof. Sender: ${senderPhone}, transfer to: ${transferTo}.`,
      ),
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        senderPhone,
        transferTo,
        receiptUrl,
      },
    })

    await notifyUsers({
      userIds: [user.id, ...Array.from(new Set(order.items.map((item: SupplierItem) => item.supplier.user.id)))],
      type: NotificationType.SYSTEM,
      title: i18nText(language, `تم إرسال إثبات الدفع للطلب ${order.orderNumber}`, `Payment proof submitted for ${order.orderNumber}`),
      message: i18nText(language, 'بانتظار اعتماد الإدارة.', 'Waiting for admin confirmation.'),
      data: { orderId: order.id, orderNumber: order.orderNumber },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'ORDER_MANUAL_PAYMENT_SUBMITTED',
      entityType: 'ORDER',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        senderPhone,
        transferTo,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: i18nText(language, 'تم إرسال بيانات الدفع اليدوي', 'Manual payment details submitted'),
    })
  } catch (error) {
    console.error('Failed to submit manual payment details:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit manual payment details' }, { status: 500 })
  }
}

