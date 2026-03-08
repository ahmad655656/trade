import { NextResponse } from 'next/server'
import { NotificationType, PaymentMethod, PaymentStatus, ProductStatus, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { notifyAdmins, notifyUsers } from '@/lib/notifications'
import { getSessionUser } from '@/lib/session'
import { recalculateCartTotals } from '@/lib/cart'
import { getRequestLanguage, i18nText } from '@/lib/request-language'

type CheckoutPayload = {
  senderPhone: string
  transferTo: string
  receiptUrl: string
  notes?: string
}

export async function POST(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const body: CheckoutPayload = await request.json()

    if (!body.senderPhone?.trim() || !body.transferTo?.trim() || !body.receiptUrl?.trim()) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'يجب إدخال رقم المرسل ورقم التحويل وصورة الوصل', 'senderPhone, transferTo and receipt image are required') },
        { status: 400 },
      )
    }

    if (!body.receiptUrl.startsWith('/uploads/receipts/')) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'يجب رفع صورة الوصل من الجهاز أولاً', 'Please upload the receipt image first') },
        { status: 400 },
      )
    }

    const cart = await prisma.cart.findUnique({
      where: { traderId: user.trader.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                supplier: { include: { user: { select: { id: true } } } },
              },
            },
          },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ success: false, error: i18nText(language, 'السلة فارغة', 'Cart is empty') }, { status: 400 })
    }

    for (const item of cart.items) {
      if (item.product.status !== ProductStatus.ACTIVE) {
        return NextResponse.json({ success: false, error: i18nText(language, `المنتج ${item.product.name} غير متاح`, `Product ${item.product.name} is not available`) }, { status: 400 })
      }
      if (item.product.quantity < item.quantity) {
        return NextResponse.json({ success: false, error: i18nText(language, `المخزون غير كافٍ للمنتج ${item.product.name}`, `Insufficient stock for ${item.product.name}`) }, { status: 400 })
      }
    }

    const subtotal = Number(cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0).toFixed(2))
    const shipping = 0
    const tax = 0
    const discount = 0
    const totalAmount = subtotal + shipping + tax - discount
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const manualPaymentPayload = {
      senderPhone: body.senderPhone.trim(),
      transferTo: body.transferTo.trim(),
      receiptUrl: body.receiptUrl.trim(),
      notes: body.notes?.trim() || null,
      submittedAt: new Date().toISOString(),
    }

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          traderId: user.trader!.id,
          subtotal,
          totalAmount,
          shipping,
          tax,
          discount,
          status: 'PENDING',
          paymentStatus: PaymentStatus.PENDING,
          shippingStatus: 'PENDING',
          paymentMethod: 'BANK_TRANSFER',
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              supplierId: item.product.supplierId,
              quantity: item.quantity,
              price: item.price,
              total: Number((item.price * item.quantity).toFixed(2)),
              commission: 0,
              status: 'PENDING',
            })),
          },
          payment: {
            create: {
              amount: totalAmount,
              platformFee: 0,
              supplierAmount: totalAmount,
              status: PaymentStatus.PENDING,
              method: PaymentMethod.BANK_TRANSFER,
              refundReason: JSON.stringify(manualPaymentPayload),
            },
          },
        },
      })

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        })
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })

      return order
    })

    await recalculateCartTotals(cart.id)

    const supplierUserIds = Array.from(new Set(cart.items.map((item) => item.product.supplier.user.id)))

    await notifyAdmins({
      type: NotificationType.ORDER_CREATED,
      title: i18nText(language, `طلب دفع يدوي ${created.orderNumber}`, `Manual payment order ${created.orderNumber}`),
      message: i18nText(
        language,
        `تم إرسال إثبات دفع سيرياتيل كاش. رقم المرسل: ${manualPaymentPayload.senderPhone}، رقم التحويل إليه: ${manualPaymentPayload.transferTo}.`,
        `Trader submitted Syriatel Cash proof. Sender: ${manualPaymentPayload.senderPhone}, transfer to: ${manualPaymentPayload.transferTo}.`,
      ),
      data: {
        orderId: created.id,
        orderNumber: created.orderNumber,
        senderPhone: manualPaymentPayload.senderPhone,
        transferTo: manualPaymentPayload.transferTo,
        receiptUrl: manualPaymentPayload.receiptUrl,
        notes: manualPaymentPayload.notes,
      },
    })

    await notifyUsers({
      userIds: [user.id, ...supplierUserIds],
      type: NotificationType.SYSTEM,
      title: i18nText(language, 'تم إنشاء الطلب', 'Order placed'),
      message: i18nText(
        language,
        `تم إرسال الطلب ${created.orderNumber} وينتظر اعتماد الدفع من الأدمن.`,
        `Order ${created.orderNumber} submitted and pending admin payment verification.`,
      ),
      data: { orderId: created.id, orderNumber: created.orderNumber },
    })

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: i18nText(language, 'تم إنشاء الطلب وبانتظار التحقق اليدوي من الدفع', 'Order placed (manual payment verification required)'),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Failed to checkout:', error)
    return NextResponse.json({ success: false, error: 'Failed to checkout' }, { status: 500 })
  }
}
