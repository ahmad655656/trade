'use client'

import { ProductStatus } from '@prisma/client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type CategoryOption = {
  id: string
  name: string
  nameAr: string | null
  nameEn: string | null
}

type ProductItem = {
  id: string
  nameAr: string | null
  nameEn: string | null
  price: number
  compareAtPrice: number | null
  quantity: number
  minOrderQuantity: number
  sku: string | null
  status: ProductStatus
  createdAt: string
  category?: {
    id: string
    name: string
    nameAr: string | null
    nameEn: string | null
  }
}

type ProductsResponse = {
  success: boolean
  data?: ProductItem[]
  error?: string
}

type CategoriesResponse = {
  success: boolean
  data?: CategoryOption[]
  error?: string
}

const statusBadge: Record<ProductStatus, { ar: string; en: string }> = {
  ACTIVE: { ar: 'منشور', en: 'Published' },
  INACTIVE: { ar: 'غير نشط', en: 'Inactive' },
  OUT_OF_STOCK: { ar: 'نفذ', en: 'Out' },
  DRAFT: { ar: 'مسودة', en: 'Draft' },
  PENDING_REVIEW: { ar: 'معلّق', en: 'Pending' },
  REJECTED: { ar: 'مرفوض', en: 'Rejected' },
}

export default function SupplierProductsPage() {
  const { language } = useUi()
  const [items, setItems] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusDrafts, setStatusDrafts] = useState<Record<string, ProductStatus>>({})

  const [form, setForm] = useState({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    categoryId: '',
    price: '',
    compareAtPrice: '',
    quantity: '',
    minOrderQuantity: '1',
    sku: '',
    tags: '',
    status: 'DRAFT' as ProductStatus,
  })

  const loadProducts = useCallback(async () => {
    const response = await fetch('/api/products?mine=1', { cache: 'no-store' })
    const result: ProductsResponse = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to load products')
    setItems(result.data ?? [])
  }, [])

  const loadCategories = useCallback(async () => {
    const response = await fetch('/api/categories', { cache: 'no-store' })
    const result: CategoriesResponse = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to load categories')
    setCategories(result.data ?? [])
    if (result.data?.length) {
      const firstCategoryId = result.data[0].id as string
      setForm((prev) => (prev.categoryId ? prev : { ...prev, categoryId: firstCategoryId }))
    }
  }, [])

  useEffect(() => {
    const boot = async () => {
      setLoading(true)
      try {
        await Promise.all([loadProducts(), loadCategories()])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    void boot()
  }, [language, loadCategories, loadProducts])

  const publishedCount = useMemo(() => items.filter((p) => p.status === 'ACTIVE').length, [items])

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.categoryId) {
      toast.error(language === 'ar' ? 'اختر التصنيف أولاً' : 'Select category first')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          descriptionAr: form.descriptionAr || undefined,
          descriptionEn: form.descriptionEn || undefined,
          categoryId: form.categoryId,
          price: Number(form.price),
          compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
          quantity: Number(form.quantity),
          minOrderQuantity: Number(form.minOrderQuantity || 1),
          sku: form.sku || undefined,
          tags: form.tags
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
          status: form.status,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to create product')
      }

      toast.success(language === 'ar' ? 'تمت إضافة المنتج بنجاح' : 'Product added successfully')
      setForm((prev) => ({
        ...prev,
        nameAr: '',
        nameEn: '',
        descriptionAr: '',
        descriptionEn: '',
        price: '',
        compareAtPrice: '',
        quantity: '',
        minOrderQuantity: '1',
        sku: '',
        tags: '',
        status: 'DRAFT',
      }))
      await loadProducts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل إضافة المنتج' : 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id: string, status: ProductStatus) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to update status')
      toast.success(language === 'ar' ? 'تم تحديث حالة النشر' : 'Publish status updated')
      await loadProducts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحديث الحالة' : 'Failed to update status')
    }
  }

  const rowStatusValue = (item: ProductItem) => statusDrafts[item.id] ?? item.status

  const deleteProduct = async (id: string) => {
    const ok = window.confirm(language === 'ar' ? 'تأكيد حذف المنتج؟' : 'Delete this product?')
    if (!ok) return

    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to delete product')
      toast.success(language === 'ar' ? 'تم حذف المنتج' : 'Product deleted')
      await loadProducts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل حذف المنتج' : 'Failed to delete product')
    }
  }

  const categoryName = (c?: ProductItem['category']) => {
    if (!c) return '-'
    return language === 'ar' ? c.nameAr || c.name : c.nameEn || c.name
  }

  return (
    <div className="space-y-6">
      <SupplierPageHeader
        titleAr="إدارة المنتجات"
        titleEn="Supplier Products"
        subtitleAr="املأ كل تفاصيل المنتج بدقة ثم انشره ليظهر مباشرة للتاجر"
        subtitleEn="Fill product details accurately then publish to show for traders"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card-pro rounded-xl p-4">
          <p className="text-sm text-muted">{language === 'ar' ? 'إجمالي المنتجات' : 'Total products'}</p>
          <p className="mt-2 text-2xl font-bold text-app">{items.length}</p>
        </article>
        <article className="card-pro rounded-xl p-4">
          <p className="text-sm text-muted">{language === 'ar' ? 'المنتجات المنشورة' : 'Published products'}</p>
          <p className="mt-2 text-2xl font-bold text-app">{publishedCount}</p>
        </article>
        <article className="card-pro rounded-xl p-4">
          <p className="text-sm text-muted">{language === 'ar' ? 'المسودات' : 'Drafts'}</p>
          <p className="mt-2 text-2xl font-bold text-app">{items.filter((p) => p.status === 'DRAFT').length}</p>
        </article>
      </section>

      <section className="card-pro rounded-xl p-5">
        <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'إضافة منتج جديد (تفصيلي)' : 'Add new product (detailed)'}</h2>

        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={createProduct}>
          <Field
            label={language === 'ar' ? 'اسم المنتج بالعربية *' : 'Arabic product name *'}
            help={language === 'ar' ? 'الاسم الذي سيظهر للتاجر العربي في بطاقات المنتجات.' : 'Displayed to Arabic traders in product cards.'}
          >
            <input className="input-pro" required value={form.nameAr} onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))} />
          </Field>

          <Field
            label={language === 'ar' ? 'اسم المنتج بالإنجليزية' : 'English product name'}
            help={language === 'ar' ? 'اختياري، ويظهر عند التبديل للغة الإنجليزية.' : 'Optional, shown in English mode.'}
          >
            <input className="input-pro" value={form.nameEn} onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))} />
          </Field>

          <Field
            label={language === 'ar' ? 'وصف المنتج بالعربية' : 'Arabic description'}
            help={language === 'ar' ? 'اكتب المواصفات والاستخدام والمزايا بشكل واضح.' : 'Describe key specifications and benefits clearly.'}
          >
            <textarea className="input-pro min-h-24" value={form.descriptionAr} onChange={(e) => setForm((p) => ({ ...p, descriptionAr: e.target.value }))} />
          </Field>

          <Field
            label={language === 'ar' ? 'وصف المنتج بالإنجليزية' : 'English description'}
            help={language === 'ar' ? 'اختياري لتحسين العرض للعملاء باللغة الإنجليزية.' : 'Optional for English users.'}
          >
            <textarea className="input-pro min-h-24" value={form.descriptionEn} onChange={(e) => setForm((p) => ({ ...p, descriptionEn: e.target.value }))} />
          </Field>

          <Field
            label={language === 'ar' ? 'التصنيف *' : 'Category *'}
            help={language === 'ar' ? 'اختر التصنيف الصحيح ليظهر المنتج في الفلاتر المناسبة للتاجر.' : 'Select correct category for trader filters.'}
          >
            <select className="input-pro" required value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}>
              <option value="">{language === 'ar' ? 'اختر التصنيف' : 'Select category'}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {language === 'ar' ? category.nameAr || category.name : category.nameEn || category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={language === 'ar' ? 'السعر الأساسي *' : 'Base price *'}
            help={language === 'ar' ? 'سعر البيع الفعلي الذي سيدفعه التاجر.' : 'Actual selling price paid by trader.'}
          >
            <input className="input-pro" required type="number" min={0.01} step="0.01" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
          </Field>

          <Field
            label={language === 'ar' ? 'سعر قبل الخصم' : 'Compare-at price'}
            help={language === 'ar' ? 'اختياري: إذا أدخلت قيمة أعلى من السعر الأساسي سيظهر الخصم تلقائيًا.' : 'Optional: set higher than base price to display discount.'}
          >
            <input className="input-pro" type="number" min={0.01} step="0.01" value={form.compareAtPrice} onChange={(e) => setForm((p) => ({ ...p, compareAtPrice: e.target.value }))} />
          </Field>

          <Field
            label={language === 'ar' ? 'الكمية المتوفرة *' : 'Available quantity *'}
            help={language === 'ar' ? 'الكمية الحالية في المخزون القابلة للبيع.' : 'Current sellable stock quantity.'}
          >
            <input className="input-pro" required type="number" min={0} value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
          </Field>

          <Field
            label={language === 'ar' ? 'أقل كمية للطلب' : 'Minimum order quantity'}
            help={language === 'ar' ? 'الحد الأدنى الذي يجب على التاجر طلبه.' : 'Minimum quantity required per order.'}
          >
            <input className="input-pro" type="number" min={1} value={form.minOrderQuantity} onChange={(e) => setForm((p) => ({ ...p, minOrderQuantity: e.target.value }))} />
          </Field>

          <Field
            label={language === 'ar' ? 'SKU / رمز المنتج' : 'SKU / Product code'}
            help={language === 'ar' ? 'رمز داخلي لإدارة المخزون والبحث السريع.' : 'Internal stock code for fast lookup.'}
          >
            <input className="input-pro" value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} />
          </Field>

          <Field
            label={language === 'ar' ? 'الوسوم (Tags)' : 'Tags'}
            help={language === 'ar' ? 'افصل الوسوم بفاصلة مثل: غذائي, عضوي, سريع.' : 'Comma-separated tags: food, organic, fast.'}
          >
            <input className="input-pro" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
          </Field>

          <Field
            label={language === 'ar' ? 'حالة المنتج عند الحفظ' : 'Initial status'}
            help={language === 'ar' ? 'مسودة: لا يظهر للتاجر، منشور: يظهر مباشرة، غير نشط: مخفي.' : 'Draft hidden, Published visible, Inactive hidden.'}
          >
            <select className="input-pro" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ProductStatus }))}>
              <option value="DRAFT">{language === 'ar' ? 'مسودة' : 'Draft'}</option>
              <option value="ACTIVE">{language === 'ar' ? 'منشور' : 'Published'}</option>
              <option value="INACTIVE">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
            </select>
          </Field>

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button type="submit" disabled={submitting || loading} className="btn-primary !rounded-lg !px-4 !py-2 disabled:opacity-60">
              {submitting ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : language === 'ar' ? 'حفظ المنتج' : 'Save product'}
            </button>
          </div>
        </form>
      </section>

      <section className="card-pro rounded-xl p-4">
        <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'منتجات المورد' : 'Supplier products'}</h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-app text-muted">
                  <th className="p-2 text-start">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'التصنيف' : 'Category'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'السعر' : 'Price'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'المخزون' : 'Stock'}</th>
                  <th className="p-2 text-start">SKU</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-app/50">
                    <td className="p-2 text-app">{language === 'ar' ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}</td>
                    <td className="p-2 text-muted">{categoryName(item.category)}</td>
                    <td className="p-2 text-muted">{formatSypAmount(item.price, language)}{item.compareAtPrice ? ` / ${formatSypAmount(item.compareAtPrice, language)}` : ''}</td>
                    <td className="p-2 text-muted">{item.quantity} (min {item.minOrderQuantity})</td>
                    <td className="p-2 text-muted">{item.sku || '-'}</td>
                    <td className="p-2 text-muted">{statusBadge[item.status][language]}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <select
                          className="input-pro !w-36 !py-1.5 text-xs"
                          value={rowStatusValue(item)}
                          onChange={(e) =>
                            setStatusDrafts((prev) => ({
                              ...prev,
                              [item.id]: e.target.value as ProductStatus,
                            }))
                          }
                        >
                          <option value="DRAFT">{language === 'ar' ? 'مسودة' : 'Draft'}</option>
                          <option value="ACTIVE">{language === 'ar' ? 'منشور' : 'Published'}</option>
                          <option value="INACTIVE">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
                          <option value="OUT_OF_STOCK">{language === 'ar' ? 'نفذ' : 'Out of stock'}</option>
                          <option value="PENDING_REVIEW">{language === 'ar' ? 'معلق للمراجعة' : 'Pending review'}</option>
                          <option value="REJECTED">{language === 'ar' ? 'مرفوض' : 'Rejected'}</option>
                        </select>
                        <button
                          className="btn-secondary !rounded-md !px-2 !py-1 text-xs"
                          onClick={() => updateStatus(item.id, rowStatusValue(item))}
                        >
                          {language === 'ar' ? 'حفظ الحالة' : 'Save status'}
                        </button>
                        <button className="btn-secondary !rounded-md !px-2 !py-1 text-xs" onClick={() => deleteProduct(item.id)}>
                          {language === 'ar' ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Field({
  label,
  help,
  children,
}: {
  label: string
  help: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-app">{label}</label>
      {children}
      <p className="text-xs text-muted">{help}</p>
    </div>
  )
}
