'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function DisputePolicyPage() {
  const { language } = useUi()
  return (
    <section className="card-pro space-y-4 rounded-2xl p-8">
      <h1 className="text-3xl font-bold text-app">{language === 'ar' ? 'سياسة النزاعات' : 'Dispute Policy'}</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-4">{language === 'ar' ? 'متى نفتح نزاع؟' : 'When to Open Dispute?'}</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>• {language === 'ar' ? 'المنتجات لا تطابق الوصف' : 'Goods do not match description'}</li>
            <li>• {language === 'ar' ? 'ضرر في الشحنة' : 'Damaged shipment'}</li>
            <li>• {language === 'ar' ? 'نقص في الكمية' : 'Missing items'}</li>
            <li>• {language === 'ar' ? 'تأخير غير مبرر' : 'Unreasonable delay'}</li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">{language === 'ar' ? 'كيفية التعامل' : 'How It Works'}</h2>
          <ol className="space-y-2 text-sm text-muted list-decimal pl-4">
            <li>{language === 'ar' ? 'افتح نزاعاً خلال 7 أيام من التسليم' : 'Open within 7 days of delivery'}</li>
            <li>{language === 'ar' ? 'أرفق صور/فيديو ووصف مفصل' : 'Attach photos/video & detailed description'}</li>
            <li>{language === 'ar' ? 'الطرف الآخر يرد خلال 48 ساعة' : 'Other party responds within 48hrs'}</li>
            <li>{language === 'ar' ? 'الإدارة تحكم خلال 3-5 أيام' : 'Admin decides within 3-5 days'}</li>
          </ol>
        </div>
      </div>
      <div className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <h2 className="text-lg font-semibold mb-3 text-amber-800">{language === 'ar' ? 'مهم' : 'Important'}</h2>
        <p className="text-sm text-amber-700">
          {language === 'ar' 
            ? 'قرار الإدارة نهائي. النزاعات المتكررة قد تؤثر على الحساب.'
            : 'Admin decision is final. Repeated disputes may affect account status.'}
        </p>
      </div>
      <ul className="space-y-2 text-sm text-muted">
        <li>{language === 'ar' ? 'يجب إرفاق وصف واضح وأدلة مرئية عند فتح النزاع.' : 'Provide clear description and evidence when opening a dispute.'}</li>
        <li>{language === 'ar' ? 'حالات النزاع: مفتوح، قيد المراجعة، محلول، مرفوض.' : 'Statuses: Open, Under Review, Resolved, Rejected.'}</li>
        <li>{language === 'ar' ? 'قرار الإدارة نهائي ضمن شروط المنصة.' : 'Admin resolution is final under platform terms.'}</li>
      </ul>
    </section>
  )
}

