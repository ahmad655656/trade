'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import { orderStatusLabel, paymentStatusLabel } from '@/lib/order-labels'

type PaymentDetails = {
  id: string
  amount: number
  status: string
  createdAt: string
  paidAt: string | null
  orderId: string
  order: {
    id: string
    orderNumber: string
    totalAmount: number
    status: string
    paymentStatus: string
    createdAt: string
    trader: { user: { name: string; email: string; phone: string | null } }
    items: Array<{
      id: string
      quantity: number
      price: number
      total: number
      product: { nameAr: string | null; nameEn: string | null }
      supplier: { user: { name: string; email: string; phone: string | null } }
    }>
  }
  manualPayment: {
    senderPhone?: string
    transferTo?: string
    receiptUrl?: string
    notes?: string | null
    submittedAt?: string
  } | null
}

export default function AdminPaymentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { language } = useUi()
  const { id } = use(params)
  const [details, setDetails] = useState<PaymentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/payments/${id}`, { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to load payment')
        setDetails(result.data)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحميل التفاصيل' : 'Failed to load details')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id, language])

  const processPayment = async (approved: boolean) => {
    if (!details) return
    setProcessing(true)
    try {
      const notes =
        !approved && language === 'ar'
          ? window.prompt('سبب رفض الدفع (اختياري)') ?? ''
          : !approved
            ? window.prompt('Rejection reason (optional)') ?? ''
            : ''

      const response = await fetch(`/api/admin/orders/${details.order.id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify({ approved, notes }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to process payment')

      toast.success(
        approved
          ? language === 'ar'
            ? 'تم اعتماد الدفع'
            : 'Payment approved'
          : language === 'ar'
            ? 'تم رفض الدفع'
            : 'Payment rejected',
      )

      const refresh = await fetch(`/api/admin/payments/${id}`, { cache: 'no-store' })
      const refreshResult = await refresh.json()
      if (refresh.ok && refreshResult.success) setDetails(refreshResult.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل العملية' : 'Operation failed')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <section className="card-pro rounded-xl p-6 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</section>
  }

  if (!details) {
    return <section className="card-pro rounded-xl p-6 text-sm text-muted">{language === 'ar' ? 'لم يتم العثور على الدفعة' : 'Payment not found'}</section>
  }

  return (
    <section className="space-y-4">
      <div className="card-pro rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-app">
              {language === 'ar' ? 'تفاصيل الدفعة' : 'Payment details'} - {details.order.orderNumber}
            </h2>
            <p className="text-sm text-muted">
              {paymentStatusLabel(details.status, language)} | {orderStatusLabel(details.order.status, language)}
            </p>
          </div>
          <Link href="/dashboard/admin/payments" className="btn-secondary !rounded-lg !px-3 !py-2 text-sm">
            {language === 'ar' ? 'العودة للمدفوعات' : 'Back to payments'}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="card-pro rounded-xl p-4 xl:col-span-2 space-y-3">
          <h3 className="font-semibold text-app">{language === 'ar' ? 'معلومات التحويل اليدوي' : 'Manual transfer details'}</h3>
          <p className="text-sm text-muted">{language === 'ar' ? `المرسل: ${details.manualPayment?.senderPhone || '-'}` : `Sender: ${details.manualPayment?.senderPhone || '-'}`}</p>
          <p className="text-sm text-muted">{language === 'ar' ? `المحوّل إليه: ${details.manualPayment?.transferTo || '-'}` : `Transfer to: ${details.manualPayment?.transferTo || '-'}`}</p>
          <p className="text-sm text-muted">{language === 'ar' ? `وقت الإرسال: ${details.manualPayment?.submittedAt ? new Date(details.manualPayment.submittedAt).toLocaleString() : '-'}` : `Submitted at: ${details.manualPayment?.submittedAt ? new Date(details.manualPayment.submittedAt).toLocaleString() : '-'}`}</p>
          <p className="text-sm text-muted">{language === 'ar' ? `ملاحظات التاجر: ${details.manualPayment?.notes || '-'}` : `Trader notes: ${details.manualPayment?.notes || '-'}`}</p>

          {details.manualPayment?.receiptUrl ? (
            <div className="rounded-lg border border-app p-3">
              <a href={details.manualPayment.receiptUrl} target="_blank" rel="noreferrer" className="text-[var(--app-primary)] underline">
                {language === 'ar' ? 'فتح الوصل بحجم كامل' : 'Open full-size receipt'}
              </a>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={details.manualPayment.receiptUrl} alt="receipt" className="mt-2 max-h-[420px] w-full rounded-lg object-contain" />
            </div>
          ) : (
            <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد صورة وصل' : 'No receipt image'}</p>
          )}
        </article>

        <article className="card-pro rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-app">{language === 'ar' ? 'ملخص الطلب' : 'Order summary'}</h3>
          <p className="text-sm text-muted">{language === 'ar' ? `التاجر: ${details.order.trader.user.name}` : `Trader: ${details.order.trader.user.name}`}</p>
          <p className="text-sm text-muted">{language === 'ar' ? `البريد: ${details.order.trader.user.email}` : `Email: ${details.order.trader.user.email}`}</p>
          <p className="text-sm text-muted">{language === 'ar' ? `المبلغ: ${formatSypAmount(details.amount, language)}` : `Amount: ${formatSypAmount(details.amount, language)}`}</p>
          <p className="text-sm text-muted">{language === 'ar' ? `تاريخ الدفعة: ${new Date(details.createdAt).toLocaleString()}` : `Payment date: ${new Date(details.createdAt).toLocaleString()}`}</p>
          <div className="space-y-2">
            {details.order.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-app p-2 text-xs text-muted">
                <p className="font-semibold text-app">{language === 'ar' ? item.product.nameAr || item.product.nameEn : item.product.nameEn || item.product.nameAr}</p>
                <p>{language === 'ar' ? `المورد: ${item.supplier.user.name}` : `Supplier: ${item.supplier.user.name}`}</p>
                <p>{item.quantity} x {formatSypAmount(item.price, language)} = {formatSypAmount(item.total, language)}</p>
              </div>
            ))}
          </div>

          {details.status === 'PENDING' ? (
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60" disabled={processing} onClick={() => processPayment(true)}>
                {language === 'ar' ? 'اعتماد الدفع' : 'Approve payment'}
              </button>
              <button className="btn-secondary !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60" disabled={processing} onClick={() => processPayment(false)}>
                {language === 'ar' ? 'رفض الدفع' : 'Reject payment'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">{language === 'ar' ? 'تمت معالجة هذه الدفعة مسبقًا' : 'This payment is already processed'}</p>
          )}
        </article>
      </div>
    </section>
  )
}
