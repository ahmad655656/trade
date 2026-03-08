'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function TraderWalletPage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'المحفظة',
      description: 'مراقبة الرصيد والإيداعات والاسترجاعات وسجل العمليات.',
    },
    en: {
      title: 'Wallet',
      description: 'Monitor wallet balance, deposits, refunds, and transaction history.',
    },
  }

  return (
    <section className="card-pro rounded-xl p-6">
      <h2 className="text-xl font-semibold text-app">{content[language].title}</h2>
      <p className="mt-2 text-muted">{content[language].description}</p>
    </section>
  )
}
