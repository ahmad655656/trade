'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function AboutPage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'رؤيتنا: منصة التجارة B2B المتقدمة',
      description: 'صممنا هذه المنصة لتكون الحل الشامل لاحتياجات التجارة بين الشركات في المنطقة، مع التركيز على الأمان، الكفاءة، والشراكات الاستراتيجية المستدامة.',
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
