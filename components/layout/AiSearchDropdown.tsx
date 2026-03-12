'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'
import Link from 'next/link'
import { Search, ArrowRight, Loader2, X, Clock } from 'lucide-react'
import { useUi } from '@/components/providers/UiProvider'
import type { SearchableItem } from '@/lib/ai-search-client'
import { getSearchHistory } from '@/lib/search-history'

interface Props {
  query: string
  results: SearchableItem[]
  onClose: () => void
  loading: boolean
  onQueryChange?: (value: string) => void
  anchorRef?: RefObject<HTMLElement | null>
}

export default function AiSearchDropdown({ query, results, onClose, loading, onQueryChange, anchorRef }: Props) {
  const { language } = useUi()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const insideDropdown = dropdownRef.current && dropdownRef.current.contains(target)
      const insideAnchor = anchorRef?.current && anchorRef.current.contains(target)
      if (!insideDropdown && !insideAnchor) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, anchorRef])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const renderResultItem = useCallback((item: SearchableItem, index: number) => (
    <Link
      key={item.id}
      href={item.url}
      className="group flex w-full items-center gap-3 rounded-xl p-4 transition-all hover:bg-white/10"
      onClick={onClose}
    >
      <div className={`h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br p-2 shadow-lg group-hover:scale-105 transition-transform ${
        item.type === 'product' ? 'from-blue-500 to-blue-600' :
        item.type === 'supplier' ? 'from-emerald-500 to-emerald-600' :
        'from-purple-500 to-purple-600'
      }`}>
        {item.type === 'product' && <Search className="h-6 w-6 text-white" />}
        {item.type === 'supplier' && <ArrowRight className="h-6 w-6 text-white rotate-45" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="truncate font-semibold text-app group-hover:text-white">{item.title}</h3>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-app opacity-90">
            {item.type === 'product' ? 'منتج' : item.type === 'supplier' ? 'مورد' : 'فئة'}
          </span>
        </div>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-[13px] text-muted/90">{item.description}</p>
        )}
        <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-app/80">
          <span>AI Match: {item.score}%</span>
          {index < 3 && (
            <span className="flex items-center gap-0.5 rounded-full bg-gradient-to-r from-[var(--app-primary)] to-transparent bg-clip-text text-transparent">
              ★{index + 1}
            </span>
          )}
        </div>
      </div>
    </Link>
  ), [onClose])

  return (
    <div 
      ref={dropdownRef}
      className="absolute inset-x-0 top-full z-50 mx-4 mt-2 animate-in slide-in-from-top-4 fade-in duration-200 lg:mx-0 lg:w-96 lg:-left-8"
    >
      <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity pointer-events-none"
      />
      <div className="relative z-50 rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--app-surface)_95%,transparent)] backdrop-blur-3xl shadow-2xl shadow-black/20">
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-r from-[var(--app-primary)] via-blue-500 to-purple-600 p-1.5 shadow-lg">
            <Search className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg bg-gradient-to-r from-[var(--app-primary)] to-blue-500 bg-clip-text text-transparent">
              {language === 'ar' ? 'البحث الذكي' : 'AI Search'}
            </h2>
            <p className="text-[13px] text-muted">
              {language === 'ar' ? `${results.length} نتيجة` : `${results.length} results`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:bg-white/10 hover:text-app transition-all"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {onQueryChange && (
          <div className="border-b border-white/5 px-5 py-4">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <Search className="h-4 w-4 text-muted" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={language === 'ar' ? 'اكتب للبحث...' : 'Type to search...'}
                className="flex-1 bg-transparent text-[13px] text-app outline-none placeholder:text-muted/70"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => onQueryChange('')}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:text-app"
                  aria-label={language === 'ar' ? 'مسح البحث' : 'Clear search'}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
        <div className="max-h-[500px] overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="h-12 w-12 animate-spin text-[var(--app-primary)]" />
              <p className="mt-4 text-sm text-muted">
                AI analyzing...
              </p>
            </div>
          ) : query.length < 2 ? (
            <div className="divide-y divide-white/5 p-4">
              <div className="mb-4 pb-4">
                <h4 className="mb-3 font-bold text-app opacity-90">
                  Recent Searches
                </h4>
                {getSearchHistory().slice(0, 3).map((item) => (
                  <button
                    key={item.timestamp}
                    className="w-full p-2 text-start transition-all hover:bg-white/5 rounded-lg"
                    onClick={() => {
                      if (onQueryChange) {
                        onQueryChange(item.query)
                      } else {
                        onClose()
                      }
                    }}
                  >
                    <span className="block truncate text-sm font-medium text-app">
                      {item.query}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(item.timestamp).toLocaleDateString(language === 'ar' ? 'ar' : 'en')}
                    </span>
                  </button>
                ))}
                {getSearchHistory().length === 0 && (
                  <p className="text-xs text-muted py-8 text-center">
                    No recent searches
                  </p>
                )}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Search className="h-16 w-16 text-muted/30 mb-4" />
              <h3 className="mb-2 text-lg font-bold text-muted/70">
                No results found
              </h3>
              <p className="text-sm text-muted/60">
                Try different words
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 p-1">
              {results.map((item, index) => renderResultItem(item, index))}
            </div>
          )}
        </div>
        {!loading && results.length > 0 && (
          <div className="border-t border-white/5 px-5 py-4">
            <Link
              href={`/search?q=${encodeURIComponent(query)}&type=all`}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--app-primary)]/90 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[var(--app-primary)] hover:shadow-lg"
              onClick={onClose}
            >
              {language === 'ar' ? 'عرض جميع النتائج' : 'View all results'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

