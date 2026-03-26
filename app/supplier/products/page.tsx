'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import { CloudImage } from '@/components/common/CloudImage'

type Product = {
  id: string
  nameAr: string | null
  nameEn: string | null
  price: number
  compareAtPrice: number | null
  quantity: number
  minOrderQuantity: number
  sku: string | null
  status: string
  images: string[]
  createdAt: string
  category?: { nameAr: string | null; nameEn: string | null; name: string }
}

export default function SupplierProductsPage() {
  const { language } = useUi()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/products?mine=1&limit=200&sort=newest', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) {
        setProducts(result.data || [])
      } else {
        setProducts([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((item) => {
      const name = (item.nameAr || item.nameEn || '').toLowerCase()
      const matchesSearch = !query || name.includes(query)
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [products, search, statusFilter])

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id)
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update status')
      }
      setProducts((items) => items.map((p) => (p.id === id ? { ...p, status } : p)))
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل التحديث' : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  const removeProduct = async (id: string) => {
    const confirmed = window.confirm(language === 'ar' ? 'هل تريد حذف المنتج؟' : 'Delete this product?')
    if (!confirmed) return

    setBusyId(id)
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete product')
      }
      setProducts((items) => items.filter((p) => p.id !== id))
      toast.success(language === 'ar' ? 'تم الحذف' : 'Deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل الحذف' : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-pro p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-app">{language === 'ar' ? 'إدارة المنتجات' : 'Products management'}</h1>
            <p className="mt-1 text-sm text-muted">
              {language === 'ar' ? 'أنشئ منتجاتك وفعّلها لتظهر للتجار.' : 'Create products and publish them to traders.'}
            </p>
          </div>
          <Link href="/supplier/products/new" className="btn-primary !rounded-lg !px-4 !py-2 text-sm">
            {language === 'ar' ? 'إضافة منتج' : 'Add product'}
          </Link>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <input
            className="input-pro"
            placeholder={language === 'ar' ? 'بحث بالاسم' : 'Search by name'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input-pro" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">{language === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            <option value="ACTIVE">{language === 'ar' ? 'نشط' : 'Active'}</option>
            <option value="INACTIVE">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
            <option value="DRAFT">{language === 'ar' ? 'مسودة' : 'Draft'}</option>
          </select>
          <button className="btn-secondary !rounded-lg !px-3 !py-2 text-sm" onClick={load}>
            {language === 'ar' ? 'تحديث القائمة' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : filtered.length === 0 ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'لا توجد منتجات حالياً.' : 'No products found.'}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => {
            const name = language === 'ar' ? product.nameAr || product.nameEn : product.nameEn || product.nameAr
            const categoryName = language === 'ar'
              ? product.category?.nameAr || product.category?.name || '-'
              : product.category?.nameEn || product.category?.name || '-'
            const hasDiscount = !!product.compareAtPrice && product.compareAtPrice > product.price

            return (
              <article key={product.id} className="card-pro rounded-xl p-4">
                <CloudImage
                  src={product.images?.[0]}
                  alt={name || ''}
                  width={400}
                  height={300}
                  className="h-40 w-full rounded-xl object-cover"
                />

                <div className="mt-3 space-y-1">
                  <p className="font-semibold text-app">{name || '-'}</p>
                  <p className="text-xs text-muted">{language === 'ar' ? `التصنيف: ${categoryName}` : `Category: ${categoryName}`}</p>
                  <p className="text-xs text-muted">SKU: {product.sku || '-'}</p>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <p className="text-base font-semibold text-app">{formatSypAmount(product.price, language)}</p>
                  {hasDiscount ? (
                    <p className="text-xs text-emerald-600">{formatSypAmount((product.compareAtPrice || 0) - product.price, language)}</p>
                  ) : null}
                </div>
                {hasDiscount ? (
                  <p className="text-xs text-muted line-through">{formatSypAmount(product.compareAtPrice || 0, language)}</p>
                ) : null}

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                  <p>{language === 'ar' ? `المخزون: ${product.quantity}` : `Stock: ${product.quantity}`}</p>
                  <p>{language === 'ar' ? `أقل طلب: ${product.minOrderQuantity}` : `MOQ: ${product.minOrderQuantity}`}</p>
                  <p>{language === 'ar' ? `الحالة: ${product.status}` : `Status: ${product.status}`}</p>
                  <p>{new Date(product.createdAt).toLocaleDateString(language)}</p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    className="input-pro !h-10 !py-0"
                    value={product.status}
                    onChange={(e) => updateStatus(product.id, e.target.value)}
                    disabled={busyId === product.id}
                  >
                    <option value="ACTIVE">{language === 'ar' ? 'نشط' : 'Active'}</option>
                    <option value="INACTIVE">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
                    <option value="DRAFT">{language === 'ar' ? 'مسودة' : 'Draft'}</option>
                  </select>
                  <button
                    className="btn-secondary !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60"
                    onClick={() => removeProduct(product.id)}
                    disabled={busyId === product.id}
                  >
                    {language === 'ar' ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
