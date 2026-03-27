'use client'

import { useUi } from '@/components/providers/UiProvider'

const faqItems = [
  {
    id: 'who',
    arQ: 'لمن هذه المنصة؟',
    enQ: 'Who is this platform for?',
    arA: 'مخصصة لأصحاب المحال التجارية والموردين الذين يريدون طريقة سهلة للتعامل.',
    enA: 'Built for store owners and suppliers who want an easy way to work together.',
  },
  {
    id: 'start',
    arQ: 'كيف أبدأ؟',
    enQ: 'How do I start?',
    arA: 'سجّل حسابك، اختر نوعك، ثم اتبع الخطوات الظاهرة أمامك.',
    enA: 'Create an account, choose your role, then follow the on-screen steps.',
  },
  {
    id: 'support',
    arQ: 'هل يوجد دعم؟',
    enQ: 'Is support available?',
    arA: 'نعم، يمكنك التواصل معنا في أي وقت وسنرد سريعًا.',
    enA: 'Yes, you can contact us anytime and we respond quickly.',
  },
]

export default function FaqPage() {
  const { language } = useUi()
  const isArabic = language === 'ar'

  return (
    <section className="card-pro space-y-4 rounded-2xl p-8">
      <h1 className="text-3xl font-bold text-app">{isArabic ? 'الأسئلة الشائعة' : 'FAQ'}</h1>
      <p className="text-muted">
        {isArabic ? 'إجابات مختصرة وواضحة لأهم الأسئلة.' : 'Short, clear answers to common questions.'}
      </p>

      <div className="space-y-4">
        {faqItems.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-sm font-semibold text-app">
              {isArabic ? item.arQ : item.enQ}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {isArabic ? item.arA : item.enA}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
