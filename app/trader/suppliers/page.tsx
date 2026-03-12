'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'

type SupplierListItem = {
  id: string
  companyName: string
  verified: boolean
  rating: number
  totalProducts: number
  totalReviews: number
  user: { name: string }
}

export default function TraderSuppliersPage() {
  const { language } = useUi()
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([])

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/suppliers?limit=200', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) setSuppliers(result.data?.suppliers ?? [])
    }
    load()
  }, [])

  return (
    <section className="card-pro rounded-xl p-4">
      <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'الموردون' : 'Suppliers'}</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {suppliers.map((s) => (
          <article key={s.id} className="rounded-lg border border-app p-3">
            <p className="font-medium text-app">
              {s.companyName || s.user.name}
              {s.verified ? (
                <span className="ms-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600">
                  {language === 'ar' ? 'مورد موثّق' : 'Verified Supplier'}
                </span>
              ) : null}
            </p>
            <p className="text-xs text-muted">{language === 'ar' ? `منتجات: ${s.totalProducts}` : `Products: ${s.totalProducts}`}</p>
            <p className="text-xs text-muted">{language === 'ar' ? `التقييم: ${s.rating.toFixed(1)}` : `Rating: ${s.rating.toFixed(1)}`}</p>
            <p className="text-xs text-muted">{language === 'ar' ? `عدد التقييمات: ${s.totalReviews}` : `Reviews: ${s.totalReviews}`}</p>
            <a className="mt-2 inline-flex text-xs text-[var(--app-primary)] underline" href={`/suppliers/${s.id}`}>
              {language === 'ar' ? 'عرض الملف' : 'View profile'}
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}

