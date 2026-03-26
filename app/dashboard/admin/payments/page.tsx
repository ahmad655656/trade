'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type PaymentRow = {
  id: string
  amount: number
  status: string
  method: string
  createdAt: string
  transactionId?: string | null
  manualPayment?: {
    receiptUrl?: string
  } | null
  order?: {
    orderNumber: string
    trader?: { user?: { name: string } }
  } | null
}

export default function AdminPaymentsPage() {
  const { language } = useUi()
  const [items, setItems] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/admin/payments', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) {
          setItems(result.data || [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="card-pro p-5">
        <h1 className="text-lg font-semibold text-app">{language === 'ar' ? 'إدارة المدفوعات' : 'Payments management'}</h1>
        <p className="mt-1 text-sm text-muted">
          {language === 'ar' ? 'عرض جميع مدفوعات المنصة.' : 'View all platform payments.'}
        </p>
      </div>

      {loading ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : items.length === 0 ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'لا توجد مدفوعات حالياً.' : 'No payments found.'}</div>
      ) : (
        <div className="card-pro p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-app text-muted">
                <th className="p-2 text-start">{language === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'التاجر' : 'Trader'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الطريقة' : 'Method'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'إيصال' : 'Receipt'}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((payment) => (
                <tr key={payment.id} className="border-b border-app/50">
                  <td className="p-2 font-medium text-app">{payment.order?.orderNumber || '-'}</td>
                  <td className="p-2 text-muted">{payment.order?.trader?.user?.name || '-'}</td>
                  <td className="p-2 text-muted">{formatSypAmount(payment.amount, language)}</td>
                  <td className="p-2 text-muted">{payment.status}</td>
                  <td className="p-2 text-muted">{payment.method}</td>
                  <td className="p-2 text-muted">{payment.manualPayment?.receiptUrl ? (language === 'ar' ? 'متوفر' : 'Available') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
