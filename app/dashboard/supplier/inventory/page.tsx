'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { useUi } from '@/components/providers/UiProvider'

type ProductItem = {
  id: string
  nameAr: string | null
  nameEn: string | null
  sku: string | null
  quantity: number
  minOrderQuantity: number
  updatedAt: string
}

export default function SupplierInventoryPage() {
  const { language } = useUi()
  const [items, setItems] = useState<ProductItem[]>([])
  const [adjustments, setAdjustments] = useState<Record<string, number>>({})

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products?mine=1&limit=200', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to load inventory')
      setItems(result.data ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحميل المخزون' : 'Failed to load inventory')
    }
  }, [language])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const lowStock = useMemo(() => items.filter((p) => p.quantity > 0 && p.quantity <= p.minOrderQuantity), [items])
  const outOfStock = useMemo(() => items.filter((p) => p.quantity === 0), [items])

  const setAdjust = (id: string, value: number) => setAdjustments((prev) => ({ ...prev, [id]: value }))

  const saveQuantity = async (item: ProductItem) => {
    const quantity = adjustments[item.id]
    if (quantity === undefined || Number.isNaN(quantity)) return

    try {
      const response = await fetch(`/api/products/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to update quantity')
      toast.success(language === 'ar' ? 'تم تحديث المخزون' : 'Stock updated')
      await loadProducts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحديث المخزون' : 'Failed to update stock')
    }
  }

  return (
    <div className="space-y-6">
      <SupplierPageHeader
        titleAr="إدارة المخزون"
        titleEn="Inventory Management"
        subtitleAr="بيانات المخزون مباشرة من قاعدة البيانات"
        subtitleEn="Live inventory data from database"
      />

      <section className="card-pro rounded-xl p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button className="btn-secondary !rounded-lg !px-3 !py-2 text-sm">
            <ArrowDownTrayIcon className="h-4 w-4" /> CSV/Excel
          </button>
          <button className="btn-secondary !rounded-lg !px-3 !py-2 text-sm">
            <ArrowUpTrayIcon className="h-4 w-4" /> {language === 'ar' ? 'استيراد تحديث' : 'Import updates'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-app text-muted">
                <th className="p-2 text-start">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                <th className="p-2 text-start">SKU</th>
                <th className="p-2 text-start">{language === 'ar' ? 'المخزون الحالي' : 'Current stock'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'المخزون الآمن' : 'Minimum stock'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'آخر تحديث' : 'Last update'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'تحديث سريع' : 'Quick update'}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const newQty = adjustments[item.id] ?? item.quantity
                const status = item.quantity === 0 ? (language === 'ar' ? 'نافد' : 'Out') : item.quantity <= item.minOrderQuantity ? (language === 'ar' ? 'منخفض' : 'Low') : language === 'ar' ? 'جيد' : 'Good'
                return (
                  <tr key={item.id} className="border-b border-app/50">
                    <td className="p-2">
                      <p className="font-medium text-app">{language === 'ar' ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}</p>
                    </td>
                    <td className="p-2 text-muted">{item.sku || '-'}</td>
                    <td className="p-2 text-muted">{item.quantity}</td>
                    <td className="p-2 text-muted">{item.minOrderQuantity}</td>
                    <td className="p-2 text-muted">{status}</td>
                    <td className="p-2 text-muted">{new Date(item.updatedAt).toLocaleDateString()}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <input className="input-pro !w-24" type="number" value={newQty} onChange={(e) => setAdjust(item.id, Number(e.target.value))} />
                        <button className="btn-secondary !rounded-md !px-2 !py-1 text-xs" onClick={() => void saveQuantity(item)}>{language === 'ar' ? 'حفظ' : 'Save'}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card-pro rounded-xl p-4">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'المنتجات منخفضة المخزون' : 'Low stock products'}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {lowStock.map((item) => (
              <li key={item.id} className="rounded border border-app p-2">
                {language === 'ar' ? item.nameAr || item.nameEn : item.nameEn || item.nameAr} - {item.quantity}
              </li>
            ))}
          </ul>
        </article>

        <article className="card-pro rounded-xl p-4">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'المنتجات النافدة' : 'Out of stock products'}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {outOfStock.map((item) => (
              <li key={item.id} className="rounded border border-app p-2">
                {language === 'ar' ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
}
