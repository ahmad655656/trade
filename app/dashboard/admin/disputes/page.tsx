'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'

type DisputeRow = {
  id: string
  reason: string
  status: string
  openedAt: string
  order?: { orderNumber: string }
  trader?: { user?: { name: string; email: string } }
  supplier?: { user?: { name: string; email: string } }
}

export default function AdminDisputesPage() {
  const { language } = useUi()
  const [items, setItems] = useState<DisputeRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/admin/disputes', { cache: 'no-store' })
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
        <h1 className="text-lg font-semibold text-app">{language === 'ar' ? 'إدارة النزاعات' : 'Disputes management'}</h1>
        <p className="mt-1 text-sm text-muted">
          {language === 'ar' ? 'عرض النزاعات المفتوحة ومعالجتها.' : 'Review and manage dispute cases.'}
        </p>
      </div>

      {loading ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : items.length === 0 ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'لا توجد نزاعات حالياً.' : 'No disputes found.'}</div>
      ) : (
        <div className="card-pro p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-app text-muted">
                <th className="p-2 text-start">{language === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
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
                  <td className="p-2 font-medium text-app">{item.order?.orderNumber || '-'}</td>
                  <td className="p-2 text-muted">{item.reason}</td>
                  <td className="p-2 text-muted">{item.status}</td>
                  <td className="p-2 text-muted">{item.trader?.user?.name || '-'}</td>
                  <td className="p-2 text-muted">{item.supplier?.user?.name || '-'}</td>
                  <td className="p-2 text-muted">{new Date(item.openedAt).toLocaleDateString(language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
