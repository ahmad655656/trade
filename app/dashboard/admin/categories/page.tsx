'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function AdminCategoriesPage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'التصنيفات',
      description: 'إدارة التصنيفات الرئيسية والفرعية لجميع المنتجات داخل المنصة.',
    },
    en: {
      title: 'Categories',
      description: 'Manage main and sub-categories for all products.',
    },
  }

  return (
    <section className="card-pro rounded-xl p-6">
      <h2 className="text-xl font-semibold text-app">{content[language].title}</h2>
      <p className="mt-2 text-muted">{content[language].description}</p>
    </section>
  )
}
