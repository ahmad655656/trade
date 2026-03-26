'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type CommissionTotals = {
  totalOrderValue: number
  totalPlatformFee: number
  pendingCommissions: number
  completedPayments: number
}

type CommissionOrder = {
  id: string
  orderNumber: string
  totalAmount: number
  platformFee: number
  paymentStatus: string
  createdAt: string
  trader?: { user?: { name: string } }
}

export default function AdminCommissionsPage() {
  const { language } = useUi()
  const [totals, setTotals] = useState<CommissionTotals | null>(null)
  const [items, setItems] = useState<CommissionOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/admin/commissions', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) {
          setTotals(result.data?.totals ?? null)
          setItems(result.data?.orders ?? [])
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
        <h1 className="text-lg font-semibold text-app">{language === 'ar' ? 'إدارة العمولات' : 'Commission management'}</h1>
        <p className="mt-1 text-sm text-muted">
          {language === 'ar' ? 'متابعة عمولات المنصة والمدفوعات.' : 'Track platform commissions and payments.'}
        </p>
      </div>

      {totals && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="card-pro p-4">
            <p className="text-sm text-muted">{language === 'ar' ? 'إجمالي قيمة الطلبات' : 'Total order value'}</p>
            <p className="mt-2 text-2xl font-bold text-app">{formatSypAmount(totals.totalOrderValue, language)}</p>
          </div>
          <div className="card-pro p-4">
            <p className="text-sm text-muted">{language === 'ar' ? 'إجمالي عمولة المنصة' : 'Total platform fee'}</p>
            <p className="mt-2 text-2xl font-bold text-app">{formatSypAmount(totals.totalPlatformFee, language)}</p>
          </div>
          <div className="card-pro p-4">
            <p className="text-sm text-muted">{language === 'ar' ? 'عمولات معلّقة' : 'Pending commissions'}</p>
            <p className="mt-2 text-2xl font-bold text-app">{formatSypAmount(totals.pendingCommissions, language)}</p>
          </div>
          <div className="card-pro p-4">
            <p className="text-sm text-muted">{language === 'ar' ? 'مدفوعات مكتملة' : 'Completed payments'}</p>
            <p className="mt-2 text-2xl font-bold text-app">{totals.completedPayments}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : items.length === 0 ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'لا توجد بيانات حالياً.' : 'No data found.'}</div>
      ) : (
        <div className="card-pro p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-app text-muted">
                <th className="p-2 text-start">{language === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'التاجر' : 'Trader'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'عمولة المنصة' : 'Platform fee'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'حالة الدفع' : 'Payment status'}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((order) => (
                <tr key={order.id} className="border-b border-app/50">
                  <td className="p-2 font-medium text-app">{order.orderNumber}</td>
                  <td className="p-2 text-muted">{order.trader?.user?.name || '-'}</td>
                  <td className="p-2 text-muted">{formatSypAmount(order.totalAmount, language)}</td>
                  <td className="p-2 text-muted">{formatSypAmount(order.platformFee, language)}</td>
                  <td className="p-2 text-muted">{order.paymentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
