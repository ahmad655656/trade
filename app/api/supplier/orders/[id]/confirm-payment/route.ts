import { NextResponse } from 'next/server'
import { Role, NotificationType } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { appendOrderTimelineEvent } from '@/lib/order-timeline'
import { notifyUsers, notifyAdmins } from '@/lib/notifications'
import { writeAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
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
    const supplier = user.supplier

    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        trader: { 
          include: { 
            user: { select: { id: true, name: true, phone: true, email: true } } 
          } 
        },
        items: {
          include: {
            product: true,
            supplier: { 
              include: { user: { select: { id: true, name: true } } } 
            }
          }
        },
        payment: true
      }
    })

    if (!order) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الطلب غير موجود', 'Order not found') }, { status: 404 })
    }
    if (!order.payment) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'سجل الدفع غير موجود', 'Payment record is missing') },
        { status: 400 },
      )
    }

    // Check if any item belongs to this supplier
    const supplierItems = order.items.filter(item => item.supplierId === supplier.id)
    if (supplierItems.length === 0) {
      return NextResponse.json({ success: false, error: i18nText(language, 'هذا الطلب لا يخصك', 'This order does not belong to you') }, { status: 403 })
    }

    // Only allow after trader confirmed delivery and order is closed but payment not confirmed
    if (!['DELIVERED', 'ORDER_CLOSED'].includes(order.status) || order.supplierPaymentConfirmedAt) {
      return NextResponse.json(
        { 
          success: false, 
          error: i18nText(
            language, 
            'لا يمكن تأكيد استلام المال إلا بعد تأكيد التاجر استلام البضاعة', 
            'Can only confirm payment after trader confirms delivery receipt'
          ) 
        }, 
        { status: 400 }
      )
    }

    const supplierAmount = Number.isFinite(order.payment?.supplierAmount)
      ? order.payment!.supplierAmount
      : Math.max(order.totalAmount - order.platformFee, 0)

    const updated = await prisma.$transaction(async (tx) => {
      // Update order
      const orderUpdated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'SUPPLIER_PAYMENT_CONFIRMED',
          supplierPaymentConfirmedAt: new Date(),
        }
      })

      await appendOrderTimelineEvent(tx, {
        orderId: order.id,
        status: 'SUPPLIER_PAYMENT_CONFIRMED',
        actorUserId: user.id,
        language,
        note: i18nText(
          language,
          'المورد أكد استلام المال نقدياً من التاجر',
          'Supplier confirmed cash payment received from trader'
        )
      })

      // Trigger wallet payout logic (admin approval pending)
      // Create wallet transaction for supplier
      const wallet = await tx.wallet.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
        select: { id: true },
      })

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PURCHASE', // order sale
          amount: supplierAmount,
          description: `طلب #${order.orderNumber}`,
          referenceId: order.id,
          status: 'PENDING' // admin approves payout
        }
      })

      return orderUpdated
    })

    // Notify trader
    await notifyUsers({
      userIds: [order.trader.user.id],
      type: NotificationType.PAYMENT_RECEIVED,
      title: i18nText(language, `تم تأكيد استلام المال لطلب ${order.orderNumber}`, `Payment confirmed for order ${order.orderNumber}`),
      message: i18nText(
        language,
        'لقد أكد المورد استلام المال نقدياً. الطلب أصبح مكتملاً.',
        'Supplier confirmed cash payment receipt. Order is now completed.'
      ),
      data: { orderId: order.id, orderNumber: order.orderNumber }
    })

    // Notify admins for payout approval
    await notifyAdmins({
      type: NotificationType.WITHDRAWAL_COMPLETED,
      title: i18nText(language, `طلب مكتمل يحتاج اعتماد تحويل #${order.orderNumber}`, `Completed order payout pending #${order.orderNumber}`),
      message: i18nText(
        language,
        `المورد ${supplier.companyName} أكد استلام نقود الطلب ${order.orderNumber} من التاجر ${order.trader.companyName}. المبلغ الصافي: ${supplierAmount}`,
        `Supplier ${supplier.companyName} confirmed cash for order ${order.orderNumber} from trader ${order.trader.companyName}. Net: ${supplierAmount}`
      ),
      data: { 
        orderId: order.id, 
        orderNumber: order.orderNumber,
        supplierId: supplier.id,
        amount: supplierAmount
      }
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'SUPPLIER_CONFIRM_PAYMENT_RECEIVED',
      entityType: 'ORDER',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, amount: supplierAmount }
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: i18nText(
        language,
        'تم تأكيد استلام المال وإرسال طلب التحويل للإدارة',
        'Payment confirmed. Payout request sent to admin.'
      )
    }, { status: 200 })

  } catch (error) {
    console.error('Failed to confirm supplier payment:', error)
    return NextResponse.json({ success: false, error: 'Failed to confirm payment' }, { status: 500 })
  }
}
