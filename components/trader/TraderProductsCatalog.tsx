'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { HeartIcon } from '@heroicons/react/24/outline'
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
  rating: number
  soldCount: number
  createdAt: string
  categoryId: string
  supplierId: string
  sku: string | null
  minOrderQuantity: number
  images: string[]
  category: { nameAr: string | null; nameEn: string | null; name: string }
  supplier: { user: { name: string } }
}

type Category = {
  id: string
  name: string
  nameAr: string | null
  nameEn: string | null
}

export default function TraderProductsCatalog() {
  const { language } = useUi()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minOrderQuantity, setMinOrderQuantity] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [ratingMin, setRatingMin] = useState('')
  const [inStock, setInStock] = useState(true)
  const [sort, setSort] = useState('newest')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [addingId, setAddingId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '120')
      params.set('sort', sort)
      if (search.trim()) params.set('search', search.trim())
      if (minPrice.trim()) params.set('minPrice', minPrice)
      if (maxPrice.trim()) params.set('maxPrice', maxPrice)
      if (minOrderQuantity.trim()) params.set('minOrderQuantity', minOrderQuantity)
      if (supplierId) params.set('supplierId', supplierId)
      if (categoryIds.length) params.set('categoryIds', categoryIds.join(','))
      if (ratingMin.trim()) params.set('ratingMin', ratingMin)
      if (inStock) params.set('inStock', '1')

      const response = await fetch(`/api/products?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) setProducts(result.data ?? [])
      else setProducts([])
    } finally {
      setLoading(false)
    }
  }, [categoryIds, inStock, maxPrice, minOrderQuantity, minPrice, ratingMin, search, sort, supplierId])

  const loadCategories = useCallback(async () => {
    const response = await fetch('/api/categories', { cache: 'no-store' })
    const result = await response.json()
    if (response.ok && result.success) {
      setCategories(result.data ?? [])
    }
  }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    const query = search.trim()
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    let cancelled = false
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/products/suggestions?q=${encodeURIComponent(query)}`, { cache: 'no-store' })
        const result = await response.json()
        if (!cancelled && response.ok && result.success) {
          setSuggestions(result.data ?? [])
        }
      } catch {
        if (!cancelled) setSuggestions([])
      }
    }, 180)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [search])

  const suppliers = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of products) map.set(item.supplierId, item.supplier.user.name)
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [products])

  const addToCart = async (productId: string) => {
    setAddingId(productId)
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to add to cart')
      toast.success(language === 'ar' ? 'تمت إضافة المنتج للسلة' : 'Added to cart')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل الإضافة' : 'Failed to add')
    } finally {
      setAddingId(null)
    }
  }

  const addToWishlist = async (productId: string) => {
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to add wishlist')
      toast.success(language === 'ar' ? 'تمت إضافته للمفضلة' : 'Added to wishlist')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل الإضافة للمفضلة' : 'Failed to add wishlist')
    }
  }

  return (
    <div className="space-y-4">
      <section className="card-pro rounded-xl p-4 space-y-3">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-7">
          <input
            className="input-pro"
            list="product-suggestions"
            placeholder={language === 'ar' ? 'بحث بالاسم' : 'Search by name'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <datalist id="product-suggestions">
            {suggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <input className="input-pro" placeholder={language === 'ar' ? 'أقل سعر' : 'Min price'} type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          <input className="input-pro" placeholder={language === 'ar' ? 'أعلى سعر' : 'Max price'} type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          <input
            className="input-pro"
            placeholder={language === 'ar' ? 'حد أدنى للطلب <=' : 'Max MOQ'}
            type="number"
            min={1}
            value={minOrderQuantity}
            onChange={(e) => setMinOrderQuantity(e.target.value)}
          />
          <select className="input-pro" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">{language === 'ar' ? 'كل الموردين' : 'All suppliers'}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input className="input-pro" placeholder={language === 'ar' ? 'تقييم من' : 'Rating min'} type="number" min={0} max={5} step="0.1" value={ratingMin} onChange={(e) => setRatingMin(e.target.value)} />
          <select className="input-pro" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">{language === 'ar' ? 'الأحدث' : 'Newest'}</option>
            <option value="price_asc">{language === 'ar' ? 'الأقل سعرًا' : 'Lowest price'}</option>
            <option value="price_desc">{language === 'ar' ? 'الأعلى سعرًا' : 'Highest price'}</option>
            <option value="best_selling">{language === 'ar' ? 'الأكثر مبيعاً' : 'Best selling'}</option>
            <option value="top_rated">{language === 'ar' ? 'الأعلى تقييماً' : 'Top rated'}</option>
            <option value="discount_desc">{language === 'ar' ? 'الأكثر توفيراً' : 'Most savings'}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            multiple
            className="input-pro min-h-24 min-w-[220px]"
            value={categoryIds}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value)
              setCategoryIds(selected)
            }}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {language === 'ar' ? category.nameAr || category.name : category.nameEn || category.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
            {language === 'ar' ? 'متوفر فقط' : 'In stock only'}
          </label>
          <button className="btn-secondary !rounded-lg !px-3 !py-2 text-sm" onClick={loadProducts}>{language === 'ar' ? 'تطبيق الفلاتر' : 'Apply filters'}</button>
          <button
            className="btn-secondary !rounded-lg !px-3 !py-2 text-sm"
            onClick={() => {
              setSearch('')
              setMinPrice('')
              setMaxPrice('')
              setMinOrderQuantity('')
              setSupplierId('')
              setRatingMin('')
              setCategoryIds([])
              setInStock(true)
              setSort('newest')
            }}
          >
            {language === 'ar' ? 'إعادة ضبط' : 'Reset'}
          </button>
        </div>
      </section>

      {loading ? (
        <section className="card-pro rounded-xl p-6 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</section>
      ) : products.length === 0 ? (
        <section className="card-pro rounded-xl p-6 text-sm text-muted">{language === 'ar' ? 'لا توجد منتجات منشورة' : 'No published products'}</section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const hasDiscount = !!product.compareAtPrice && product.compareAtPrice > product.price
            const discountValue = hasDiscount ? product.compareAtPrice! - product.price : 0
            const discountPercent = hasDiscount ? Math.round((discountValue / product.compareAtPrice!) * 100) : 0
            const stockState = product.quantity > 10 ? (language === 'ar' ? 'متوفر' : 'In stock') : product.quantity > 0 ? (language === 'ar' ? 'مخزون منخفض' : 'Low stock') : (language === 'ar' ? 'نفد' : 'Out of stock')
            const categoryName = language === 'ar' ? product.category?.nameAr || product.category?.name || '-' : product.category?.nameEn || product.category?.name || '-'

            return (
              <article key={product.id} className="card-pro rounded-xl p-4">
                <CloudImage
                  src={product.images?.[0]}
                  alt={(language === 'ar' ? product.nameAr ?? product.nameEn : product.nameEn ?? product.nameAr) ?? ''}
                  width={400}
                  height={300}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <p className="mt-3 font-semibold text-app">{language === 'ar' ? product.nameAr || product.nameEn : product.nameEn || product.nameAr}</p>
                <p className="text-xs text-muted">{language === 'ar' ? `المورد: ${product.supplier.user.name}` : `Supplier: ${product.supplier.user.name}`}</p>
                <p className="text-xs text-muted">{language === 'ar' ? `التصنيف: ${categoryName}` : `Category: ${categoryName}`}</p>
                <p className="text-xs text-muted">SKU: {product.sku || '-'}</p>

                <div className="mt-2 flex items-center gap-2">
                  <p className="text-base font-semibold text-app">{formatSypAmount(product.price, language)}</p>
                  {hasDiscount ? <p className="text-xs text-emerald-600">-{formatSypAmount(discountValue, language)} ({discountPercent}%)</p> : null}
                </div>
                {hasDiscount ? <p className="text-xs text-muted line-through">{formatSypAmount(product.compareAtPrice ?? 0, language)}</p> : null}

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                  <p>{language === 'ar' ? `التقييم: ${product.rating.toFixed(1)}` : `Rating: ${product.rating.toFixed(1)}`}</p>
                  <p>{language === 'ar' ? `المبيعات: ${product.soldCount}` : `Sold: ${product.soldCount}`}</p>
                  <p>{language === 'ar' ? `المخزون: ${product.quantity}` : `Stock: ${product.quantity}`}</p>
                  <p>{stockState}</p>
                  <p>{language === 'ar' ? `أقل طلب: ${product.minOrderQuantity}` : `Min order: ${product.minOrderQuantity}`}</p>
                  <p>{new Date(product.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button className="btn-primary !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60" disabled={addingId === product.id || product.quantity < 1} onClick={() => addToCart(product.id)}>
                    {addingId === product.id ? (language === 'ar' ? 'جارٍ...' : '...') : language === 'ar' ? 'أضف للسلة' : 'Add to cart'}
                  </button>
                  <button className="btn-secondary !rounded-lg !px-2 !py-2 text-sm" onClick={() => addToWishlist(product.id)}>
                    <HeartIcon className="h-4 w-4" />
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
