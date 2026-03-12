'use client'

import { useEffect, useState } from 'react'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { SupplierHorizontalBars, SupplierLineChart } from '@/components/supplier/SupplierCharts'
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

function CategorySalesCard({
  items,
  language,
  formatAmount,
}: {
  items: Array<{ label: string; value: number }>
  language: 'ar' | 'en'
  formatAmount: (value: number) => string
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted">
        {language === 'ar' ? 'لا توجد بيانات حالياً' : 'No data available'}
      </p>
    )
  }

  const total = items.reduce((sum, item) => sum + item.value, 0) || 1
  const palette = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-violet-500',
    'bg-sky-500',
    'bg-lime-500',
    'bg-orange-500',
  ]

  const ranked = [...items].sort((a, b) => b.value - a.value).slice(0, 8)

  return (
    <div className="space-y-4">
      <div className="flex h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--app-border)_60%,transparent)]">
        {ranked.map((item, idx) => {
          const width = Math.max(2, Math.round((item.value / total) * 100))
          return (
            <div
              key={item.label}
              className={`${palette[idx % palette.length]} h-full`}
              style={{ width: `${width}%` }}
            />
          )
        })}
      </div>

      <div className="grid gap-2">
        {ranked.map((item, idx) => {
          const percent = Math.round((item.value / total) * 100)
          return (
            <div
              key={item.label}
              className="rounded-xl border border-app/60 bg-[color-mix(in_oklab,var(--app-surface)_94%,transparent)] px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${palette[idx % palette.length]}`} />
                  <span className="text-app">{item.label}</span>
                </div>
                <span className="text-xs text-muted">{percent}%</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>{formatAmount(item.value)}</span>
                <div className="h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--app-border)_60%,transparent)]">
                  <div
                    className={`${palette[idx % palette.length]} h-full`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'المبيعات حسب الفئة' : 'Sales by category'}</h2>
                <span className="text-xs text-muted">
                  {language === 'ar'
                    ? `${data.categorySales.length} فئات`
                    : `${data.categorySales.length} categories`}
                </span>
              </div>
              <div className="mt-4">
                <CategorySalesCard
                  items={data.categorySales}
                  language={language}
                  formatAmount={(value) => formatSypAmount(value, language)}
                />
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="card-pro rounded-xl p-4">
              <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'أكثر المنتجات مبيعاً' : 'Top products'}</h2>
              <div className="mt-4">
                {data.topProducts.length ? (
                  <SupplierHorizontalBars data={data.topProducts} />
                ) : (
                  <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
                )}
              </div>
            </article>

            <article className="card-pro rounded-xl p-4">
              <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'أقل المنتجات مبيعاً' : 'Least-selling products'}</h2>
              <div className="mt-4">
                {data.leastSelling.length ? (
                  <SupplierHorizontalBars data={data.leastSelling} />
                ) : (
                  <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
                )}
              </div>
            </article>
          </section>

          <section className="card-pro rounded-xl p-4">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'المنتجات الأكثر مشاهدة' : 'Most viewed products'}</h2>
            <div className="mt-4">
              {data.trendingViewed.length ? (
                <SupplierHorizontalBars data={data.trendingViewed} />
              ) : (
                <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
              )}
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
