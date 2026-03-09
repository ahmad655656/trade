import { NextResponse } from 'next/server'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { notifyAdmins, notifyUsers } from '@/lib/notifications'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'

type Params = { params: Promise<{ id: string }> }

type ManualPaymentPayload = {
  senderPhone: string
  transferTo: string
  receiptUrl: string
  notes?: string
}
type SupplierItem = { supplier: { user: { id: string } } }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const body: ManualPaymentPayload = await request.json()

    if (!body.senderPhone?.trim() || !body.transferTo?.trim() || !body.receiptUrl?.trim()) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'يجب إدخال رقم المرسل ورقم التحويل وصورة الوصل', 'senderPhone, transferTo, and receipt image are required') },
        { status: 400 },
      )
    }

    if (!body.receiptUrl.startsWith('/uploads/receipts/')) {
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

    if (order.paymentStatus !== 'PENDING' || !order.payment) {
      return NextResponse.json({ success: false, error: i18nText(language, 'تمت معالجة الدفع لهذا الطلب مسبقًا', 'Payment is already processed') }, { status: 400 })
    }

    const manualPayload = {
      senderPhone: body.senderPhone.trim(),
      transferTo: body.transferTo.trim(),
      receiptUrl: body.receiptUrl.trim(),
      notes: body.notes?.trim() || null,
      submittedAt: new Date().toISOString(),
    }

    const updated = await prisma.payment.update({
      where: { orderId: order.id },
      data: {
        refundReason: JSON.stringify(manualPayload),
      },
    })

    await notifyAdmins({
      type: NotificationType.PAYMENT_RECEIVED,
      title: i18nText(language, `تم إرسال إثبات الدفع للطلب ${order.orderNumber}`, `Manual payment proof submitted for ${order.orderNumber}`),
      message: i18nText(
        language,
        `قام التاجر بإرسال إثبات دفع سيرياتيل كاش. رقم المرسل: ${body.senderPhone}، رقم التحويل إليه: ${body.transferTo}.`,
        `Trader submitted Syriatel Cash proof. Sender: ${body.senderPhone}, transfer to: ${body.transferTo}.`,
      ),
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        senderPhone: body.senderPhone.trim(),
        transferTo: body.transferTo.trim(),
        receiptUrl: body.receiptUrl.trim(),
      },
    })

    await notifyUsers({
      userIds: [user.id, ...Array.from(new Set(order.items.map((item: SupplierItem) => item.supplier.user.id)))],
      type: NotificationType.SYSTEM,
      title: i18nText(language, `تم إرسال إثبات الدفع للطلب ${order.orderNumber}`, `Payment proof submitted for ${order.orderNumber}`),
      message: i18nText(language, 'بانتظار اعتماد الأدمن.', 'Waiting for admin confirmation.'),
      data: { orderId: order.id, orderNumber: order.orderNumber },
    })

    return NextResponse.json({ success: true, data: updated, message: i18nText(language, 'تم إرسال بيانات الدفع اليدوي', 'Manual payment details submitted') })
  } catch (error) {
    console.error('Failed to submit manual payment details:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit manual payment details' }, { status: 500 })
  }
}

