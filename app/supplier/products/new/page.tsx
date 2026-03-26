'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { useUi } from '@/components/providers/UiProvider'
import { CloudImage } from '@/components/common/CloudImage'

type Category = {
  id: string
  name: string
  nameAr?: string | null
  nameEn?: string | null
  parentId?: string | null
}

type CategoryOption = {
  id: string
  label: string
}

const MAX_IMAGES = 6

function categoryLabel(category: Category, language: 'ar' | 'en') {
  if (language === 'ar') return category.nameAr || category.name || category.nameEn || ''
  return category.nameEn || category.name || category.nameAr || ''
}

function buildCategoryOptions(categories: Category[], language: 'ar' | 'en') {
  const byParent = new Map<string | null, Category[]>()
  for (const category of categories) {
    const parentKey = category.parentId ?? null
    const list = byParent.get(parentKey) ?? []
    list.push(category)
    byParent.set(parentKey, list)
  }

  const sortByLabel = (a: Category, b: Category) =>
    categoryLabel(a, language).localeCompare(categoryLabel(b, language), language === 'ar' ? 'ar' : 'en')

  for (const list of byParent.values()) {
    list.sort(sortByLabel)
  }

  const options: CategoryOption[] = []
  const walk = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId) ?? []
    for (const child of children) {
      const prefix = depth > 0 ? '— '.repeat(depth) : ''
      options.push({ id: child.id, label: `${prefix}${categoryLabel(child, language)}`.trim() })
      walk(child.id, depth + 1)
    }
  }

  walk(null, 0)

  if (!options.length) {
    for (const category of categories) {
      options.push({ id: category.id, label: categoryLabel(category, language) })
    }
  }

  return options
}

