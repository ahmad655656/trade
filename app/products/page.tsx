'use client'

import { CloudImage } from '@/components/common/CloudImage'
import { ProductStatus } from '@/lib/prisma-enums'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type ProductCardType = {
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
  const router = useRouter()
  const [products, setProducts] = useState<ProductCardType[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

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
      {/* Search Bar */}
      <div className="card-pro rounded-2xl p-8">
        <form className="mb-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(query)}&type=products`) }}>
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={language === 'ar' ? 'ابحث عن منتجات تجارية محددة...' : 'Search for specific business products...'}
              className="w-full rounded-xl border border-app bg-[color-mix(in_oklab,var(--app-surface)_92%,transparent)] pl-12 py-3 text-sm text-app outline-none placeholder:text-muted/70 focus:border-[var(--app-primary)]/50 focus:ring-2 focus:ring-[var(--app-primary)]/20"
            />
          </div>
          <button type="submit" className="rounded-xl bg-[var(--app-primary)] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110">
            {language === 'ar' ? 'ابحث' : 'Search'}
          </button>
        </form>
        <h1 className="text-3xl font-bold text-app">{language === 'ar' ? 'الكتالوج التجاري الشامل' : 'Comprehensive Business Catalog'}</h1>
        <p className="mt-2 text-muted">
          {language === 'ar' ? 'منتجات عالية الجودة من موردين موثوقين جاهزة للطلبات التجارية الكبيرة.' : 'Premium products from reliable suppliers ready for large business orders.'}
        </p>
      </div>

      {loading ? (
        <div className="card-pro rounded-xl p-6 text-sm text-muted">{language === 'ar' ? 'جارٍ تحضير الكتالوج الخاص بك...' : 'Preparing your personalized catalog...'}</div>
      ) : products.length === 0 ? (
        <div className="card-pro rounded-xl p-6 text-sm text-muted">{language === 'ar' ? 'لا توجد منتجات منشورة بعد.' : 'No published products yet.'}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`} className="card-pro rounded-xl p-4 hover:shadow-lg transition-shadow">
              <CloudImage 
                src={product.images[0]} 
                alt={product.nameAr || product.nameEn || ''} 
                width={400} 
                height={300}
                className="w-full h-48 object-cover rounded-lg mb-3"
              />
              <h2 className="font-semibold text-app line-clamp-2">{language === 'ar' ? product.nameAr || product.nameEn : product.nameEn || product.nameAr}</h2>
              <p className="mt-1 text-xs text-muted">
                {language === 'ar'
                  ? `التصنيف: ${product.category?.nameAr || product.category?.name || '-'}`
                  : `Category: ${product.category?.nameEn || product.category?.name || '-'}`}
              </p>
              <p className="mt-2 text-lg font-bold text-app">{formatSypAmount(product.price, language)}</p>
              <p className="text-xs text-muted">{language === 'ar' ? `المتاح: ${product.quantity}` : `Available: ${product.quantity}`}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}


