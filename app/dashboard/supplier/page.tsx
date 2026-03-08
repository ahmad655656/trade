'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import SupplierSkeleton from '@/components/supplier/SupplierSkeleton'
import { SupplierDonutChart, SupplierHorizontalBars, SupplierLineChart } from '@/components/supplier/SupplierCharts'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import { orderStatusLabel } from '@/lib/order-labels'

type AnalyticsResponse = {
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
  topProducts: Array<{ label: string; value: number }>
  lowStockCritical: Array<{ id: string; nameAr: string; nameEn: string; stock: number }>
  latestReviews: Array<{ id: string; reviewerName: string; rating: number; comment: string }>
  latestOrders: Array<{ id: string; orderNumber: string; productName: string; quantity: number; unitPrice: number; status: string; createdAt: string }>
}

export default function SupplierDashboardPage() {
  const { language } = useUi()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsResponse | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/supplier/analytics', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to load dashboard')
        setData(result.data)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحميل لوحة المورد' : 'Failed to load supplier dashboard')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [language])

  const metrics = useMemo(() => {
    if (!data) return []
    return [
      {
        key: 'total-sales',
        label: language === 'ar' ? 'إجمالي المبيعات' : 'Total sales',
        value: formatSypAmount(data.metrics.totalSales, language),
      },
      {
        key: 'orders',
        label: language === 'ar' ? 'إجمالي الطلبات' : 'Total orders',
        value: String(data.metrics.ordersCount),
      },
      {
        key: 'average-order',
        label: language === 'ar' ? 'متوسط قيمة الطلب' : 'Average order value',
        value: formatSypAmount(data.metrics.averageOrderValue, language),
      },
      {
        key: 'rating',
        label: language === 'ar' ? 'متوسط التقييم' : 'Average rating',
        value: `${data.metrics.averageRating.toFixed(2)} / 5`,
      },
      {
        key: 'growth',
        label: language === 'ar' ? 'معدل النمو (30 يوم)' : 'Growth rate (30d)',
        value: `${data.metrics.growthRate >= 0 ? '+' : ''}${data.metrics.growthRate.toFixed(1)}%`,
      },
      {
        key: 'low-stock',
        label: language === 'ar' ? 'منخفضة المخزون' : 'Low stock',
        value: String(data.metrics.lowStockCount),
      },
    ]
  }, [data, language])

  if (loading) {
    return (
      <div className="space-y-4">
        <SupplierSkeleton rows={2} />
        <SupplierSkeleton rows={4} />
        <SupplierSkeleton rows={6} />
      </div>
    )
  }

  if (!data) {
    return <section className="card-pro rounded-xl p-6 text-sm text-muted">{language === 'ar' ? 'لا توجد بيانات حالياً' : 'No data available'}</section>
  }

  return (
    <div className="space-y-6">
      <SupplierPageHeader
        titleAr="اللوحة الرئيسية"
        titleEn="Dashboard"
        subtitleAr="نظرة فورية على الأداء، الطلبات، المخزون والتقييمات"
        subtitleEn="Instant visibility on performance, orders, stock, and reviews"
        onHelp={() => toast(language === 'ar' ? 'سيتم إضافة الفيديوهات التعليمية قريباً' : 'Tutorial videos will be added soon')}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.key} className="card-pro rounded-xl p-4">
            <p className="text-sm text-muted">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-app">{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="card-pro rounded-xl p-4 xl:col-span-2">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'المبيعات خلال آخر 7 أيام' : 'Sales in the last 7 days'}</h2>
          <div className="mt-4">
            <SupplierLineChart data={data.salesLast7Days} />
          </div>
        </article>

        <article className="card-pro rounded-xl p-4">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'حالة الطلبات' : 'Order status split'}</h2>
          <div className="mt-4">
            <SupplierDonutChart data={data.orderStatusBreakdown} />
          </div>
        </article>
      </section>

      <section className="card-pro rounded-xl p-4">
        <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'أكثر 10 منتجات مبيعاً' : 'Top 10 best-selling products'}</h2>
        <div className="mt-4">
          <SupplierHorizontalBars data={data.topProducts.slice(0, 10)} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="card-pro rounded-xl p-4 xl:col-span-2">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'آخر الطلبات' : 'Latest orders'}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-app text-muted">
                  <th className="px-2 py-2 text-start">{language === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                  <th className="px-2 py-2 text-start">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                  <th className="px-2 py-2 text-start">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                  <th className="px-2 py-2 text-start">{language === 'ar' ? 'السعر' : 'Price'}</th>
                  <th className="px-2 py-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-2 py-2 text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {data.latestOrders.map((order) => (
                  <tr key={order.id} className="border-b border-app/50">
                    <td className="px-2 py-2 font-medium text-app">{order.orderNumber}</td>
                    <td className="px-2 py-2 text-app">{order.productName}</td>
                    <td className="px-2 py-2 text-muted">{order.quantity}</td>
                    <td className="px-2 py-2 text-muted">{formatSypAmount(order.unitPrice, language)}</td>
                    <td className="px-2 py-2 text-muted">{orderStatusLabel(order.status, language)}</td>
                    <td className="px-2 py-2 text-muted">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div className="space-y-4">
          <article className="card-pro rounded-xl p-4">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'منخفضة المخزون' : 'Critical low stock'}</h2>
            <div className="mt-3 space-y-2">
              {data.lowStockCritical.slice(0, 6).map((product) => (
                <div key={product.id} className="rounded-lg border border-app p-2">
                  <p className="font-medium text-app">{language === 'ar' ? product.nameAr : product.nameEn}</p>
                  <p className="text-xs text-amber-600">{language === 'ar' ? `المتبقي ${product.stock} وحدات` : `${product.stock} units left`}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="card-pro rounded-xl p-4">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'آخر التقييمات' : 'Latest reviews'}</h2>
            <div className="mt-3 space-y-2">
              {data.latestReviews.slice(0, 3).map((review) => (
                <div key={review.id} className="rounded-lg border border-app p-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-app">{review.reviewerName}</p>
                    <p className="text-xs text-amber-500">{'★'.repeat(review.rating)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">{review.comment}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
