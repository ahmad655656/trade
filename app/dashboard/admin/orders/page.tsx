'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import { orderStatusLabel, paymentStatusLabel } from '@/lib/order-labels'

type AdminOrder = {
  id: string
  orderNumber: string
  totalAmount: number
  status: string
  paymentStatus: string
  createdAt: string
  payment: {
    refundReason: string | null
  } | null
  trader: { user: { name: string; email: string } }
  items: Array<{ supplier: { user: { name: string; email: string } } }>
}

export default function AdminOrdersPage() {
  const { language } = useUi()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const loadOrders = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/orders', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) setOrders(result.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const pendingManual = useMemo(() => orders.filter((o) => o.paymentStatus === 'PENDING'), [orders])

  const verifyPayment = async (orderId: string, approved: boolean) => {
    if (!approved) {
      const confirmed = window.confirm(language === 'ar' ? 'تأكيد رفض الدفع لهذا الطلب؟' : 'Confirm rejecting payment for this order?')
      if (!confirmed) return
    }

    setProcessingId(orderId)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify({ approved }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to verify payment')
      }

      toast.success(approved ? (language === 'ar' ? 'تم قبول الدفع وتحويل الطلب للمورد' : 'Payment approved and sent to supplier') : language === 'ar' ? 'تم رفض الدفع وإلغاء الطلب' : 'Payment rejected and order cancelled')
      await loadOrders()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل العملية' : 'Operation failed')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="card-pro rounded-xl p-6">
        <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'اعتماد دفع عمولة المنصة للطلبات' : 'Platform-fee payment verification for orders'}</h2>
        <p className="mt-2 text-muted">
          {language === 'ar' ? 'راجع تحويل عمولة المنصة عبر سيرياتيل كاش ثم وافق/ارفض.' : 'Verify manual Syriatel Cash platform-fee transfer then approve/reject.'}
        </p>
      </div>

      <div className="card-pro rounded-xl p-4">
        <p className="text-sm text-muted">{language === 'ar' ? 'طلبات بانتظار الاعتماد' : 'Orders awaiting verification'}: {pendingManual.length}</p>
      </div>

      <div className="card-pro rounded-xl p-4">
        {loading ? (
          <p className="text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد طلبات.' : 'No orders yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-app text-muted">
                  <th className="p-2 text-start">{language === 'ar' ? 'الطلب' : 'Order'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'التاجر' : 'Trader'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'المورد' : 'Supplier'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'حالة الدفع' : 'Payment'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'بيانات عمولة المنصة' : 'Platform fee details'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  (() => {
                    let manual: {
                      senderPhone?: string
                      transferTo?: string
                      receiptUrl?: string
                      submittedAt?: string
                    } | null = null
                    try {
                      manual = order.payment?.refundReason ? JSON.parse(order.payment.refundReason) : null
                    } catch {
                      manual = null
                    }

                    return (
                  <tr key={order.id} className="border-b border-app/50">
                    <td className="p-2 font-medium text-app">{order.orderNumber}</td>
                    <td className="p-2 text-muted">{order.trader.user.name}</td>
                    <td className="p-2 text-muted">{order.items[0]?.supplier.user.name ?? '-'}</td>
                    <td className="p-2 text-muted">{formatSypAmount(order.totalAmount, language)}</td>
                    <td className="p-2 text-muted">{paymentStatusLabel(order.paymentStatus, language)}</td>
                    <td className="p-2 text-muted">{orderStatusLabel(order.status, language)}</td>
                    <td className="p-2 text-muted">
                      {manual?.submittedAt ? (
                        <div className="space-y-1 text-xs">
                          <p>{language === 'ar' ? `المرسل: ${manual.senderPhone || '-'}` : `Sender: ${manual.senderPhone || '-'}`}</p>
                          <p>{language === 'ar' ? `المحوّل إليه: ${manual.transferTo || '-'}` : `Transfer to: ${manual.transferTo || '-'}`}</p>
                          <p>{new Date(manual.submittedAt).toLocaleString()}</p>
                          <p className="text-[11px] opacity-80">
                            {language === 'ar' ? 'تحقق من الاسم/الرقم/الصورة ثم اعتمد عمولة المنصة أو ارفضها.' : 'Check sender/number/receipt image then approve or reject platform fee.'}
                          </p>
                          {manual.receiptUrl ? (
                            <a
                              className="text-[var(--app-primary)] underline"
                              href={manual.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {language === 'ar' ? 'عرض الوصل' : 'View receipt'}
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs">{language === 'ar' ? 'لم يرسل الوصل بعد' : 'No receipt submitted yet'}</span>
                      )}
                    </td>
                    <td className="p-2">
                      {order.paymentStatus === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button
                            className="btn-primary !rounded-md !px-2 !py-1 text-xs disabled:opacity-60"
                            onClick={() => verifyPayment(order.id, true)}
                            disabled={processingId === order.id}
                          >
                            {language === 'ar' ? 'اعتماد العمولة' : 'Approve fee'}
                          </button>
                          <button
                            className="btn-secondary !rounded-md !px-2 !py-1 text-xs disabled:opacity-60"
                            onClick={() => verifyPayment(order.id, false)}
                            disabled={processingId === order.id}
                          >
                            {language === 'ar' ? 'رفض العمولة' : 'Reject fee'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">{language === 'ar' ? 'تمت المعالجة' : 'Processed'}</span>
                      )}
                    </td>
                  </tr>
                    )
                  })()
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
