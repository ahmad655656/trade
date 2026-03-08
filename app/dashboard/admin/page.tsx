'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type DashboardData = {
  usersCount: number
  verifiedSuppliers: number
  pendingPayments: number
  todayVolume: number
}

export default function AdminDashboardPage() {
  const { language } = useUi()
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) setData(result.data)
    }
    void load()
  }, [])

  const kpis = [
    {
      title: language === 'ar' ? 'إجمالي المستخدمين' : 'Total users',
      value: data ? String(data.usersCount) : '-',
    },
    {
      title: language === 'ar' ? 'الموردون المعتمدون' : 'Verified suppliers',
      value: data ? String(data.verifiedSuppliers) : '-',
    },
    {
      title: language === 'ar' ? 'المدفوعات المعلّقة' : 'Pending payments',
      value: data ? String(data.pendingPayments) : '-',
    },
    {
      title: language === 'ar' ? 'حجم اليوم' : 'Today volume',
      value: data ? formatSypAmount(data.todayVolume, language) : '-',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((item) => (
        <article key={item.title} className="card-pro p-5">
          <p className="text-sm text-muted">{item.title}</p>
          <p className="mt-2 text-2xl font-bold text-app">{item.value}</p>
        </article>
      ))}
    </div>
  )
}
