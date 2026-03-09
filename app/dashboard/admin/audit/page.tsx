'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'

type AuditLog = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  createdAt: string
  actor: { name: string; role: string } | null
}

export default function AdminAuditPage() {
  const { language } = useUi()
  const [logs, setLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/audit-logs?take=200', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) setLogs(result.data ?? [])
    }
    void load()
  }, [])

  return (
    <section className="space-y-4">
      <div className="card-pro rounded-xl p-6">
        <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'سجل التدقيق' : 'Audit logs'}</h2>
        <p className="mt-2 text-muted">{language === 'ar' ? 'تتبع جميع العمليات الحساسة في النظام.' : 'Track all sensitive actions across the platform.'}</p>
      </div>

      <div className="card-pro rounded-xl p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-app text-muted">
                <th className="p-2 text-start">{language === 'ar' ? 'الوقت' : 'Time'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الكيان' : 'Entity'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'المنفذ' : 'Actor'}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-app/50">
                  <td className="p-2 text-muted">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="p-2 text-app">{log.action}</td>
                  <td className="p-2 text-muted">{log.entityType} {log.entityId ? `(${log.entityId.slice(0, 8)}...)` : ''}</td>
                  <td className="p-2 text-muted">{log.actor ? `${log.actor.name} (${log.actor.role})` : '-'}</td>
                </tr>
              ))}
              {!logs.length && (
                <tr>
                  <td className="p-2 text-muted" colSpan={4}>{language === 'ar' ? 'لا توجد سجلات بعد' : 'No logs yet'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

