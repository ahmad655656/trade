'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function PrivacyPage() {
  const { language } = useUi()
  return (
    <section className="card-pro space-y-4 rounded-2xl p-8">
      <h1 className="text-3xl font-bold text-app">{language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</h1>
      <p className="text-sm text-muted">
        {language === 'ar'
          ? 'نلتزم بحماية بيانات المستخدمين، واستخدامها فقط لأغراض التشغيل، الأمان، والامتثال القانوني.'
          : 'We protect user data and process it only for operations, security, and legal compliance.'}
      </p>
      <ul className="space-y-2 text-sm text-muted">
        <li>{language === 'ar' ? 'بيانات الدفع اليدوي تستخدم فقط للتحقق الإداري.' : 'Manual payment data is used only for admin verification.'}</li>
        <li>{language === 'ar' ? 'يتم تسجيل الأحداث الأمنية الحساسة لحماية الحسابات.' : 'Sensitive security events are logged to protect accounts.'}</li>
        <li>{language === 'ar' ? 'يمكنك طلب تحديث بياناتك أو حذفها حسب اللوائح المعمول بها.' : 'You may request data updates/removal based on applicable regulations.'}</li>
      </ul>
    </section>
  )
}

