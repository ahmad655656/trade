'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUi } from '@/components/providers/UiProvider'
import { Search, Filter, ChevronLeft, ChevronRight, Loader2, Award, Star } from 'lucide-react'
import type { SearchableItem } from '@/lib/ai-search-client'

export default function SearchClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { language, t } = useUi()
  
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchableItem[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [type, setType] = useState<'all' | 'products' | 'suppliers'>('all')
  const [page, setPage] = useState(1)
  const [categoryId, setCategoryId] = useState<string>('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [showFilters, setShowFilters] = useState(false)

  const categories = [
    { id: 'food-beverages', nameAr: 'الأغذية والمشروبات', nameEn: 'Food & Beverages' },
    { id: 'electronics-appliances', nameAr: 'الإلكترونيات', nameEn: 'Electronics' },
    { id: 'fashion-clothing', nameAr: 'الألبسة', nameEn: 'Fashion' },
    // Add more from lib/default-categories.ts
  ]

  const search = useCallback(async (newQuery = query, newType = type, newPage = 1) => {
    if (newQuery.length < 2) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: newQuery,
        type: newType,
        limit: '20',
        page: newPage.toString(),
        ...(categoryId && { categoryId }),
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
  }, [query, type, categoryId])

  useEffect(() => {
    search(initialQuery)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/search?q=${encodeURIComponent(query)}`)
    search(query)
  }

  const resultsPerPage = 20
  const totalPages = Math.ceil(total / resultsPerPage)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      {/* Hero Search */}
      <div className="border-b border-border bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <div className="text-center">
            <h1 className="mb-4 inline-block bg-gradient-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-4xl font-bold text-transparent lg:text-5xl">
              {language === 'ar' ? 'البحث المتقدم' : 'Advanced Search'}
            </h1>
            <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted h-5 w-5" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={language === 'ar' ? 'ابحث عن منتجات، موردين... ' : 'Search products, suppliers...'}
                    className="w-full rounded-xl border border-border bg-background pl-11 pr-12 py-4 text-lg ring-offset-background placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary/90">
                    {language === 'ar' ? 'ابحث' : 'Search'}
                  </button>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="grid h-14 w-14 place-items-center rounded-xl border border-border bg-background text-muted transition-all hover:bg-primary hover:text-white lg:hidden"
                >
                  <Filter className="h-5 w-5" />
                </button>
              </div>
            </form>
            <p className="mt-4 text-muted">
              {language === 'ar' ? `تم العثور على ${total} نتيجة` : `Found ${total} results`}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          {/* Filters Sidebar */}
          <div className="lg:sticky lg:top-24 lg:h-fit lg:self-start">
            <div className="rounded-2xl border border-border bg-background p-6 shadow-lg">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="mb-6 flex w-full items-center justify-between text-left lg:hidden"
              >
                <span className="font-bold">
                  {language === 'ar' ? 'الفلاتر' : 'Filters'}
                </span>
                <ChevronLeft className={`h-5 w-5 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
              </button>
              
              {showFilters && (
                <div className="space-y-6 lg:block">
                  {/* Type Filter */}
                  <div>
                    <h3 className="mb-3 font-bold">{language === 'ar' ? 'النوع' : 'Type'}</h3>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                      <button
                        onClick={() => setType('all')}
                        className={`flex items-center gap-2 rounded-xl p-3 text-sm transition-all ${
                          type === 'all'
                            ? 'bg-primary text-white shadow-md'
                            : 'border border-border hover:bg-muted'
                        }`}
                      >
                        {language === 'ar' ? 'الكل' : 'All'}
                      </button>
                      <button
                        onClick={() => setType('products')}
                        className={`flex items-center gap-2 rounded-xl p-3 text-sm transition-all ${
                          type === 'products'
                            ? 'bg-primary text-white shadow-md'
                            : 'border border-border hover:bg-muted'
                        }`}
                      >
                        {language === 'ar' ? 'منتجات' : 'Products'}
                      </button>
                      <button
                        onClick={() => setType('suppliers')}
                        className={`flex items-center gap-2 rounded-xl p-3 text-sm transition-all ${
                          type === 'suppliers'
                            ? 'bg-primary text-white shadow-md'
                            : 'border border-border hover:bg-muted'
                        }`}
                      >
                        {language === 'ar' ? 'موردين' : 'Suppliers'}
                      </button>
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <h3 className="mb-3 font-bold">{language === 'ar' ? 'الفئة' : 'Category'}</h3>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background p-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">{language === 'ar' ? 'الكل' : 'All Categories'}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {language === 'ar' ? cat.nameAr : cat.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <h3 className="mb-3 font-bold">{language === 'ar' ? 'السعر' : 'Price Range'}</h3>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="w-full cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-sm text-muted">
                        <span>{priceRange[0]} جنيه</span>
                        <span>{priceRange[1]} جنيه</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => search(query, type, 1)}
                    className="w-full rounded-xl bg-primary p-3 font-bold text-white shadow-lg transition-all hover:bg-primary/90"
                  >
                    {language === 'ar' ? 'تطبيق الفلاتر' : 'Apply Filters'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div>
            {loading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl bg-muted p-6">
                    <div className="h-48 rounded-xl bg-muted/50"></div>
                    <div className="mt-4 h-5 rounded bg-muted/50"></div>
                    <div className="mt-2 h-4 rounded bg-muted/30 w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-24">
                <Search className="mx-auto h-24 w-24 text-muted/50 mb-8" />
                <h2 className="text-2xl font-bold text-muted mb-4">
                  {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                </h2>
                <p className="text-muted">
                  {language === 'ar' 
                    ? `لا يوجد تطابق لـ "${query}". جرب كلمات مختلفة.`
                    : `No matches for "${query}". Try different words.`
                  }
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((item, index) => (
                    <Link
                      key={item.id}
                      href={item.url}
                      className="group relative rounded-2xl border border-border bg-background p-6 shadow-lg transition-all hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 lg:hover:scale-[1.02]"
                    >
                      {item.type === 'product' && item.price && (
                        <div className="absolute -right-2 -top-2 flex items-center gap-1 rounded-bl-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                          {item.price} جنيه
                        </div>
                      )}
                      <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-2xl ${item.type === 'product' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'} shadow-lg group-hover:scale-110`}>
                        {item.type === 'product' ? <Award className="h-10 w-10" /> : <Star className="h-10 w-10" />}
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold group-hover:text-primary line-clamp-2">{item.title}</h3>
                        <p className="text-sm text-muted line-clamp-2">{item.description}</p>
                        {item.score && (
                          <div className="flex items-center gap-1 text-xs font-bold text-primary">
                            <span>دقة البحث</span>
                            <span>{item.score}%</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className="grid h-12 w-12 place-items-center rounded-xl border bg-background text-muted transition-all disabled:opacity-50 hover:bg-primary hover:text-white"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex gap-1">
                      {Array(totalPages)
                        .fill(0)
                        .map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setPage(i + 1)}
                            className={`grid h-12 w-12 place-items-center rounded-xl transition-all ${
                              page === i + 1
                                ? 'bg-primary text-white shadow-lg'
                                : 'border bg-background text-muted hover:bg-primary hover:text-white'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                    </div>
                    <button
                      onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                      disabled={page === totalPages}
                      className="grid h-12 w-12 place-items-center rounded-xl border bg-background text-muted transition-all disabled:opacity-50 hover:bg-primary hover:text-white"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

