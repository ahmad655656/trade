'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'

type DisputeItem = {
  id: string
  reason: string
  status: string
  openedAt: string
  order: { orderNumber: string }
  trader: { user: { name: string } }
  supplier: { user: { name: string } } | null
}

export default function AdminDisputesPage() {
  const { language } = useUi()
  const [items, setItems] = useState<DisputeItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/admin/disputes', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) setItems(result.data ?? [])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <section className="space-y-4">
      <div className="card-pro rounded-xl p-6">
        <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'إدارة النزاعات' : 'Dispute management'}</h2>
        <p className="mt-2 text-muted">{language === 'ar' ? 'مراجعة النزاعات المفتوحة والتدخل الإداري.' : 'Review open disputes and perform admin intervention.'}</p>
      </div>

      <div className="card-pro rounded-xl p-4">
        {loading ? (
          <p className="text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
        ) : !items.length ? (
          <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد نزاعات' : 'No disputes'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-app text-muted">
                  <th className="p-2 text-start">{language === 'ar' ? 'الطلب' : 'Order'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'السبب' : 'Reason'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'التاجر' : 'Trader'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'المورد' : 'Supplier'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-app/50">
                    <td className="p-2 text-app">{item.order.orderNumber}</td>
                    <td className="p-2 text-muted">{item.reason}</td>
                    <td className="p-2 text-muted">{item.status}</td>
                    <td className="p-2 text-muted">{item.trader.user.name}</td>
                    <td className="p-2 text-muted">{item.supplier?.user.name || '-'}</td>
                    <td className="p-2 text-muted">{new Date(item.openedAt).toLocaleDateString()}</td>
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

