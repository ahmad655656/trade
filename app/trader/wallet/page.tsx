'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function TraderWalletPage() {
  const { language } = useUi()
  return (
    <section className="card-pro rounded-xl p-6">
      <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'المحفظة والرصيد' : 'Wallet & Balance'}</h2>
      <p className="mt-2 text-muted">{language === 'ar' ? 'سيتم ربط تفاصيل المحفظة والمعاملات في المرحلة التالية.' : 'Wallet transactions and top-up flow will be connected in the next phase.'}</p>
    </section>
  )
}
