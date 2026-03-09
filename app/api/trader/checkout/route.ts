import { NextResponse } from 'next/server'
import { NotificationType, PaymentMethod, ProductStatus, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { notifyAdmins, notifyUsers } from '@/lib/notifications'
import { getSessionUser } from '@/lib/session'
import { recalculateCartTotals } from '@/lib/cart'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { assertSameOrigin } from '@/lib/security'
import { calculatePlatformFee, getPlatformCommissionRate } from '@/lib/commission'
import { appendOrderTimelineEvent } from '@/lib/order-timeline'
import { writeAuditLog } from '@/lib/audit'
import { sanitizePlainText } from '@/lib/sanitize'

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>

type CheckoutPayload = {
  senderPhone: string
  transferTo: string
  receiptUrl: string
  notes?: string
}

type CheckoutCartItem = {
  productId: string
  quantity: number
  price: number
  product: {
    supplierId: string
    name: string
    supplier: { user: { id: string } }
  }
}

export async function POST(request: Request) {
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

    const body: CheckoutPayload = await request.json()
    const senderPhone = sanitizePlainText(body.senderPhone, 30)
    const transferTo = sanitizePlainText(body.transferTo, 30)
    const receiptUrl = sanitizePlainText(body.receiptUrl, 600)
    const notes = sanitizePlainText(body.notes, 2000)

    if (!senderPhone || !transferTo || !receiptUrl) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'يجب إدخال رقم المرسل ورقم التحويل وصورة الوصل', 'senderPhone, transferTo and receipt image are required') },
        { status: 400 },
      )
    }

    if (!receiptUrl.startsWith('/uploads/receipts/')) {
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
        return NextResponse.json(
          { success: false, error: i18nText(language, `المنتج ${item.product.name} غير متاح`, `Product ${item.product.name} is not available`) },
          { status: 400 },
        )
      }
      if (item.product.quantity < item.quantity) {
        return NextResponse.json(
          { success: false, error: i18nText(language, `المخزون غير كاف للمنتج ${item.product.name}`, `Insufficient stock for ${item.product.name}`) },
          { status: 400 },
        )
      }
    }

    const subtotal = Number(
      cart.items.reduce((sum: number, item: CheckoutCartItem) => sum + item.quantity * item.price, 0).toFixed(2),
    )
    const shipping = 0
    const tax = 0
    const discount = 0
    const totalAmount = subtotal + shipping + tax - discount
    const platformCommissionRate = await getPlatformCommissionRate()
    const platformFee = calculatePlatformFee(subtotal, platformCommissionRate)
    const supplierAmount = Number((subtotal - platformFee).toFixed(2))
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const manualPaymentPayload = {
      senderPhone,
      transferTo,
      receiptUrl,
      notes: notes || null,
      submittedAt: new Date().toISOString(),
      purpose: 'PLATFORM_FEE',
    }

    const created = await prisma.$transaction(async (tx: TxClient) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          traderId: user.trader!.id,
          subtotal,
          totalAmount,
          shipping,
          tax,
          discount,
          platformFee,
          platformFeeRate: platformCommissionRate,
          status: 'PENDING_PLATFORM_FEE_PAYMENT',
          paymentStatus: 'PENDING',
          shippingStatus: 'PENDING',
          paymentMethod: 'BANK_TRANSFER',
          items: {
            create: cart.items.map((item: CheckoutCartItem) => ({
              productId: item.productId,
              supplierId: item.product.supplierId,
              quantity: item.quantity,
              price: item.price,
              total: Number((item.price * item.quantity).toFixed(2)),
              commission: Number(((item.price * item.quantity) * platformCommissionRate).toFixed(2)),
              status: 'PENDING',
            })),
          },
          payment: {
            create: {
              purpose: 'PLATFORM_FEE',
              amount: platformFee,
              platformFee,
              supplierAmount,
              status: 'PENDING',
              method: PaymentMethod.BANK_TRANSFER,
              refundReason: JSON.stringify(manualPaymentPayload),
            },
          },
        },
      })

      await appendOrderTimelineEvent(tx, {
        orderId: order.id,
        status: 'PENDING_PLATFORM_FEE_PAYMENT',
        actorUserId: user.id,
        language,
        note: i18nText(language, 'تم إنشاء الطلب وبانتظار دفع عمولة المنصة', 'Order created and waiting for platform fee payment'),
      })

      const movedToVerification = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'WAITING_FOR_PAYMENT_VERIFICATION',
        },
      })

      await appendOrderTimelineEvent(tx, {
        orderId: order.id,
        status: 'WAITING_FOR_PAYMENT_VERIFICATION',
        actorUserId: user.id,
        language,
        note: i18nText(language, 'تم إرسال وصل التحويل وبانتظار اعتماد الإدارة', 'Receipt submitted and waiting admin verification'),
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

      return movedToVerification
    })

    await recalculateCartTotals(cart.id)

    const supplierUserIds = Array.from(new Set(cart.items.map((item: CheckoutCartItem) => item.product.supplier.user.id)))

    await notifyAdmins({
      type: NotificationType.ORDER_CREATED,
      title: i18nText(language, `طلب عمولة منصة ${created.orderNumber}`, `Platform fee order ${created.orderNumber}`),
      message: i18nText(
        language,
        `تم إرسال إثبات عمولة المنصة. المرسل: ${senderPhone}، التحويل إلى: ${transferTo}.`,
        `Platform fee proof submitted. Sender: ${senderPhone}, transfer to: ${transferTo}.`,
      ),
      data: {
        orderId: created.id,
        orderNumber: created.orderNumber,
        senderPhone,
        transferTo,
        receiptUrl,
        platformFee,
      },
    })

    await notifyUsers({
      userIds: [user.id, ...supplierUserIds],
      type: NotificationType.SYSTEM,
      title: i18nText(language, 'تم إنشاء الطلب', 'Order placed'),
      message: i18nText(
        language,
        `تم إنشاء الطلب ${created.orderNumber} وهو بانتظار تحقق عمولة المنصة.`,
        `Order ${created.orderNumber} created and waiting platform fee verification.`,
      ),
      data: { orderId: created.id, orderNumber: created.orderNumber },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'ORDER_CHECKOUT_MANUAL_PLATFORM_FEE',
      entityType: 'ORDER',
      entityId: created.id,
      metadata: {
        orderNumber: created.orderNumber,
        platformFee,
        platformFeeRate: platformCommissionRate,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: i18nText(
          language,
          'تم إنشاء الطلب وإرسال إثبات عمولة المنصة. بانتظار التحقق اليدوي.',
          'Order placed and platform fee proof submitted. Waiting manual verification.',
        ),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Failed to checkout:', error)
    return NextResponse.json({ success: false, error: 'Failed to checkout' }, { status: 500 })
  }
}

