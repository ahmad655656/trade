'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function SupplierAgreementPage() {
  const { language } = useUi()
  return (
    <section className="card-pro space-y-4 rounded-2xl p-8">
      <h1 className="text-3xl font-bold text-app">{language === 'ar' ? 'اتفاقية المورد' : 'Supplier Agreement'}</h1>
      <p className="text-sm text-muted">
        {language === 'ar'
          ? 'تنظم هذه الاتفاقية مسؤوليات المورد بشأن دقة المنتج، الالتزام بالشحن، والاستجابة للنزاعات.'
          : 'This agreement defines supplier responsibilities for product accuracy, shipping commitment, and dispute handling.'}
      </p>
      <ul className="space-y-2 text-sm text-muted">
        <li>{language === 'ar' ? 'يلتزم المورد بتوفير وصف دقيق وكميات حقيقية.' : 'Supplier must provide accurate descriptions and stock.'}</li>
        <li>{language === 'ar' ? 'يجب تحديث حالة الطلبات والشحن بشكل فوري.' : 'Order/shipping statuses must be updated promptly.'}</li>
        <li>{language === 'ar' ? 'توثيق المورد (KYC) شرط لظهور شارة المورد الموثق.' : 'KYC completion is required for the verified supplier badge.'}</li>
      </ul>
    </section>
  )
}

