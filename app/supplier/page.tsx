'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { SupplierDonutChart, SupplierHorizontalBars, SupplierLineChart } from '@/components/supplier/SupplierCharts'

type AnalyticsPayload = {
  metrics: {
    totalSales: number
    ordersCount: number
    averageOrderValue: number
    growthRate: number
    activeProducts: number
    lowStockCount: number
    averageRating: number
  }
  salesLast7Days: Array<{ label: string; value: number }>
  orderStatusBreakdown: Array<{ label: string; value: number }>
  categorySales: Array<{ label: string; value: number }>
  latestOrders: Array<{
    id: string
    orderNumber: string
    createdAt: string
    status: string
    totalAmount: number
    productName: string
    quantity: number
    unitPrice: number
  }>
}

export default function SupplierDashboardPage() {
  const { language } = useUi()
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/supplier/analytics', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) {
          setData(result.data)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const metrics = data?.metrics

  const metricCards = metrics
    ? [
        { ar: 'إجمالي المبيعات', en: 'Total sales', value: formatSypAmount(metrics.totalSales, language) },
        { ar: 'عدد الطلبات', en: 'Orders count', value: metrics.ordersCount.toString() },
        { ar: 'متوسط قيمة الطلب', en: 'Average order value', value: formatSypAmount(metrics.averageOrderValue, language) },
        { ar: 'معدل النمو', en: 'Growth rate', value: `${metrics.growthRate.toFixed(1)}%` },
        { ar: 'منتجات نشطة', en: 'Active products', value: metrics.activeProducts.toString() },
        { ar: 'نقص المخزون', en: 'Low stock', value: metrics.lowStockCount.toString() },
        { ar: 'متوسط التقييم', en: 'Average rating', value: metrics.averageRating.toFixed(1) },
      ]
    : []

  return (
    <div className="space-y-6">
      <SupplierPageHeader
        titleAr="لوحة المورد"
        titleEn="Supplier Dashboard"
        subtitleAr="ملخص سريع لمبيعاتك وأداء المتجر"
        subtitleEn="Quick overview of your sales and store performance"
      />

      {loading ? (
        <div className="card-pro p-6 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : !data ? (
        <div className="card-pro p-6 text-sm text-muted">{language === 'ar' ? 'لا توجد بيانات حالياً.' : 'No data available.'}</div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((item) => (
              <article key={item.en} className="card-pro rounded-xl p-4">
                <p className="text-sm text-muted">{language === 'ar' ? item.ar : item.en}</p>
                <p className="mt-2 text-2xl font-bold text-app">{item.value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <article className="card-pro rounded-xl p-4 xl:col-span-2">
              <h2 className="text-lg font-semibold text-app">
                {language === 'ar' ? 'المبيعات خلال 7 أيام' : 'Sales over 7 days'}
              </h2>
              <div className="mt-4">
                <SupplierLineChart data={data.salesLast7Days} />
              </div>
            </article>

            <article className="card-pro rounded-xl p-4">
              <h2 className="text-lg font-semibold text-app">
                {language === 'ar' ? 'المبيعات حسب التصنيف' : 'Sales by category'}
              </h2>
              <div className="mt-4">
                <SupplierDonutChart data={data.categorySales} />
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <article className="card-pro rounded-xl p-4">
              <h2 className="text-lg font-semibold text-app">
                {language === 'ar' ? 'حالات الطلبات' : 'Order status'}
              </h2>
              <div className="mt-4">
                <SupplierHorizontalBars data={data.orderStatusBreakdown} />
              </div>
            </article>

            <article className="card-pro rounded-xl p-4 xl:col-span-2">
              <h2 className="text-lg font-semibold text-app">
                {language === 'ar' ? 'آخر الطلبات' : 'Latest orders'}
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-app text-muted">
                      <th className="p-2 text-start">{language === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                      <th className="p-2 text-start">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                      <th className="p-2 text-start">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                      <th className="p-2 text-start">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                      <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="p-2 text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.latestOrders.map((order) => (
                      <tr key={order.id} className="border-b border-app/50">
                        <td className="p-2 font-medium text-app">{order.orderNumber}</td>
                        <td className="p-2 text-muted">{order.productName}</td>
                        <td className="p-2 text-muted">{order.quantity}</td>
                        <td className="p-2 text-muted">{formatSypAmount(order.totalAmount, language)}</td>
                        <td className="p-2 text-muted">{order.status}</td>
                        <td className="p-2 text-muted">{new Date(order.createdAt).toLocaleDateString(language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  )
}
