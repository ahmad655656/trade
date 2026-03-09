'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function TermsPage() {
  const { language } = useUi()
  return (
    <section className="card-pro space-y-4 rounded-2xl p-8">
      <h1 className="text-3xl font-bold text-app">{language === 'ar' ? 'شروط الاستخدام' : 'Terms of Service'}</h1>
      <p className="text-sm text-muted">
        {language === 'ar'
          ? 'باستخدامك المنصة، فإنك توافق على الالتزام بسياسات الطلب والدفع اليدوي والتحقق الإداري ومسؤوليات كل طرف.'
          : 'By using this platform, you agree to order policies, manual-payment verification, and role-specific responsibilities.'}
      </p>
      <ul className="space-y-2 text-sm text-muted">
        <li>{language === 'ar' ? 'يجب أن تكون البيانات المقدمة صحيحة وحديثة.' : 'All provided data must be accurate and current.'}</li>
        <li>{language === 'ar' ? 'أي محاولة احتيال أو تلاعب تعرض الحساب للإيقاف.' : 'Fraudulent activity may result in account suspension.'}</li>
        <li>{language === 'ar' ? 'تخضع النزاعات لقرار الإدارة وفق سياسة النزاعات.' : 'Disputes are managed under the dispute policy and admin decision.'}</li>
      </ul>
    </section>
  )
}

