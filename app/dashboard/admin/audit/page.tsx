'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'

type AuditRow = {
  id: string
  action: string
  entityType: string
  entityId?: string | null
  createdAt: string
  actor?: { name: string; role: string } | null
}

export default function AdminAuditPage() {
  const { language } = useUi()
  const [items, setItems] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/admin/audit-logs?take=200', { cache: 'no-store' })
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
        <h1 className="text-lg font-semibold text-app">{language === 'ar' ? 'سجل التدقيق' : 'Audit logs'}</h1>
        <p className="mt-1 text-sm text-muted">
          {language === 'ar' ? 'تتبع جميع العمليات المهمة داخل المنصة.' : 'Track critical actions across the platform.'}
        </p>
      </div>

      {loading ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : items.length === 0 ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'لا توجد سجلات حالياً.' : 'No logs found.'}</div>
      ) : (
        <div className="card-pro p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-app text-muted">
                <th className="p-2 text-start">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الكيان' : 'Entity'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'المعرّف' : 'Entity ID'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'المنفّذ' : 'Actor'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((log) => (
                <tr key={log.id} className="border-b border-app/50">
                  <td className="p-2 text-muted">{log.action}</td>
                  <td className="p-2 text-muted">{log.entityType}</td>
                  <td className="p-2 text-muted">{log.entityId || '-'}</td>
                  <td className="p-2 text-muted">{log.actor?.name || '-'}</td>
                  <td className="p-2 text-muted">{new Date(log.createdAt).toLocaleString(language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
