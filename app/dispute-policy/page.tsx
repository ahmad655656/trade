'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function DisputePolicyPage() {
  const { language } = useUi()
  return (
    <section className="card-pro space-y-4 rounded-2xl p-8">
      <h1 className="text-3xl font-bold text-app">{language === 'ar' ? 'سياسة النزاعات' : 'Dispute Policy'}</h1>
      <p className="text-sm text-muted">
        {language === 'ar'
          ? 'يمكن فتح نزاع عند وجود اختلاف في المواصفات، ضرر بالشحنة، أو نقص في الكمية. تتم المراجعة بواسطة الإدارة.'
          : 'Disputes can be opened for mismatched goods, damaged shipments, or missing items. Admin reviews and resolves.'}
      </p>
      <ul className="space-y-2 text-sm text-muted">
        <li>{language === 'ar' ? 'يجب إرفاق وصف واضح وأدلة مرئية عند فتح النزاع.' : 'Provide clear description and evidence when opening a dispute.'}</li>
        <li>{language === 'ar' ? 'حالات النزاع: مفتوح، قيد المراجعة، محلول، مرفوض.' : 'Statuses: Open, Under Review, Resolved, Rejected.'}</li>
        <li>{language === 'ar' ? 'قرار الإدارة نهائي ضمن شروط المنصة.' : 'Admin resolution is final under platform terms.'}</li>
      </ul>
    </section>
  )
}

