'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function SuppliersPage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'الموردون المعتمدون',
      description: 'اكتشف موردين موثّقين مع مؤشرات الثقة والتقييم والنشاط التجاري.',
    },
    en: {
      title: 'Verified Suppliers',
      description: 'Discover verified suppliers with trust signals, ratings, and activity insights.',
    },
  }

  return (
    <section className="card-pro space-y-4 rounded-2xl p-8">
      <h1 className="text-3xl font-bold text-app">{content[language].title}</h1>
      <p className="text-muted">{content[language].description}</p>
    </section>
  )
}
