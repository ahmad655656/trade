export type AppLanguage = 'ar' | 'en'

export function orderStatusLabel(status: string, language: AppLanguage) {
  const labels: Record<string, { ar: string; en: string }> = {
    PENDING_PLATFORM_FEE_PAYMENT: { ar: 'بانتظار دفع عمولة المنصة', en: 'Pending platform fee payment' },
    WAITING_FOR_PAYMENT_VERIFICATION: { ar: 'بانتظار التحقق من الدفع', en: 'Waiting for payment verification' },
    PLATFORM_FEE_CONFIRMED: { ar: 'تم تأكيد عمولة المنصة', en: 'Platform fee confirmed' },
    WAITING_FOR_ADMIN_REVIEW: { ar: 'بانتظار مراجعة الإدارة', en: 'Waiting for admin review' },
    ADMIN_APPROVED: { ar: 'تم اعتماد الإدارة', en: 'Admin approved' },
    ADMIN_REJECTED: { ar: 'تم رفض الطلب من الإدارة', en: 'Admin rejected' },
    SUPPLIER_PREPARING_ORDER: { ar: 'المورد يجهز الطلب', en: 'Supplier preparing order' },
    AWAITING_DELIVERY_CONFIRMATION: { ar: 'بانتظار تأكيد الاستلام', en: 'Awaiting delivery confirmation' },
    ORDER_CLOSED: { ar: 'تم إغلاق الطلب', en: 'Order closed' },
    PAYMENT_REJECTED: { ar: 'تم رفض الدفع', en: 'Payment rejected' },
    DISPUTE_OPENED: { ar: 'نزاع مفتوح', en: 'Dispute opened' },
    PENDING: { ar: 'قيد المراجعة', en: 'Pending review' },
    CONFIRMED: { ar: 'مؤكد', en: 'Confirmed' },
    PROCESSING: { ar: 'قيد التجهيز', en: 'Processing' },
    SHIPPED: { ar: 'تم الشحن', en: 'Shipped' },
    DELIVERED: { ar: 'تم التسليم', en: 'Delivered' },
    SUPPLIER_PAYMENT_CONFIRMED: { ar: 'تم تأكيد استلام المال من التاجر', en: 'Supplier confirmed payment received' },
    COMPLETED: { ar: 'مكتمل', en: 'Completed' },
    CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
    REFUNDED: { ar: 'مسترجع', en: 'Refunded' },
  }
  const item = labels[status]
  return item ? item[language] : status
}

export function paymentStatusLabel(status: string, language: AppLanguage) {
  const labels: Record<string, { ar: string; en: string }> = {
    PENDING: { ar: 'بانتظار الاعتماد', en: 'Pending approval' },
    PAID: { ar: 'مدفوع', en: 'Paid' },
    FAILED: { ar: 'مرفوض', en: 'Rejected' },
    REFUNDED: { ar: 'مسترجع', en: 'Refunded' },
    PARTIALLY_REFUNDED: { ar: 'استرجاع جزئي', en: 'Partially refunded' },
  }
  const item = labels[status]
  return item ? item[language] : status
}

export function shippingStatusLabel(status: string, language: AppLanguage) {
  const labels: Record<string, { ar: string; en: string }> = {
    PENDING: { ar: 'بانتظار الشحن', en: 'Pending shipment' },
    PROCESSING: { ar: 'قيد التحضير', en: 'Preparing' },
    SHIPPED: { ar: 'تم الشحن', en: 'Shipped' },
    IN_TRANSIT: { ar: 'في الطريق', en: 'In transit' },
    OUT_FOR_DELIVERY: { ar: 'خرج للتسليم', en: 'Out for delivery' },
    DELIVERED: { ar: 'تم التسليم', en: 'Delivered' },
    FAILED: { ar: 'فشل الشحن', en: 'Shipping failed' },
    CANCELLED: { ar: 'تم الإلغاء', en: 'Cancelled' },
  }
  const item = labels[status]
  return item ? item[language] : status
}
