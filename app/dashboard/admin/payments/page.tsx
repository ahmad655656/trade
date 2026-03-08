'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import { paymentStatusLabel } from '@/lib/order-labels'

type PaymentListItem = {
  id: string
  amount: number
  status: string
  transactionId: string | null
  createdAt: string
  paidAt: string | null
  order: {
    id: string
    orderNumber: string
    status: string
    paymentStatus: string
    trader: { user: { name: string; email: string } }
  }
  manualPayment: {
    senderPhone?: string
    transferTo?: string
    receiptUrl?: string
    submittedAt?: string
  } | null
}

export default function AdminPaymentsPage() {
  const { language } = useUi()
  const [payments, setPayments] = useState<PaymentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    hasReceipt: false,
  })

  const loadPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search.trim()) params.set('search', filters.search.trim())
      if (filters.status) params.set('status', filters.status)
      if (filters.hasReceipt) params.set('hasReceipt', '1')

      const response = await fetch(`/api/admin/payments?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to load payments')
      setPayments(result.data ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحميل المدفوعات' : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [filters.hasReceipt, filters.search, filters.status, language])

  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  const stats = useMemo(() => {
    const pending = payments.filter((p) => p.status === 'PENDING').length
    const paid = payments.filter((p) => p.status === 'PAID').length
    const failed = payments.filter((p) => p.status === 'FAILED').length
    const todayTotal = payments
      .filter((p) => new Date(p.createdAt).toDateString() === new Date().toDateString())
      .reduce((sum, p) => sum + p.amount, 0)
    return { pending, paid, failed, todayTotal }
  }, [payments])

  const processPayment = async (payment: PaymentListItem, approved: boolean) => {
    setProcessingId(payment.id)
    try {
      const notes =
        !approved && language === 'ar'
          ? window.prompt('سبب رفض الدفع (اختياري)') ?? ''
          : !approved
            ? window.prompt('Rejection reason (optional)') ?? ''
            : ''

      const response = await fetch(`/api/admin/orders/${payment.order.id}/payment`, {
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
      await loadPayments()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل العملية' : 'Operation failed')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="card-pro rounded-xl p-6">
        <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'إدارة المدفوعات' : 'Payments management'}</h2>
        <p className="mt-2 text-muted">
          {language === 'ar'
            ? 'مراجعة جميع المدفوعات اليدوية، معاينة الوصل، ثم اعتماد أو رفض الدفع.'
            : 'Review manual payments, inspect receipt, then approve or reject.'}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <article className="card-pro rounded-xl p-4">
          <p className="text-xs text-muted">{language === 'ar' ? 'مدفوعات اليوم' : 'Today payments'}</p>
          <p className="mt-1 text-xl font-bold text-app">{formatSypAmount(stats.todayTotal, language)}</p>
        </article>
        <article className="card-pro rounded-xl p-4">
          <p className="text-xs text-muted">{language === 'ar' ? 'معلّقة' : 'Pending'}</p>
          <p className="mt-1 text-xl font-bold text-app">{stats.pending}</p>
        </article>
        <article className="card-pro rounded-xl p-4">
          <p className="text-xs text-muted">{language === 'ar' ? 'مدفوعة' : 'Paid'}</p>
          <p className="mt-1 text-xl font-bold text-app">{stats.paid}</p>
        </article>
        <article className="card-pro rounded-xl p-4">
          <p className="text-xs text-muted">{language === 'ar' ? 'مرفوضة' : 'Rejected'}</p>
          <p className="mt-1 text-xl font-bold text-app">{stats.failed}</p>
        </article>
      </div>

      <div className="card-pro rounded-xl p-4">
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="input-pro"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder={language === 'ar' ? 'بحث برقم الطلب/اسم التاجر' : 'Search by order # / trader'}
          />
          <select className="input-pro" value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="">{language === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            <option value="PENDING">{language === 'ar' ? 'بانتظار الاعتماد' : 'Pending approval'}</option>
            <option value="PAID">{language === 'ar' ? 'مدفوع' : 'Paid'}</option>
            <option value="FAILED">{language === 'ar' ? 'مرفوض' : 'Rejected'}</option>
            <option value="REFUNDED">{language === 'ar' ? 'مسترجع' : 'Refunded'}</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={filters.hasReceipt}
              onChange={(e) => setFilters((prev) => ({ ...prev, hasReceipt: e.target.checked }))}
            />
            {language === 'ar' ? 'مدفوعات مع وصل فقط' : 'Only with receipt'}
          </label>
        </div>
      </div>

      <div className="card-pro rounded-xl p-4">
        {loading ? (
          <p className="text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
        ) : !payments.length ? (
          <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد مدفوعات مطابقة' : 'No matching payments'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-app text-muted">
                  <th className="p-2 text-start">{language === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'التاجر' : 'Trader'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'الوصل' : 'Receipt'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created at'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-app/50">
                    <td className="p-2 font-medium text-app">{payment.order.orderNumber}</td>
                    <td className="p-2 text-muted">{payment.order.trader.user.name}</td>
                    <td className="p-2 text-muted">{formatSypAmount(payment.amount, language)}</td>
                    <td className="p-2 text-muted">{paymentStatusLabel(payment.status, language)}</td>
                    <td className="p-2 text-muted">
                      {payment.manualPayment?.receiptUrl ? (
                        <a href={payment.manualPayment.receiptUrl} className="text-[var(--app-primary)] underline" target="_blank" rel="noreferrer">
                          {language === 'ar' ? 'عرض الوصل' : 'View receipt'}
                        </a>
                      ) : (
                        <span>{language === 'ar' ? 'لا يوجد' : 'None'}</span>
                      )}
                    </td>
                    <td className="p-2 text-muted">{new Date(payment.createdAt).toLocaleString()}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/dashboard/admin/payments/${payment.id}`} className="btn-secondary !rounded-md !px-2 !py-1 text-xs">
                          {language === 'ar' ? 'التفاصيل' : 'Details'}
                        </Link>
                        {payment.status === 'PENDING' ? (
                          <>
                            <button
                              className="btn-primary !rounded-md !px-2 !py-1 text-xs disabled:opacity-60"
                              disabled={processingId === payment.id}
                              onClick={() => processPayment(payment, true)}
                            >
                              {language === 'ar' ? 'اعتماد' : 'Approve'}
                            </button>
                            <button
                              className="btn-secondary !rounded-md !px-2 !py-1 text-xs disabled:opacity-60"
                              disabled={processingId === payment.id}
                              onClick={() => processPayment(payment, false)}
                            >
                              {language === 'ar' ? 'رفض' : 'Reject'}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

