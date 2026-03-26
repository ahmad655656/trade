'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function AdminSettingsPage() {
  const { language } = useUi()

  return (
    <div className="space-y-4">
      <div className="card-pro p-5">
        <h1 className="text-lg font-semibold text-app">{language === 'ar' ? 'إعدادات المنصة' : 'Platform settings'}</h1>
        <p className="mt-1 text-sm text-muted">
          {language === 'ar'
            ? 'هذه الصفحة جاهزة لربط إعدادات عامة مثل عمولة المنصة والحدود.'
            : 'This page is ready to connect general settings like commission and limits.'}
        </p>
      </div>

      <div className="card-pro p-5 text-sm text-muted">
        {language === 'ar'
          ? 'واجهة الإعدادات غير مربوطة ببيانات بعد. يمكنني ربطها بجدول الإعدادات عند طلبك.'
          : 'Settings UI is not wired to data yet. I can connect it to the settings table when requested.'}
      </div>
    </div>
  )
}