export default function SupplierProductCreatePage() {
  const { language } = useUi()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<string[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    categoryId: '',
    price: '',
    compareAtPrice: '',
    quantity: '0',
    minOrderQuantity: '1',
    sku: '',
    tags: '',
    status: 'ACTIVE',
  })

  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true)
      try {
        const response = await fetch('/api/categories', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) {
          setCategories(result.data ?? [])
        }
      } finally {
        setLoadingCategories(false)
      }
    }

    loadCategories()
  }, [])

  const categoryOptions = useMemo(() => buildCategoryOptions(categories, language), [categories, language])

  useEffect(() => {
    if (!form.categoryId && categoryOptions.length) {
      setForm((prev) => ({ ...prev, categoryId: categoryOptions[0].id }))
    }
  }, [form.categoryId, categoryOptions])

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      throw new Error(language === 'ar' ? 'يرجى اختيار ملف صورة فقط' : 'Please choose an image file')
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(language === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 10MB' : 'Image size must be 10MB or less')
    }

    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch('/api/uploads/product-image', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error || (language === 'ar' ? 'فشل رفع الصورة' : 'Image upload failed'))
    }

    return result.data.url as string
  }

  const handleFiles = async (files: File[]) => {
    if (!files.length) return

    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) {
      toast.error(language === 'ar' ? 'تم الوصول للحد الأقصى للصور' : 'Maximum image limit reached')
      return
    }

    const selected = files.slice(0, remaining)
    if (selected.length < files.length) {
      toast((language === 'ar' ? 'سيتم رفع أول ' : 'Uploading first ') + selected.length.toString())
    }

    setUploadingImages(true)
    try {
      for (const file of selected) {
        const url = await uploadImage(file)
        setImages((prev) => [...prev, url])
      }
      toast.success(language === 'ar' ? 'تم رفع الصور بنجاح' : 'Images uploaded successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل رفع الصورة' : 'Upload failed')
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((item) => item !== url))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!form.nameAr.trim()) {
      toast.error(language === 'ar' ? 'اسم المنتج بالعربية مطلوب' : 'Arabic product name is required')
      return
    }

    if (!images.length) {
      toast.error(language === 'ar' ? 'يرجى رفع صورة واحدة على الأقل' : 'Please upload at least one image')
      return
    }

    const price = Number(form.price)
    const compareAtPrice = form.compareAtPrice ? Number(form.compareAtPrice) : undefined
    const quantity = Number(form.quantity)
    const minOrderQuantity = form.minOrderQuantity ? Number(form.minOrderQuantity) : 1

    if (!Number.isFinite(price) || price <= 0) {
      toast.error(language === 'ar' ? 'يرجى إدخال سعر صحيح' : 'Please enter a valid price')
      return
    }

    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error(language === 'ar' ? 'يرجى إدخال كمية صحيحة' : 'Please enter a valid quantity')
      return
    }

    if (!Number.isFinite(minOrderQuantity) || minOrderQuantity < 1) {
      toast.error(language === 'ar' ? 'أقل كمية للطلب يجب أن تكون 1 على الأقل' : 'Minimum order quantity must be at least 1')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim() || undefined,
        descriptionAr: form.descriptionAr.trim() || undefined,
        descriptionEn: form.descriptionEn.trim() || undefined,
        categoryId: form.categoryId || undefined,
        price,
        compareAtPrice: compareAtPrice && compareAtPrice > 0 ? compareAtPrice : undefined,
        quantity,
        minOrderQuantity,
        sku: form.sku.trim() || undefined,
        tags: form.tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        images,
        status: form.status,
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || (language === 'ar' ? 'فشل إنشاء المنتج' : 'Failed to create product'))
      }

      toast.success(language === 'ar' ? 'تم إنشاء المنتج بنجاح' : 'Product created successfully')
      router.push('/supplier/products')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل إنشاء المنتج' : 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <SupplierPageHeader
        titleAr="إضافة منتج جديد"
        titleEn="Add New Product"
        subtitleAr="أدخل تفاصيل منتجك ليظهر للتجار فور اعتماده كنشط."
        subtitleEn="Fill product details to make it visible to traders when active."
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="card-pro rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'بيانات المنتج الأساسية' : 'Basic product details'}</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <label className="text-sm text-muted">{language === 'ar' ? 'اسم المنتج بالعربية' : 'Arabic product name'}</label>
              <input
                className="input-pro mt-2"
                value={form.nameAr}
                onChange={(e) => setForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                placeholder={language === 'ar' ? 'مثال: زيت عباد الشمس 1 لتر' : 'Example: Sunflower oil 1L'}
                required
              />
            </div>
            <div>
              <label className="text-sm text-muted">{language === 'ar' ? 'اسم المنتج بالإنجليزية (اختياري)' : 'English product name (optional)'}</label>
              <input
                className="input-pro mt-2"
                value={form.nameEn}
                onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                placeholder={language === 'ar' ? 'Sunflower Oil 1L' : 'Sunflower Oil 1L'}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="text-sm text-muted">{language === 'ar' ? 'وصف المنتج بالعربية' : 'Arabic description'}</label>
              <textarea
                className="input-pro mt-2 min-h-[120px]"
                value={form.descriptionAr}
                onChange={(e) => setForm((prev) => ({ ...prev, descriptionAr: e.target.value }))}
                placeholder={language === 'ar' ? 'اكتب تفاصيل واضحة حول المنتج، المواصفات، وطرق الاستخدام.' : 'Add clear product details, specifications, and usage.'}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="text-sm text-muted">{language === 'ar' ? 'وصف المنتج بالإنجليزية (اختياري)' : 'English description (optional)'}</label>
              <textarea
                className="input-pro mt-2 min-h-[120px]"
                value={form.descriptionEn}
                onChange={(e) => setForm((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                placeholder={language === 'ar' ? 'English description of the product.' : 'English description of the product.'}
              />
            </div>
          </div>
        </section>

        <section className="card-pro rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'التسعير والمخزون' : 'Pricing & inventory'}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm text-muted">{language === 'ar' ? 'السعر' : 'Price'}</label>
              <input
                className="input-pro mt-2"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-muted">{language === 'ar' ? 'سعر قبل الخصم (اختياري)' : 'Compare at price (optional)'}</label>
              <input
                className="input-pro mt-2"
                type="number"
                min="0"
                step="0.01"
                value={form.compareAtPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, compareAtPrice: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-muted">{language === 'ar' ? 'الكمية المتاحة' : 'Available quantity'}</label>
              <input
                className="input-pro mt-2"
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-muted">{language === 'ar' ? 'أقل كمية للطلب' : 'Minimum order quantity'}</label>
              <input
                className="input-pro mt-2"
                type="number"
                min="1"
                step="1"
                value={form.minOrderQuantity}
                onChange={(e) => setForm((prev) => ({ ...prev, minOrderQuantity: e.target.value }))}
              />
            </div>
          </div>
        </section>

        <section className="card-pro rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'التصنيف والمعرفات' : 'Category & identifiers'}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-muted">{language === 'ar' ? 'التصنيف' : 'Category'}</label>
              <select
                className="input-pro mt-2"
                value={form.categoryId}
                onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                disabled={loadingCategories}
              >
                {loadingCategories ? (
                  <option>{language === 'ar' ? 'جارٍ تحميل التصنيفات...' : 'Loading categories...'}</option>
                ) : categoryOptions.length ? (
                  categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))
                ) : (
                  <option>{language === 'ar' ? 'لا توجد تصنيفات متاحة' : 'No categories available'}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted">{language === 'ar' ? 'رمز SKU (اختياري)' : 'SKU (optional)'}</label>
              <input
                className="input-pro mt-2"
                value={form.sku}
                onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                placeholder={language === 'ar' ? 'مثال: SKU-001' : 'Example: SKU-001'}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted">{language === 'ar' ? 'الوسوم (افصل بفواصل)' : 'Tags (comma separated)'}</label>
              <input
                className="input-pro mt-2"
                value={form.tags}
                onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder={language === 'ar' ? 'زيت, طبخ, منزلي' : 'oil, cooking, kitchen'}
              />
            </div>
          </div>
        </section>

        <section className="card-pro rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'صور المنتج' : 'Product images'}</h2>
              <p className="mt-1 text-sm text-muted">
                {language === 'ar'
                  ? 'ارفع حتى 6 صور عالية الجودة ليظهر المنتج باحترافية. الصور تُرفع إلى Cloudinary.'
                  : 'Upload up to 6 high-quality images. Images are stored on Cloudinary.'}
              </p>
            </div>
            <div className="text-sm text-muted">
              {language === 'ar' ? `عدد الصور: ${images.length}/${MAX_IMAGES}` : `Images: ${images.length}/${MAX_IMAGES}`}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((url) => (
              <div key={url} className="relative">
                <CloudImage src={url} alt="product" width={420} height={300} className="h-40 w-full rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute end-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs text-app shadow"
                >
                  {language === 'ar' ? 'إزالة' : 'Remove'}
                </button>
              </div>
            ))}
            {images.length === 0 && (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-app text-sm text-muted">
                {language === 'ar' ? 'لم يتم رفع صور بعد' : 'No images uploaded yet'}
              </div>
            )}
          </div>

          <div className="mt-4">
            <input
              type="file"
              accept="image/*"
              multiple
              className="input-pro"
              disabled={uploadingImages}
              onChange={(e) => {
                const files = e.currentTarget.files ? Array.from(e.currentTarget.files) : []
                e.currentTarget.value = ''
                void handleFiles(files)
              }}
            />
            <p className="mt-2 text-xs text-muted">
              {uploadingImages
                ? language === 'ar'
                  ? 'جارٍ رفع الصور...' : 'Uploading images...'
                : language === 'ar'
                  ? 'يفضل صور بأبعاد 1200x900 أو أعلى.'
                  : 'Recommended size: 1200x900 or higher.'}
            </p>
          </div>
        </section>

        <section className="card-pro rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'نشر المنتج' : 'Publishing'}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-muted">{language === 'ar' ? 'حالة المنتج' : 'Product status'}</label>
              <select
                className="input-pro mt-2"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="ACTIVE">{language === 'ar' ? 'نشط - يظهر للتجار' : 'Active - visible to traders'}</option>
                <option value="INACTIVE">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
                <option value="DRAFT">{language === 'ar' ? 'مسودة' : 'Draft'}</option>
              </select>
            </div>
            <div className="text-sm text-muted">
              {language === 'ar'
                ? 'عند اختيار الحالة نشط سيتم عرض المنتج للتجار مباشرة.'
                : 'Active status will show the product to traders immediately.'}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            className="btn-secondary !rounded-lg !px-4 !py-2 text-sm"
            onClick={() => router.push('/supplier/products')}
          >
            {language === 'ar' ? 'رجوع للمنتجات' : 'Back to products'}
          </button>
          <button
            type="submit"
            className="btn-primary !rounded-lg !px-4 !py-2 text-sm disabled:opacity-60"
            disabled={submitting || uploadingImages}
          >
            {submitting
              ? language === 'ar'
                ? 'جارٍ الحفظ...' : 'Saving...'
              : language === 'ar'
                ? 'حفظ المنتج'
                : 'Save product'}
          </button>
        </div>
      </form>
    </div>
  )
}
