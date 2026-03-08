'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function TraderProfilePage() {
  const { language } = useUi()
  return (
    <section className="card-pro rounded-xl p-6">
      <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</h2>
      <p className="mt-2 text-muted">{language === 'ar' ? 'تحديث الملف والأمان وتفضيلات الإشعارات سيتم استكمالها في المرحلة التالية.' : 'Profile, security and notification preferences will be completed in the next phase.'}</p>
    </section>
  )
}
