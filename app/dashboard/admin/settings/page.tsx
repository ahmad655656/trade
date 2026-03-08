'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function AdminSettingsPage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'إعدادات المنصة',
      description: 'ضبط وسائل الدفع وقواعد الشحن والسياسات العامة للمنصة.',
    },
    en: {
      title: 'Platform Settings',
      description: 'Configure payment methods, shipping rules, and global policies.',
    },
  }

  return (
    <section className="card-pro rounded-xl p-6">
      <h2 className="text-xl font-semibold text-app">{content[language].title}</h2>
      <p className="mt-2 text-muted">{content[language].description}</p>
    </section>
  )
}
