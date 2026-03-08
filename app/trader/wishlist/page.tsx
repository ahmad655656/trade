'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type WishlistItem = {
  id: string
  productId: string
  product: {
    nameAr: string | null
    nameEn: string | null
    price: number
    compareAtPrice: number | null
    supplier: { user: { name: string } }
  }
}

export default function TraderWishlistPage() {
  const { language } = useUi()
  const [items, setItems] = useState<WishlistItem[]>([])

  const load = async () => {
    const response = await fetch('/api/wishlist', { cache: 'no-store' })
    const result = await response.json()
    if (response.ok && result.success) setItems(result.data ?? [])
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const response = await fetch('/api/wishlist', { cache: 'no-store' })
      const result = await response.json()
      if (!cancelled && response.ok && result.success) setItems(result.data ?? [])
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const remove = async (productId: string) => {
    const response = await fetch(`/api/wishlist?productId=${productId}`, { method: 'DELETE' })
    const result = await response.json()
    if (!response.ok || !result.success) {
      toast.error(language === 'ar' ? 'فشل الحذف' : 'Failed to remove')
      return
    }
    await load()
  }

  return (
    <section className="card-pro rounded-xl p-4 space-y-3">
      <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'المفضلة' : 'Wishlist'}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-app p-3">
            <p className="font-medium text-app">{language === 'ar' ? item.product.nameAr || item.product.nameEn : item.product.nameEn || item.product.nameAr}</p>
            <p className="text-xs text-muted">{item.product.supplier.user.name}</p>
            <p className="text-sm text-app">{formatSypAmount(item.product.price, language)}</p>
            <div className="mt-2 flex gap-2">
              <button className="btn-secondary !rounded-md !px-2 !py-1 text-xs" onClick={() => remove(item.productId)}>{language === 'ar' ? 'إزالة' : 'Remove'}</button>
            </div>
          </article>
        ))}
      </div>
      {!items.length && <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد عناصر في المفضلة' : 'Wishlist is empty'}</p>}
    </section>
  )
}
