'use client'

import { useUi } from '@/components/providers/UiProvider'
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_ADDRESS } from '@/lib/constants'

export default function ContactPage() {
  const { language } = useUi()
  const isArabic = language === 'ar'
  const phoneHref = `tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`

  return (
    <section className="card-pro space-y-4 rounded-2xl p-8">
      <h1 className="text-3xl font-bold text-app">{isArabic ? 'اتصل بنا' : 'Contact Us'}</h1>
      <p className="text-muted">
        {isArabic
          ? 'نحن هنا لمساعدتك في أي خطوة. تواصل معنا مباشرة.'
          : 'We are here to help at any step. Reach out directly.'}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <a href={`mailto:${SUPPORT_EMAIL}`} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-muted" dir="ltr">
          {SUPPORT_EMAIL}
        </a>
        <a href={phoneHref} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-muted" dir="ltr">
          {SUPPORT_PHONE}
        </a>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-muted">
          {SUPPORT_ADDRESS}
        </div>
      </div>
    </section>
  )
}
