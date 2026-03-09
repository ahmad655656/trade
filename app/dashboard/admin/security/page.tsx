'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'

type SecurityEvent = {
  id: string
  type: string
  severity: number
  description: string
  createdAt: string
  user: { name: string; email: string } | null
}

export default function AdminSecurityPage() {
  const { language } = useUi()
  const [events, setEvents] = useState<SecurityEvent[]>([])

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/security-events?take=200', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) setEvents(result.data ?? [])
    }
    void load()
  }, [])

  return (
    <section className="space-y-4">
      <div className="card-pro rounded-xl p-6">
        <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'أحداث الأمان' : 'Security events'}</h2>
        <p className="mt-2 text-muted">{language === 'ar' ? 'رصد السلوكيات المشبوهة ومحاولات الدخول الخطرة.' : 'Monitor suspicious behavior and risky login attempts.'}</p>
      </div>

      <div className="card-pro rounded-xl p-4">
        <div className="space-y-2">
          {events.map((event) => (
            <article key={event.id} className="rounded-lg border border-app p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-app">{event.type}</p>
                <p className="text-xs text-muted">{new Date(event.createdAt).toLocaleString()}</p>
              </div>
              <p className="text-sm text-muted">{event.description}</p>
              <p className="text-xs text-muted">{language === 'ar' ? `الخطورة: ${event.severity}` : `Severity: ${event.severity}`}</p>
              <p className="text-xs text-muted">{event.user ? `${event.user.name} - ${event.user.email}` : '-'}</p>
            </article>
          ))}
          {!events.length && <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد أحداث' : 'No events'}</p>}
        </div>
      </div>
    </section>
  )
}

