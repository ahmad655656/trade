'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type CommissionData = {
  totals: {
    totalOrderValue: number
    totalPlatformFee: number
    pendingCommissions: number
    completedPayments: number
  }
}

export default function AdminCommissionsPage() {
  const { language } = useUi()
  const [data, setData] = useState<CommissionData | null>(null)

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/commissions', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) setData(result.data)
    }
    void load()
  }, [])

  return (
    <section className="space-y-4">
      <div className="card-pro rounded-xl p-6">
        <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'إدارة العمولات' : 'Commission management'}</h2>
        <p className="mt-2 text-muted">{language === 'ar' ? 'مؤشرات عمولة المنصة والمدفوعات المعلقة.' : 'Platform fee and pending commission metrics.'}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard labelAr="إجمالي قيمة الطلبات" labelEn="Total order value" value={formatSypAmount(data?.totals.totalOrderValue ?? 0, language)} />
        <MetricCard labelAr="إجمالي عمولة المنصة" labelEn="Total platform fee" value={formatSypAmount(data?.totals.totalPlatformFee ?? 0, language)} />
        <MetricCard labelAr="عمولات معلقة" labelEn="Pending commissions" value={formatSypAmount(data?.totals.pendingCommissions ?? 0, language)} />
        <MetricCard labelAr="مدفوعات مكتملة" labelEn="Completed payments" value={String(data?.totals.completedPayments ?? 0)} />
      </div>
    </section>
  )
}

function MetricCard({ labelAr, labelEn, value }: { labelAr: string; labelEn: string; value: string }) {
  const { language } = useUi()
  return (
    <article className="card-pro rounded-xl p-4">
      <p className="text-sm text-muted">{language === 'ar' ? labelAr : labelEn}</p>
      <p className="mt-2 text-2xl font-bold text-app">{value}</p>
    </article>
  )
}

