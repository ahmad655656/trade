'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function AdminSuppliersPage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'توثيق الموردين',
      description: 'مراجعة المستندات التجارية والبيانات الضريبية وحالة التوثيق.',
    },
    en: {
      title: 'Supplier Verification',
      description: 'Review commercial documents, tax data, and verification status.',
    },
  }

  return (
    <section className="card-pro rounded-xl p-6">
      <h2 className="text-xl font-semibold text-app">{content[language].title}</h2>
      <p className="mt-2 text-muted">{content[language].description}</p>
    </section>
  )
}
