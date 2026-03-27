'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function AboutPage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'عن المنصة',
      description: 'منصة بسيطة تربط أصحاب المحال بالموردين لتسهيل الطلبات والعروض بخطوات واضحة للجميع.',
    },
    en: {
      title: 'About the platform',
      description: 'A simple platform connecting store owners and suppliers with clear, easy steps.',
    },
  }

  return (
    <section className="card-pro space-y-4 rounded-2xl p-8">
      <h1 className="text-3xl font-bold text-app">{content[language].title}</h1>
      <p className="text-muted">{content[language].description}</p>
    </section>
  )
}
