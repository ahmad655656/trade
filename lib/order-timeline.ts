import { prisma } from '@/lib/prisma'

type PrismaLike = {
  orderTimelineEvent: {
    create: typeof prisma.orderTimelineEvent.create
  }
}

type LifecycleStatus =
  | 'PENDING_PLATFORM_FEE_PAYMENT'
  | 'WAITING_FOR_PAYMENT_VERIFICATION'
  | 'PLATFORM_FEE_CONFIRMED'
  | 'WAITING_FOR_ADMIN_REVIEW'
  | 'ADMIN_APPROVED'
  | 'ADMIN_REJECTED'
  | 'SUPPLIER_PREPARING_ORDER'
  | 'SHIPPED'
  | 'AWAITING_DELIVERY_CONFIRMATION'
  | 'DELIVERED'
  | 'SUPPLIER_PAYMENT_CONFIRMED'
  | 'ORDER_CLOSED'
  | 'PAYMENT_REJECTED'
  | 'DISPUTE_OPENED'
  | 'CANCELLED'

const statusTitles: Record<LifecycleStatus, { ar: string; en: string }> = {
  PENDING_PLATFORM_FEE_PAYMENT: {
    ar: 'بانتظار دفع عمولة المنصة',
    en: 'Pending platform fee payment',
  },
  WAITING_FOR_PAYMENT_VERIFICATION: {
    ar: 'بانتظار تحقق الدفع',
    en: 'Waiting for payment verification',
  },
  PLATFORM_FEE_CONFIRMED: {
    ar: 'تم تأكيد عمولة المنصة',
    en: 'Platform fee confirmed',
  },
  WAITING_FOR_ADMIN_REVIEW: {
    ar: 'بانتظار مراجعة الإدارة',
    en: 'Waiting for admin review',
  },
  ADMIN_APPROVED: {
    ar: 'تم اعتماد الطلب من الإدارة',
    en: 'Order approved by admin',
  },
  ADMIN_REJECTED: {
    ar: 'تم رفض الطلب من الإدارة',
    en: 'Order rejected by admin',
  },
  SUPPLIER_PREPARING_ORDER: {
    ar: 'المورد يجهز الطلب',
    en: 'Supplier preparing order',
  },
  SHIPPED: {
    ar: 'تم الشحن',
    en: 'Shipped',
  },
  AWAITING_DELIVERY_CONFIRMATION: {
    ar: 'بانتظار تأكيد الاستلام',
    en: 'Awaiting delivery confirmation',
  },
  DELIVERED: {
    ar: 'تم التسليم',
    en: 'Delivered',
  },
  SUPPLIER_PAYMENT_CONFIRMED: {
    ar: 'تم تأكيد استلام المال من التاجر',
    en: 'Supplier confirmed cash payment received',
  },
  ORDER_CLOSED: {
    ar: 'أغلق الطلب',
    en: 'Order closed',
  },
  PAYMENT_REJECTED: {
    ar: 'تم رفض الدفع',
    en: 'Payment rejected',
  },
  DISPUTE_OPENED: {
    ar: 'تم فتح نزاع',
    en: 'Dispute opened',
  },
  CANCELLED: {
    ar: 'تم إلغاء الطلب',
    en: 'Order cancelled',
  },
}

export function orderStatusTitle(status: LifecycleStatus, language: 'ar' | 'en') {
  return statusTitles[status][language]
}

export async function appendOrderTimelineEvent(
  db: PrismaLike,
  params: {
    orderId: string
    status: LifecycleStatus
    actorUserId?: string | null
    language?: 'ar' | 'en'
    note?: string | null
    metadata?: unknown
  },
) {
  const language = params.language ?? 'en'
  await db.orderTimelineEvent.create({
    data: {
      orderId: params.orderId,
      status: params.status,
      title: orderStatusTitle(params.status, language),
      note: params.note || null,
      actorUserId: params.actorUserId || null,
      metadata: (params.metadata as object | undefined) ?? undefined,
    },
  })
}
