'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useUi } from '@/components/providers/UiProvider'
import { SupplierListItem, SuppliersApiResponse } from '@/types'

type SuppliersPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const params = use(searchParams)
  const { language } = useUi()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SuppliersApiResponse | null>(null)
  const [search, setSearch] = useState('')

  const currentPage = Number(params.page) || 1
  const sort = (params.sort as string) || 'newest'
  const verifiedOnly = params.verifiedOnly === '1'

  const fetchSuppliers = async (page: number, searchTerm: string) => {
    setLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', String(page))
      queryParams.set('limit', '12')
      queryParams.set('sort', sort)
      if (verifiedOnly) queryParams.set('verifiedOnly', '1')
      if (searchTerm) queryParams.set('search', searchTerm)

      const response = await fetch(`/api/suppliers?${queryParams.toString()}`, {
        cache: 'no-store',
      })
      const result = await response.json()

      if (response.ok && result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch suppliers')
      }
    } catch (err) {
      setError(language === 'ar' ? 'حدث خطأ في جلب البيانات' : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers(currentPage, search)
  }, [currentPage, sort, verifiedOnly])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSuppliers(1, search)
  }

  const getPageUrl = (page: number) => {
    const query = new URLSearchParams()
    query.set('page', String(page))
    if (sort !== 'newest') query.set('sort', sort)
    if (verifiedOnly) query.set('verifiedOnly', '1')
    return `/suppliers?${query.toString()}`
  }

  const content = {
    ar: {
      title: 'الموردون المعتمدون',
      description: 'اكتشف موردين موثّقين مع مؤشرات الثقة والتقييم والنشاط التجاري.',
      searchPlaceholder: 'ابحث عن مورد...',
      products: 'منتج',
      products_plural: 'منتجات',
      rating: 'التقييم',
      reviews: 'تقييم',
      viewProfile: 'عرض الملف',
      noSuppliers: 'لا يوجد موردون',
      noSuppliersDesc: 'لم يتم العثور على موردين',
      verified: 'موثّق',
      all: 'الكل',
      sortNewest: 'الأحدث',
      sortRating: 'الأعلى تقييماً',
      sortProducts: 'الأكثر منتجات',
      verifiedOnly: 'موثقين فقط',
      page: 'صفحة',
      of: 'من',
      previous: 'السابق',
      next: 'التالي',
    },
    en: {
      title: 'Verified Suppliers',
      description: 'Discover verified suppliers with trust signals, ratings, and activity insights.',
      searchPlaceholder: 'Search for a supplier...',
      products: 'product',
      products_plural: 'products',
      rating: 'Rating',
      reviews: 'review',
      reviews_plural: 'reviews',
      viewProfile: 'View Profile',
      noSuppliers: 'No Suppliers',
      noSuppliersDesc: 'No suppliers found matching your search',
      verified: 'Verified',
      all: 'All',
      sortNewest: 'Newest',
      sortRating: 'Top Rated',
      sortProducts: 'Most Products',
      verifiedOnly: 'Verified Only',
      page: 'Page',
      of: 'of',
      previous: 'Previous',
      next: 'Next',
    },
  }

  const t = content[language]

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalf = rating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <svg key={`full-${i}`} className="h-4 w-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        {hasHalf && (
          <svg className="h-4 w-4" viewBox="0 0 20 20">
            <defs>
              <linearGradient id="halfGradient">
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#d1d5db" />
              </linearGradient>
            </defs>
            <path fill="url(#halfGradient)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <svg key={`empty-${i}`} className="h-4 w-4 fill-gray-300 text-gray-300" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm font-medium text-amber-600">{rating.toFixed(1)}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="card-pro space-y-4 rounded-2xl p-6 md:p-8">
        <h1 className="text-3xl font-bold text-app">{t.title}</h1>
        <p className="text-muted">{t.description}</p>
      </section>

      {/* Filters */}
      <section className="card-pro rounded-xl p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="input-pro flex-1"
            />
            <button type="submit" className="btn-pro-primary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          {/* Sort & Filter */}
          <div className="flex flex-wrap gap-2">
            <select
              value={sort}
              onChange={(e) => {
                const query = new URLSearchParams()
                query.set('page', '1')
                query.set('sort', e.target.value)
                if (verifiedOnly) query.set('verifiedOnly', '1')
                window.location.href = `/suppliers?${query.toString()}`
              }}
              className="input-pro"
            >
              <option value="newest">{t.sortNewest}</option>
              <option value="rating">{t.sortRating}</option>
              <option value="products">{t.sortProducts}</option>
            </select>

            <button
              onClick={() => {
                const query = new URLSearchParams()
                query.set('page', '1')
                query.set('sort', sort)
                if (!verifiedOnly) query.set('verifiedOnly', '1')
                window.location.href = `/suppliers?${query.toString()}`
              }}
              className={`btn-pro ${
                verifiedOnly
                  ? 'bg-primary text-white'
                  : 'bg-[color-mix(in_oklab,var(--app-surface)_85%,transparent)] text-app/80 hover:bg-[color-mix(in_oklab,var(--app-surface)_75%,transparent)] hover:text-app'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {t.verifiedOnly}
            </button>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card-pro animate-pulse rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
              <div className="mt-4 h-3 w-full rounded bg-gray-200" />
              <div className="mt-2 h-3 w-2/3 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card-pro rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Suppliers Grid */}
      {!loading && !error && data && (
        <>
          {data.suppliers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.suppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  renderStars={renderStars}
                  t={t}
                  language={language}
                />
              ))}
            </div>
          ) : (
            <div className="card-pro rounded-xl p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-app">{t.noSuppliers}</h3>
              <p className="mt-1 text-muted">{t.noSuppliersDesc}</p>
            </div>
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">
                {t.page} {data.pagination.page} {t.of} {data.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                {data.pagination.page > 1 && (
                  <Link href={getPageUrl(data.pagination.page - 1)} className="btn-pro">
                    {t.previous}
                  </Link>
                )}
                {data.pagination.page < data.pagination.totalPages && (
                  <Link href={getPageUrl(data.pagination.page + 1)} className="btn-pro">
                    {t.next}
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SupplierCard({
  supplier,
  renderStars,
  t,
  language,
}: {
  supplier: SupplierListItem
  renderStars: (rating: number) => React.ReactNode
  t: (typeof content)['ar']
  language: 'ar' | 'en'
}) {
  return (
    <Link href={`/suppliers/${supplier.id}`} className="group card-pro block rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-primary/10">
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {supplier.logo ? (
            <Image
              src={supplier.logo}
              alt={supplier.companyName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-app group-hover:text-primary">
              {supplier.companyName}
            </h3>
            {supplier.verified && (
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600">
                {t.verified}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{supplier.user.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {language === 'ar' ? 'المنتجات' : 'Products'}
          </span>
          <span className="font-semibold text-app">
            {supplier.totalProducts}{' '}
            <span className="font-normal text-muted">
              {supplier.totalProducts === 1 ? t.products : t.products_plural}
            </span>
          </span>
        </div>

        {renderStars(supplier.rating)}

        {supplier.totalReviews > 0 && (
          <p className="text-xs text-muted">
            {supplier.totalReviews} {language === 'ar' ? 'تقييم' : supplier.totalReviews === 1 ? t.reviews : 'reviews'}
          </p>
        )}
      </div>

      {/* View Button */}
      <div className="mt-4">
        <span className="btn-pro-primary block w-full text-center text-sm">
          {t.viewProfile}
        </span>
      </div>
    </Link>
  )
}

const content = {
  ar: {
    title: 'الموردون المعتمدون',
    description: 'اكتشف موردين موثّقين مع مؤشرات الثقة والتقييم والنشاط التجاري.',
    searchPlaceholder: 'ابحث عن مورد...',
    products: 'منتج',
    products_plural: 'منتجات',
    rating: 'التقييم',
    reviews: 'تقييم',
    viewProfile: 'عرض الملف',
    noSuppliers: 'لا يوجد موردون',
    noSuppliersDesc: 'لم يتم العثور على موردين',
    verified: 'موثّق',
    all: 'الكل',
    sortNewest: 'الأحدث',
    sortRating: 'الأعلى تقييماً',
    sortProducts: 'الأكثر منتجات',
    verifiedOnly: 'موثقين فقط',
    page: 'صفحة',
    of: 'من',
    previous: 'السابق',
    next: 'التالي',
  },
  en: {
    title: 'Verified Suppliers',
    description: 'Discover verified suppliers with trust signals, ratings, and activity insights.',
    searchPlaceholder: 'Search for a supplier...',
    products: 'product',
    products_plural: 'products',
    rating: 'Rating',
    reviews: 'review',
    reviews_plural: 'reviews',
    viewProfile: 'View Profile',
    noSuppliers: 'No Suppliers',
    noSuppliersDesc: 'No suppliers found matching your search',
    verified: 'Verified',
    all: 'All',
    sortNewest: 'Newest',
    sortRating: 'Top Rated',
    sortProducts: 'Most Products',
    verifiedOnly: 'Verified Only',
    page: 'Page',
    of: 'of',
    previous: 'Previous',
    next: 'Next',
  },
}
