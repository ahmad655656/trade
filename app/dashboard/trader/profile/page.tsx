'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function TraderProfilePage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'الملف الشخصي والعناوين',
      description: 'إدارة بيانات النشاط التجاري وعناوين الشحن وتفضيلات الدفع.',
    },
    en: {
      title: 'Profile and Addresses',
      description: 'Manage business profile, shipping addresses, and payment preferences.',
    },
  }

  return (
    <section className="card-pro rounded-xl p-6">
      <h2 className="text-xl font-semibold text-app">{content[language].title}</h2>
      <p className="mt-2 text-muted">{content[language].description}</p>
    </section>
  )
}
