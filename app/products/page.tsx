'use client'

import { ProductStatus } from '@/lib/prisma-enums'
import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type ProductCard = {
  id: string
  nameAr: string | null
  nameEn: string | null
  price: number
  quantity: number
  status: ProductStatus
  images: string[]
  category?: {
    id: string
    name: string
    nameAr: string | null
    nameEn: string | null
  }
}

export default function ProductsPage() {
  const { language } = useUi()
  const [products, setProducts] = useState<ProductCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/products?limit=100', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) {
          setProducts(result.data ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <section className="space-y-4">
      <div className="card-pro rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-app">{language === 'ar' ? 'سوق المنتجات المنشورة' : 'Published products marketplace'}</h1>
        <p className="mt-2 text-muted">
          {language === 'ar' ? 'هذه المنتجات أضافها الموردون وتم نشرها للتجار.' : 'These products are added by suppliers and published for traders.'}
        </p>
      </div>

      {loading ? (
        <div className="card-pro rounded-xl p-6 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : products.length === 0 ? (
        <div className="card-pro rounded-xl p-6 text-sm text-muted">{language === 'ar' ? 'لا توجد منتجات منشورة بعد.' : 'No published products yet.'}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="card-pro rounded-xl p-4">
              <h2 className="font-semibold text-app">{language === 'ar' ? product.nameAr || product.nameEn : product.nameEn || product.nameAr}</h2>
              <p className="mt-1 text-xs text-muted">
                {language === 'ar'
                  ? `التصنيف: ${product.category?.nameAr || product.category?.name || '-'}`
                  : `Category: ${product.category?.nameEn || product.category?.name || '-'}`}
              </p>
              <p className="mt-2 text-sm text-muted">{formatSypAmount(product.price, language)}</p>
              <p className="text-xs text-muted">{language === 'ar' ? `المتاح: ${product.quantity}` : `Available: ${product.quantity}`}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}


