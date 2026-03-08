'use client'

import { useEffect, useState } from 'react'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { SupplierDonutChart, SupplierHorizontalBars, SupplierLineChart } from '@/components/supplier/SupplierCharts'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type AnalyticsData = {
  metrics: {
    totalSales: number
    ordersCount: number
    averageOrderValue: number
    growthRate: number
  }
  salesLast7Days: Array<{ label: string; value: number }>
  categorySales: Array<{ label: string; value: number }>
  topProducts: Array<{ label: string; value: number }>
  leastSelling: Array<{ label: string; value: number }>
  trendingViewed: Array<{ label: string; value: number }>
}

export default function SupplierSalesPage() {
  const { language } = useUi()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/supplier/analytics', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) setData(result.data)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <SupplierPageHeader
        titleAr="تقارير المبيعات"
        titleEn="Sales Reports"
        subtitleAr="مؤشرات أداء حقيقية من قاعدة البيانات"
        subtitleEn="Real performance insights from database"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Stat labelAr="إجمالي المبيعات" labelEn="Total sales" value={data ? formatSypAmount(data.metrics.totalSales, language) : '-'} />
        <Stat labelAr="عدد الطلبات" labelEn="Orders count" value={data ? String(data.metrics.ordersCount) : '-'} />
        <Stat labelAr="متوسط قيمة الطلب" labelEn="Average order value" value={data ? formatSypAmount(data.metrics.averageOrderValue, language) : '-'} />
        <Stat labelAr="معدل النمو" labelEn="Growth rate" value={data ? `${data.metrics.growthRate >= 0 ? '+' : ''}${data.metrics.growthRate.toFixed(1)}%` : '-'} />
        <Stat labelAr="الحالة" labelEn="Status" value={loading ? (language === 'ar' ? 'جارٍ التحميل...' : 'Loading...') : (language === 'ar' ? 'محدثة من قاعدة البيانات' : 'Live from database')} />
      </section>

      {data ? (
        <>
          <section className="grid gap-4 xl:grid-cols-3">
            <article className="card-pro rounded-xl p-4 xl:col-span-2">
              <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'المبيعات اليومية' : 'Daily sales'}</h2>
              <div className="mt-4">
                <SupplierLineChart data={data.salesLast7Days} />
              </div>
            </article>
            <article className="card-pro rounded-xl p-4">
              <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'المبيعات حسب الفئة' : 'Sales by category'}</h2>
              <div className="mt-4">
                <SupplierDonutChart data={data.categorySales.length ? data.categorySales : [{ label: 'N/A', value: 1 }]} />
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="card-pro rounded-xl p-4">
              <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'أكثر المنتجات مبيعاً' : 'Top products'}</h2>
              <div className="mt-4">
                <SupplierHorizontalBars data={data.topProducts} />
              </div>
            </article>

            <article className="card-pro rounded-xl p-4">
              <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'أقل المنتجات مبيعاً' : 'Least-selling products'}</h2>
              <div className="mt-4">
                <SupplierHorizontalBars data={data.leastSelling} />
              </div>
            </article>
          </section>

          <section className="card-pro rounded-xl p-4">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'المنتجات الأكثر مشاهدة' : 'Most viewed products'}</h2>
            <div className="mt-4">
              <SupplierHorizontalBars data={data.trendingViewed} />
            </div>
          </section>
        </>
      ) : (
        <section className="card-pro rounded-xl p-6 text-sm text-muted">{language === 'ar' ? 'لا توجد بيانات مبيعات' : 'No sales data'}</section>
      )}
    </div>
  )
}

function Stat({ labelAr, labelEn, value }: { labelAr: string; labelEn: string; value: string }) {
  const { language } = useUi()
  return (
    <article className="card-pro rounded-xl p-4">
      <p className="text-sm text-muted">{language === 'ar' ? labelAr : labelEn}</p>
      <p className="mt-2 text-2xl font-bold text-app">{value}</p>
    </article>
  )
}
