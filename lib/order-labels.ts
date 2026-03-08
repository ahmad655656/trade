export type AppLanguage = 'ar' | 'en'

export function orderStatusLabel(status: string, language: AppLanguage) {
  const labels: Record<string, { ar: string; en: string }> = {
    PENDING: { ar: 'قيد المراجعة', en: 'Pending review' },
    CONFIRMED: { ar: 'مؤكد', en: 'Confirmed' },
    PROCESSING: { ar: 'قيد التجهيز', en: 'Processing' },
    SHIPPED: { ar: 'تم الشحن', en: 'Shipped' },
    DELIVERED: { ar: 'تم التسليم', en: 'Delivered' },
    COMPLETED: { ar: 'مكتمل', en: 'Completed' },
    CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
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
  }
  const item = labels[status]
  return item ? item[language] : status
}

export function shippingStatusLabel(status: string, language: AppLanguage) {
  const labels: Record<string, { ar: string; en: string }> = {
    PENDING: { ar: 'بانتظار الشحن', en: 'Pending shipment' },
    PROCESSING: { ar: 'قيد التحضير', en: 'Preparing' },
    SHIPPED: { ar: 'قيد الشحن', en: 'In transit' },
    DELIVERED: { ar: 'تم التسليم', en: 'Delivered' },
    CANCELLED: { ar: 'تم الإلغاء', en: 'Cancelled' },
  }
  const item = labels[status]
  return item ? item[language] : status
}

