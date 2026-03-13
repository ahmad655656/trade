'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUi } from '@/components/providers/UiProvider'
import { Search, Award, Star, User, Sparkles, ShieldCheck, Clock } from 'lucide-react'
import type { SearchableItem } from '@/lib/ai-search-client'

export default function SearchClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { language } = useUi()
  const isArabic = language === 'ar'

  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchableItem[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [type, setType] = useState<'all' | 'products' | 'suppliers' | 'traders'>('all')
  const [page, setPage] = useState(1)

  const search = useCallback(async (newQuery = query, newType = type, newPage = 1) => {
    if (newQuery.length < 2) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: newQuery,
        type: newType,
        limit: '20',
        page: newPage.toString(),
      })
      const res = await fetch(`/api/search/data?${params}`)
      const data = await res.json()
      if (data.success) {
        setResults(data.data)
        setTotal(data.total)
      }
    } catch {
      // Error
    } finally {
      setLoading(false)
    }
  }, [query, type])

  useEffect(() => {
    search(initialQuery)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/search?q=${encodeURIComponent(query)}`)
    setPage(1)
    search(query, type, 1)
  }

  const resultsPerPage = 20
  const totalPages = Math.ceil(total / resultsPerPage)

  const typeButtonClass = (value: typeof type) =>
    `inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition ${
      type === value
        ? 'border-transparent bg-[var(--app-primary)] text-white shadow'
        : 'border-app text-app hover:bg-[color-mix(in_oklab,var(--app-surface)_85%,transparent)]'
    }`

  const getTypeLabel = (value: SearchableItem['type']) => {
    if (isArabic) {
      if (value === 'product') return 'منتج'
      if (value === 'supplier') return 'مورد'
      if (value === 'trader') return 'تاجر'
      return 'فئة'
    }
    if (value === 'product') return 'Product'
    if (value === 'supplier') return 'Supplier'
    if (value === 'trader') return 'Trader'
    return 'Category'
  }

  const getTypeDotClass = (value: SearchableItem['type']) => {
    if (value === 'product') return 'bg-[var(--app-primary)]'
    if (value === 'supplier') return 'bg-emerald-500'
    if (value === 'trader') return 'bg-purple-500'
    return 'bg-amber-500'
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <section className="card-pro relative overflow-hidden rounded-3xl p-6 md:p-10">
          <div className="pointer-events-none absolute -top-28 right-10 h-56 w-56 rounded-full bg-[color-mix(in_oklab,var(--app-primary)_18%,transparent)] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-8 h-32 w-32 rounded-full bg-[color-mix(in_oklab,var(--app-primary)_12%,transparent)] blur-2xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-app bg-[color-mix(in_oklab,var(--app-surface)_82%,transparent)] px-3 py-1 text-xs font-semibold text-app">
                <Sparkles className="h-3.5 w-3.5" />
                {isArabic ? 'بحث ذكي' : 'Smart Search'}
              </div>
              <h1 className="mt-4 text-3xl font-bold text-app md:text-4xl">
                {isArabic ? 'ابحث عن منتجات وموردين وتجار' : 'Search products, suppliers, and traders'}
              </h1>
              <p className="mt-2 max-w-2xl text-muted">
                {isArabic
                  ? 'نتائج دقيقة بسرعة مع فلترة هادئة تناسب احتياجك.'
                  : 'Accurate results fast, with calm filters tailored to your needs.'}
              </p>

              <form onSubmit={handleSearch} className="mt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <div
                      className={`flex items-center gap-2 rounded-2xl border border-app bg-[color-mix(in_oklab,var(--app-surface)_90%,transparent)] px-3 py-2 shadow-sm ${
                        isArabic ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <Search className="h-5 w-5 text-muted" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={isArabic ? 'ابحث عن منتج أو مورد أو تاجر...' : 'Search for a product, supplier, or trader...'}
                        className={`w-full bg-transparent text-sm text-app placeholder:text-muted focus:outline-none md:text-base ${
                          isArabic ? 'text-right' : 'text-left'
                        }`}
                        dir={isArabic ? 'rtl' : 'ltr'}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary w-full px-6 py-3 text-sm md:text-base sm:w-auto">
                    {isArabic ? 'بحث' : 'Search'}
                  </button>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span className="rounded-full border border-app bg-[color-mix(in_oklab,var(--app-surface)_85%,transparent)] px-3 py-1">
                  {isArabic ? 'منتجات • موردون • تجار' : 'Products • Suppliers • Traders'}
                </span>
                {total > 0 && (
                  <span className="rounded-full border border-app bg-[color-mix(in_oklab,var(--app-surface)_85%,transparent)] px-3 py-1">
                    {isArabic ? `عدد النتائج: ${total}` : `${total} results`}
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setType('all')
                    setPage(1)
                    search(query, 'all', 1)
                  }}
                  className={typeButtonClass('all')}
                >
                  {isArabic ? 'الكل' : 'All'}
                </button>
                <button
                  onClick={() => {
                    setType('products')
                    setPage(1)
                    search(query, 'products', 1)
                  }}
                  className={typeButtonClass('products')}
                >
                  {isArabic ? 'منتجات' : 'Products'}
                </button>
                <button
                  onClick={() => {
                    setType('suppliers')
                    setPage(1)
                    search(query, 'suppliers', 1)
                  }}
                  className={typeButtonClass('suppliers')}
                >
                  {isArabic ? 'موردون' : 'Suppliers'}
                </button>
                <button
                  onClick={() => {
                    setType('traders')
                    setPage(1)
                    search(query, 'traders', 1)
                  }}
                  className={typeButtonClass('traders')}
                >
                  {isArabic ? 'تجار' : 'Traders'}
                </button>
              </div>
            </div>

            <div
              className="card-pro rounded-2xl p-5 md:p-6 animate-fade-in-up"
              style={{ animationDelay: '120ms' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {isArabic ? 'مزايا البحث' : 'Search Highlights'}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-app">
                    {isArabic ? 'تجربة هادئة وواضحة' : 'Calm, focused discovery'}
                  </h3>
                </div>
                <span className="rounded-full border border-app px-3 py-1 text-xs text-muted">
                  {isArabic ? 'متوازن' : 'Balanced'}
                </span>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--app-primary)_14%,transparent)] text-[var(--app-primary)]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-app">
                      {isArabic ? 'نتائج دقيقة' : 'High precision'}
                    </p>
                    <p className="text-xs text-muted">
                      {isArabic ? 'فلترة ذكية تقلل النتائج غير المناسبة.' : 'Smart filters cut irrelevant noise.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--app-primary)_14%,transparent)] text-[var(--app-primary)]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-app">
                      {isArabic ? 'استجابة سريعة' : 'Fast response'}
                    </p>
                    <p className="text-xs text-muted">
                      {isArabic ? 'نتائج فورية حتى مع بحث متعدد الأنواع.' : 'Instant results across multiple types.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--app-primary)_14%,transparent)] text-[var(--app-primary)]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-app">
                      {isArabic ? 'تغطية متوازنة' : 'Balanced coverage'}
                    </p>
                    <p className="text-xs text-muted">
                      {isArabic ? 'نتائج موحدة للمنتجات والموردين والتجار.' : 'Unified results for products, suppliers, and traders.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="container mx-auto px-4 pb-16">
        <main className="animate-fade-in-up">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-app">
                  {isArabic ? 'النتائج' : 'Results'}
                </h2>
                <p className="text-sm text-muted">
                  {isArabic ? `عدد النتائج: ${total}` : `${total} results`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="card-pro animate-pulse rounded-2xl p-4">
                    <div className="h-12 w-12 rounded-xl bg-[color-mix(in_oklab,var(--app-surface)_80%,transparent)]" />
                    <div className="mt-4 h-4 w-3/4 rounded bg-[color-mix(in_oklab,var(--app-surface)_80%,transparent)]" />
                    <div className="mt-2 h-3 w-2/3 rounded bg-[color-mix(in_oklab,var(--app-surface)_80%,transparent)]" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="card-pro rounded-2xl p-10 text-center">
                <Search className="mx-auto h-12 w-12 text-muted" />
                <h3 className="mt-4 text-lg font-semibold text-app">
                  {isArabic ? 'لا توجد نتائج' : 'No results found'}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {isArabic
                    ? `لا توجد نتائج لـ "${query}". جرّب كلمات أخرى.`
                    : `No matches for "${query}". Try different words.`}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((item) => {
                    const showScore = typeof item.score === 'number'
                    const showRating = typeof item.rating === 'number'
                    const showPrice = item.type === 'product' && item.price !== undefined

                    return (
                      <Link
                        key={item.id}
                        href={item.url}
                        className="card-pro group flex h-full flex-col gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="flex items-start gap-3">
                          {item.image ? (
                            <div className="h-12 w-12 overflow-hidden rounded-xl bg-[color-mix(in_oklab,var(--app-surface)_85%,transparent)]">
                              <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]">
                              {item.type === 'product' ? (
                                <Award className="h-6 w-6" />
                              ) : item.type === 'supplier' ? (
                                <Star className="h-6 w-6" />
                              ) : (
                                <User className="h-6 w-6" />
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full border border-app px-2 py-0.5 text-[11px] text-muted">
                                <span className={`h-1.5 w-1.5 rounded-full ${getTypeDotClass(item.type)}`} />
                                {getTypeLabel(item.type)}
                              </span>
                              {showPrice && (
                                <span className="rounded-full border border-app px-2 py-0.5 text-[11px] text-app">
                                  {isArabic ? `${Math.round(item.price || 0)} ل.س` : `${Math.round(item.price || 0)} SYP`}
                                </span>
                              )}
                            </div>
                            <h3 className="mt-2 line-clamp-2 text-base font-semibold text-app group-hover:text-[var(--app-primary)]">
                              {item.title}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-sm text-muted">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {showScore && (
                          <div className="mt-auto">
                            <div className="flex items-center justify-between text-xs text-muted">
                              <span>{isArabic ? 'درجة التطابق' : 'Match score'}</span>
                              <span className="font-semibold text-app">{item.score}%</span>
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-[color-mix(in_oklab,var(--app-surface)_80%,transparent)]">
                              <div
                                className="h-1.5 rounded-full bg-[var(--app-primary)]"
                                style={{ width: `${item.score}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {showRating && (
                          <div className="flex items-center gap-1 text-xs text-muted">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            <span>{item.rating?.toFixed(1)}</span>
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted">
                      {isArabic ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const nextPage = Math.max(page - 1, 1)
                          setPage(nextPage)
                          search(query, type, nextPage)
                        }}
                        disabled={page === 1}
                        className="btn-secondary disabled:opacity-50"
                      >
                        {isArabic ? 'السابق' : 'Previous'}
                      </button>
                      <button
                        onClick={() => {
                          const nextPage = Math.min(page + 1, totalPages)
                          setPage(nextPage)
                          search(query, type, nextPage)
                        }}
                        disabled={page === totalPages}
                        className="btn-secondary disabled:opacity-50"
                      >
                        {isArabic ? 'التالي' : 'Next'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
        </main>
      </div>
    </div>
  )
}
