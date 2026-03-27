'use client'

import Link from 'next/link'
import { useUi } from '@/components/providers/UiProvider'

const steps = [
  {
    id: 'role',
    ar: 'اختر نوعك: تاجر أو مورد.',
    en: 'Choose your role: trader or supplier.',
  },
  {
    id: 'profile',
    ar: 'أكمل بياناتك بخطوات قصيرة.',
    en: 'Complete your profile in short steps.',
  },
  {
    id: 'start',
    ar: 'ابدأ الطلبات أو العروض فورًا.',
    en: 'Start orders or offers right away.',
  },
]

export default function HelpPage() {
  const { language } = useUi()
  const isArabic = language === 'ar'

  return (
    <section className="card-pro space-y-4 rounded-2xl p-8">
      <h1 className="text-3xl font-bold text-app">
        {isArabic ? 'مركز المساعدة' : 'Help Center'}
      </h1>
      <p className="text-muted">
        {isArabic
          ? 'هنا ستجد خطوات واضحة وسريعة للبدء بدون أي تعقيد.'
          : 'Here are clear, quick steps to get started without complexity.'}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-primary)]/10 text-sm font-bold text-[var(--app-primary)]">
              {index + 1}
            </div>
            <p className="mt-3 text-sm text-muted">
              {isArabic ? step.ar : step.en}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-muted">
        {isArabic
          ? 'إذا احتجت مساعدة إضافية، لا تتردد في التواصل معنا مباشرة.'
          : 'If you need extra help, reach out to us directly.'}
      </div>

      <Link href="/register" className="btn-primary inline-flex">
        {isArabic ? 'ابدأ الآن' : 'Get started'}
      </Link>
    </section>
  )
}
