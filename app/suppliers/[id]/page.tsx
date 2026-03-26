'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type SupplierProfilePayload = {
  supplier: {
    id: string
    companyName: string
    description: string | null
    logo: string | null
    coverImage: string | null
    verified: boolean
    user: {
      id: string
      name: string
      email: string
      phone: string | null
    }
    verificationStatus: string
  }
  metrics: {
    averageRating: number
    totalCompletedOrders: number
    orderCompletionRate: number
    averageShippingTimeDays: number
    totalReviews: number
  }
  products: Array<{
    id: string
    name: string
    nameAr: string | null
    nameEn: string | null
    price: number
    compareAtPrice: number | null
    quantity: number
    soldCount: number
    rating: number
    reviewCount: number
  }>
}

export default function SupplierProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { language } = useUi()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SupplierProfilePayload | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/suppliers/${id}/profile`, { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) setData(result.data)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  if (loading) {
    return <section className="card-pro rounded-xl p-6 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</section>
  }

  if (!data) {
    return <section className="card-pro rounded-xl p-6 text-sm text-muted">{language === 'ar' ? 'المورد غير موجود' : 'Supplier not found'}</section>
  }

  return (
    <div className="space-y-4">
      <section className="card-pro rounded-xl p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-app">{data.supplier.companyName}</h1>
          {data.supplier.verified ? (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-600">
              {language === 'ar' ? 'مورد معتمد' : 'Certified Supplier'}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-muted">{data.supplier.description || (language === 'ar' ? 'لا يوجد وصف' : 'No description')}</p>
        <p className="mt-2 text-xs text-muted">{language === 'ar' ? `جهة التواصل: ${data.supplier.user.name}` : `Contact: ${data.supplier.user.name}`}</p>
        <p className="text-xs text-muted">{data.supplier.user.phone || '-'}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard labelAr="التقييم المتوسط" labelEn="Avg Rating" value={`${data.metrics.averageRating.toFixed(2)}★`} />
        <MetricCard labelAr="إجمالي التقييمات" labelEn="Total Reviews" value={String(data.metrics.totalReviews)} />
        <MetricCard labelAr="طلبات مكتملة" labelEn="Completed orders" value={String(data.metrics.totalCompletedOrders)} />
        <MetricCard labelAr="نسبة إكمال الطلبات" labelEn="Completion rate" value={`${data.metrics.orderCompletionRate.toFixed(1)}%`} />
        <MetricCard labelAr="متوسط الشحن (يوم)" labelEn="Avg shipping (days)" value={data.metrics.averageShippingTimeDays.toFixed(1)} />
      </section>

      <section className="card-pro rounded-xl p-4">
<div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'الكتالوج التجاري' : 'Business Catalog'}</h2>
          <Link href={`/suppliers/${id}/products`} className="text-primary text-sm font-medium hover:underline">
            {language === 'ar' ? 'عرض الكل' : 'View all'}
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.products.slice(0, 6).map((product) => (
            <Link key={product.id} href={`/products/${product.id}`} className="block rounded-lg border border-app p-3 hover:shadow-sm">
              <div className="w-full h-32 bg-gray-100 rounded mb-2 flex items-center justify-center">
                {/* Placeholder until images loaded */}
              </div>
              <p className="font-semibold text-app line-clamp-1">{language === 'ar' ? product.nameAr || product.nameEn || product.name : product.nameEn || product.nameAr || product.name}</p>
              <p className="text-sm text-app">{formatSypAmount(product.price, language)}</p>
              <p className="text-xs text-muted line-clamp-1">{language === 'ar' ? `الكمية: ${product.quantity}` : `Stock: ${product.quantity}`}</p>
            </Link>
          ))}
          {data.products.length === 0 && <p className="text-sm text-muted col-span-full text-center py-8">{language === 'ar' ? 'لا توجد منتجات منشورة' : 'No published products'}</p>}
        </div>
      </section>
    </div>
  )
}

function MetricCard({ labelAr, labelEn, value }: { labelAr: string; labelEn: string; value: string }) {
  const { language } = useUi()
  return (
    <article className="card-pro rounded-xl p-4">
      <p className="text-sm text-muted">{language === 'ar' ? labelAr : labelEn}</p>
      <p className="mt-1 text-xl font-semibold text-app">{value}</p>
    </article>
  )
}
