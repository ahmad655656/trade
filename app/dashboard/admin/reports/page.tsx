'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function AdminReportsPage() {
  const { language } = useUi()

  return (
    <div className="space-y-4">
      <div className="card-pro p-5">
        <h1 className="text-lg font-semibold text-app">{language === 'ar' ? 'التقارير المالية' : 'Financial reports'}</h1>
        <p className="mt-1 text-sm text-muted">
          {language === 'ar'
            ? 'هذه الصفحة جاهزة للربط مع تقارير الإيرادات والمبيعات.'
            : 'This page is ready to connect to revenue and sales reports.'}
        </p>
      </div>

      <div className="card-pro p-5 text-sm text-muted">
        {language === 'ar'
          ? 'لم يتم تجهيز بيانات التقارير بعد. يمكننا ربطها بواجهات API عند توفرها.'
          : 'Report data is not wired yet. We can connect it once the APIs are ready.'}
      </div>
    </div>
  )
}
