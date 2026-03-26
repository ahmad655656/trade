'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'

type SecurityRow = {
  id: string
  type: string
  severity: number
  description: string
  createdAt: string
  user?: { name: string; email: string; role: string } | null
}

export default function AdminSecurityPage() {
  const { language } = useUi()
  const [items, setItems] = useState<SecurityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/admin/security-events?take=200', { cache: 'no-store' })
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
        <h1 className="text-lg font-semibold text-app">{language === 'ar' ? 'أحداث الأمان' : 'Security events'}</h1>
        <p className="mt-1 text-sm text-muted">
          {language === 'ar' ? 'رصد الأحداث الأمنية والتنبيه المبكر.' : 'Monitor security events and alerts.'}
        </p>
      </div>

      {loading ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : items.length === 0 ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'لا توجد أحداث حالياً.' : 'No events found.'}</div>
      ) : (
        <div className="card-pro p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-app text-muted">
                <th className="p-2 text-start">{language === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الخطورة' : 'Severity'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'المستخدم' : 'User'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((event) => (
                <tr key={event.id} className="border-b border-app/50">
                  <td className="p-2 text-muted">{event.type}</td>
                  <td className="p-2 text-muted">{event.severity}</td>
                  <td className="p-2 text-muted">{event.description}</td>
                  <td className="p-2 text-muted">{event.user?.name || '-'}</td>
                  <td className="p-2 text-muted">{new Date(event.createdAt).toLocaleString(language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
