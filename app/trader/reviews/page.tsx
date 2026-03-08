'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function TraderReviewsPage() {
  const { language } = useUi()
  return (
    <section className="card-pro rounded-xl p-6">
      <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'تقييماتي' : 'My Reviews'}</h2>
      <p className="mt-2 text-muted">{language === 'ar' ? 'ستتم إضافة إدارة التقييمات وربطها بقاعدة البيانات في المرحلة التالية.' : 'Review management and DB integration will be added in the next phase.'}</p>
    </section>
  )
}
