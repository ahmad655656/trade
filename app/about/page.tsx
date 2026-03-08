'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function AboutPage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'عن المنصة',
      description: 'منصة B2B احترافية تربط التجار بالموردين مع تجربة آمنة وموثوقة لإدارة العمليات التجارية.',
    },
    en: {
      title: 'About Platform',
      description: 'A professional B2B marketplace connecting traders and suppliers through secure and reliable operations.',
    },
  }

  return (
    <section className="card-pro space-y-4 rounded-2xl p-8">
      <h1 className="text-3xl font-bold text-app">{content[language].title}</h1>
      <p className="text-muted">{content[language].description}</p>
    </section>
  )
}
