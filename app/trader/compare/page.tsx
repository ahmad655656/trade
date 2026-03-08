'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function TraderComparePage() {
  const { language } = useUi()
  return (
    <section className="card-pro rounded-xl p-6">
      <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'مقارنة المنتجات' : 'Product Compare'}</h2>
      <p className="mt-2 text-muted">{language === 'ar' ? 'صفحة المقارنة ستدعم إضافة/إزالة المنتجات وجدول المواصفات في المرحلة التالية.' : 'Compare page with add/remove and specs table will be delivered in the next phase.'}</p>
    </section>
  )
}
