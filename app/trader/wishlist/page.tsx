'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import { WishlistItem } from '@/types/supplier'

export default function TraderWishlistPage() {
  const { language } = useUi()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/wishlist', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) {
          setItems(result.data)
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <section className="space-y-4">
      <div className="card-pro rounded-xl p-6">
        <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'المفضلة' : 'Wishlist'}</h2>
        <p className="mt-2 text-muted">
          {language === 'ar'
            ? 'المنتجات التي حفظتها للشراء لاحقًا.'
            : 'Products you saved for later.'}
        </p>
      </div>

      <div className="card-pro rounded-xl p-6">
        {loading ? (
          <p className="text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
        ) : !items.length ? (
          <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد منتجات مفضلة.' : 'No wishlist items yet.'}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-app p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={item.product.images?.[0] ?? '/logo.png'}
                    alt={item.product.name}
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-app">{language === 'ar' ? item.product.nameAr || item.product.nameEn : item.product.nameEn || item.product.nameAr}</h3>
                      <span className="text-xs text-muted">{formatSypAmount(item.product.price, language)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {language === 'ar' ? 'المورد' : 'Supplier'}: {item.product.supplier.user.name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
