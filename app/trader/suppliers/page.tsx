'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'

type Product = { supplierId: string; supplier: { verified: boolean; user: { name: string } }; rating: number; reviewCount: number }

export default function TraderSuppliersPage() {
  const { language } = useUi()
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/products?limit=200', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) setProducts(result.data ?? [])
    }
    load()
  }, [])

  const suppliers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; products: number; rating: number; verified: boolean }>()
    for (const p of products) {
      const prev = map.get(p.supplierId)
      if (prev) {
        prev.products += 1
        prev.rating = Math.max(prev.rating, p.rating)
      } else {
        map.set(p.supplierId, { id: p.supplierId, name: p.supplier.user.name, products: 1, rating: p.rating, verified: p.supplier.verified })
      }
    }
    return Array.from(map.values())
  }, [products])

  return (
    <section className="card-pro rounded-xl p-4">
      <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'الموردون' : 'Suppliers'}</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {suppliers.map((s) => (
          <article key={s.id} className="rounded-lg border border-app p-3">
            <p className="font-medium text-app">
              {s.name}
              {s.verified ? (
                <span className="ms-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600">
                  {language === 'ar' ? 'مورد موثّق' : 'Verified Supplier'}
                </span>
              ) : null}
            </p>
            <p className="text-xs text-muted">{language === 'ar' ? `منتجات: ${s.products}` : `Products: ${s.products}`}</p>
            <p className="text-xs text-muted">{language === 'ar' ? `تقييم: ${s.rating.toFixed(1)}` : `Rating: ${s.rating.toFixed(1)}`}</p>
            <a className="mt-2 inline-flex text-xs text-[var(--app-primary)] underline" href={`/suppliers/${s.id}`}>
              {language === 'ar' ? 'عرض الملف' : 'View profile'}
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}
