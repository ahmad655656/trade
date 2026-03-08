'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function AdminReportsPage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'التقارير المالية',
      description: 'مراجعة المبيعات والعمولات والسحوبات ومؤشرات المخاطر.',
    },
    en: {
      title: 'Financial Reports',
      description: 'Review sales, commissions, withdrawals, and risk metrics.',
    },
  }

  return (
    <section className="card-pro rounded-xl p-6">
      <h2 className="text-xl font-semibold text-app">{content[language].title}</h2>
      <p className="mt-2 text-muted">{content[language].description}</p>
    </section>
  )
}
