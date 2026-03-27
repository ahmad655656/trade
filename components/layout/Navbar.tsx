'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useRef } from 'react'

import {
  BellIcon,
  ArrowRightOnRectangleIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
  XMarkIcon,
  Bars3Icon
} from '@heroicons/react/24/outline'

import { useUi } from '@/components/providers/UiProvider'
import AiSearchDropdown from './AiSearchDropdown'
import type { SearchableItem } from '@/lib/ai-search-client'
import { trackPopularSearches } from '@/lib/search-history'

/* -------------------------------- TYPES -------------------------------- */

type Role = 'ADMIN' | 'SUPPLIER' | 'TRADER'

type User = {
  name: string
  email: string
  role: Role
  avatar?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING'
}

type Notification = {
  id: string
  title: string
  message?: string
  read: boolean
  createdAt: string
  data?: {
    kind?: string
    role?: Role
    roleLabel?: string
    name?: string
    email?: string
    phone?: string
    companyName?: string
  }
}

type ConversationSummary = {
  unreadCount?: number | null
}

type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

export default function Navbar() {
  const { language, setLanguage, theme, toggleTheme, t } = useUi()
  const pathname = usePathname()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [openNotifications, setOpenNotifications] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  const notifBtnRef = useRef<HTMLButtonElement>(null)
  const [notifPos, setNotifPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const [messageUnread, setMessageUnread] = useState(0)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchableItem[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  const searchRef = useRef<HTMLDivElement | null>(null)

  // Prevent hydration text mismatch for UI-dependent labels/icons
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const navLinks = [
    { href: '/products', label: t('nav.products') || 'المنتجات' },
    { href: '/suppliers', label: t('nav.suppliers') || 'الموردون' },
    { href: '/about', label: t('nav.about') || 'عن المنصة' }
  ]

  // Load current user
  useEffect(() => {
    let mounted = true
    async function loadUser() {
      const data = await fetchJson<User>('/api/auth/me', { cache: 'no-store' })
      if (mounted && data?.success && data.data) {
        setUser(data.data)
      }
      if (mounted) setLoading(false)
    }
    loadUser()
    return () => {
      mounted = false
    }
  }, [pathname])

  const notificationSoundRef = useRef<HTMLAudioElement | null>(null)
  const lastNotificationAtRef = useRef<string | null>(null)

  // Notifications poller (safe)
  useEffect(() => {
    if (!user) return
    let mounted = true
    const load = async () => {
      const data = await fetchJson<Notification[]>('/api/notifications', { cache: 'no-store' })
      if (mounted && data?.success && Array.isArray(data.data)) {
        const fetchedNotifications = data.data as Notification[]

        // Play sound only when new unread notifications arrive (after first load)
        const lastSeen = lastNotificationAtRef.current
        const newUnread = fetchedNotifications.some((n) => {
          if (n.read) return false
          if (!lastSeen) return false
          return new Date(n.createdAt) > new Date(lastSeen)
        })

        if (newUnread && notificationSoundRef.current) {
          void notificationSoundRef.current.play().catch(() => {})
        }

        if (fetchedNotifications.length) {
          lastNotificationAtRef.current = fetchedNotifications[0].createdAt
        }

        setNotifications(fetchedNotifications)
      }
    }
    load()
    const id = setInterval(load, 15000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [user])

  // Messages unread poller (safe)
  useEffect(() => {
    if (!user) return
    let mounted = true
    const load = async () => {
      const data = await fetchJson<ConversationSummary[]>('/api/messages/conversations', { cache: 'no-store' })
      const count = (data?.data ?? []).reduce(
        (sum, item) => sum + (item.unreadCount ?? 0),
        0
      )
      if (mounted) setMessageUnread(count)
    }
    load()
    const id = setInterval(load, 15000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [user])

  // Global outside click / Escape to close notif dropdown
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        openNotifications &&
        notificationRef.current &&
        !notificationRef.current.contains(target) &&
        notifBtnRef.current &&
        !notifBtnRef.current.contains(target as Node)
      ) {
        setOpenNotifications(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenNotifications(false)
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [openNotifications])

  // Position notifications dropdown under toolbar icon
  useEffect(() => {
    if (openNotifications) {
      const update = () => {
        const rect = notifBtnRef.current?.getBoundingClientRect()
        if (!rect) return
        const top = Math.round(rect.bottom + 8)
        const width = 340
        const maxLeft = window.innerWidth - width - 16
        const left = Math.min(Math.max(16, Math.round(rect.left - (language === 'ar' ? width - rect.width : 0))), maxLeft)
        setNotifPos({ top, left })
      }
      update()
      window.addEventListener('resize', update)
      window.addEventListener('scroll', update, true)
      return () => {
        window.removeEventListener('resize', update)
        window.removeEventListener('scroll', update, true)
      }
    }
  }, [openNotifications, language])

  async function fetchJson<T>(url: string, init?: RequestInit): Promise<ApiResponse<T> | null> {
    try {
      const res = await fetch(url, init)
      const ct = res.headers.get('content-type') || ''
      if (!res.ok || !ct.includes('application/json')) return null
      return (await res.json()) as ApiResponse<T>
    } catch {
      return null
    }
  }

  async function search(value: string) {
    setQuery(value)
    if (value.length < 2) {
      setResults([])
      return
    }
    trackPopularSearches(value)
    setSearchLoading(true)
    try {
      const data = await fetchJson<SearchableItem[]>(`/api/search/data?q=${encodeURIComponent(value)}&limit=10&type=all`)
      if (data?.success) setResults(data.data ?? [])
      else setResults([])
    } catch {
      setResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  async function markAllAsRead() {
    if (!notifications.some((n) => !n.read)) {
      return
    }

    setMarkingAll(true)
    const previous = notifications
    setNotifications((items) => items.map((item) => ({ ...item, read: true })))

    try {
      const data = await fetchJson<null>('/api/notifications/read-all', { method: 'PATCH' })
      if (!data?.success) {
        throw new Error('Failed to mark all')
      }
    } catch {
      setNotifications(previous)
    } finally {
      setMarkingAll(false)
    }
  }

  const dashboardHref = useMemo(() => {
    if (!user) return '/'
    if (user.role === 'ADMIN') return '/dashboard/admin'
    if (user.role === 'SUPPLIER') return '/supplier'
    return '/trader'
  }, [user])

  const unreadNotifications = notifications.filter(n => !n.read).length

  const roleLabels: Record<Role, { en: string; ar: string }> = {
    ADMIN: { en: 'Admin', ar: 'مدير' },
    SUPPLIER: { en: 'Supplier', ar: 'مورد' },
    TRADER: { en: 'Trader', ar: 'تاجر' },
  }

  const roleLabel = useMemo(() => {
    return language === 'ar' ? roleLabels[user?.role || 'TRADER'].ar : roleLabels[user?.role || 'TRADER'].en
  }, [user, language])

  const formatRoleLabel = (role?: Role, fallback?: string) => {
    if (role) return language === 'ar' ? roleLabels[role].ar : roleLabels[role].en
    return fallback ?? '-'
  }

  const formatNotificationDate = (value: string) => {
    const date = new Date(value)
    return date.toLocaleString(language === 'ar' ? 'ar' : 'en', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <audio ref={notificationSoundRef} src="/sound/soneynotification.mp3" preload="auto" />
      <header className="sticky mb-7 top-0 z-50 overflow-visible border-b border-white/10 bg-[color-mix(in_oklab(var(--app-surface),94%,transparent))] backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,.08)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--app-primary)]/40 to-transparent" />
      <div className="container mx-auto px-4 lg:px-6">
        {/* Main header row: logo + nav (left) | search + user info (right) */}
        <div className="flex h-16 lg:h-20 items-center justify-between">
          {/* Left: Logo + nav links */}
          <div className="flex items-center gap-5 lg:gap-8 min-w-0">
            <Link href="/" className="group flex items-center p-1 transition-all duration-300 hover:scale-105 hover:rotate-1">
              <img
                src={language === 'ar' ? '/logoarabic.png' : '/logo.png'}
                className="h-9 lg:h-10 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-[var(--app-primary)]/25"
                alt="logo"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center rounded-xl px-3 py-2 text-[13px] lg:text-sm font-semibold transition-all ${
                    pathname === href
                      ? 'bg-[var(--app-primary)]/15 text-[var(--app-primary)] ring-1 ring-[var(--app-primary)]/30'
                      : 'text-muted hover:text-app hover:bg-white/5 ring-1 ring-transparent'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
            {/* Mobile Menu placeholder */}
            <button type="button" className="md:hidden p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all" aria-label="menu">
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>

          {/* Right: search + user info (always visible, no dropdown) */}
          <div className="flex items-center gap-3 lg:gap-5 min-w-0">
            {/* Search */}
            <div ref={searchRef} className="relative hidden sm:block w-56 lg:w-80">
              <input
                value={query}
                onChange={(e) => search(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                placeholder={language === 'ar' ? 'ابحث عن المنتجات والموردين والتجار والعروض...' : 'Search products, suppliers, traders & deals...'}
                className="w-full rounded-2xl border border-white/10 bg-[color-mix(in_oklab(var(--app-surface),92%,transparent))] px-4 py-2.5 pr-10 text-sm placeholder:text-muted/70 focus:border-[var(--app-primary)]/50 focus:ring-2 focus:ring-[var(--app-primary)]/20 transition-all duration-300"
                role="combobox"
                aria-expanded={searchOpen}
                aria-controls="global-search-results"
              />
              <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted/70" />
              {query && (
                <button
                  onClick={() => {
                    setQuery('')
                    setResults([])
                  }}
                  className="absolute right-9 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-all"
                  aria-label="Clear search"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
              {searchOpen && (
                <AiSearchDropdown
                  query={query}
                  results={results}
                  onClose={() => setSearchOpen(false)}
                  anchorRef={searchRef}
                  onQueryChange={search}
                  loading={searchLoading}
                />
              )}
            </div>

            {/* User inline info (no dropdown) */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative h-10 w-10 rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--app-primary)]/20 via-white/10 to-[var(--app-primary)]/10 p-1 ring-2 ring-white/20 shadow-lg hidden sm:block">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user?.name || 'user'} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <div className="h-full w-full rounded-xl bg-gradient-to-br from-[var(--app-primary)]/80 to-[var(--app-primary)] flex items-center justify-center text-sm font-bold text-white">
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-app max-w-[160px] lg:max-w-[220px]">
                  {loading ? (language === 'ar' ? '...' : '...') : (user?.name || (language === 'ar' ? 'ضيف' : 'Guest'))}
                </p>
                <div className="mt-0.5 inline-flex items-center gap-2">
                  <span className="px-2 py-[2px] text-[11px] font-bold rounded-full bg-gradient-to-r from-emerald-500/20 to-purple-500/20 text-emerald-700 border border-emerald-200/50">
                    {roleLabel}
                  </span>
                  {user && (
                    <Link
                      href={dashboardHref}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-app hover:bg-white/10 rounded-lg px-2 py-1 transition-colors"
                    >
                      <Squares2X2Icon className="h-4 w-4" />
                      {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                    </Link>
                  )}
                  {user && (
                    <button
                      onClick={logout}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-red-600 hover:bg-red-50/50 rounded-lg px-2 py-1 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* Secondary toolbar: language/theme + notifications/messages */}
    <div className="absolute inset-x-0 top-16 lg:top-20 z-40 px-4 lg:px-10 py-2 border-b border-white/10 bg-[color-mix(in_oklab(var(--app-surface),98%,transparent))] backdrop-blur-xl">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {/* Left cluster: notifications + messages */}
        <div className="flex items-center gap-2">
          <button
            ref={notifBtnRef}
            onClick={() => setOpenNotifications(!openNotifications)}
            className="relative inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 transition-all"
            aria-haspopup="menu"
            aria-expanded={openNotifications}
          >
            <BellIcon className="h-5 w-5" />
            <span>{language === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white px-1 shadow">
                {unreadNotifications}
              </span>
            )}
          </button>
          <Link
            href="/messages"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 transition-all"
          >
            <span>{language === 'ar' ? 'الرسائل' : 'Messages'}</span>
            {messageUnread > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white px-1">
                {messageUnread}
              </span>
            )}
          </Link>
        </div>

        {/* grow spacer */}
        <div className="grow" />

        {/* Right cluster: language + theme */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-bold hover:bg-white/10 transition-all"
            aria-label="Toggle language"
          >
            <span suppressHydrationWarning aria-hidden="true">{mounted ? (language === 'ar' ? 'EN' : 'AR') : 'AR'}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
            aria-label="Toggle theme"
          >
            <span suppressHydrationWarning aria-hidden="true">
              {mounted
                ? (theme === 'dark'
                    ? (language === 'ar' ? 'داكن' : 'Dark')
                    : (language === 'ar' ? 'فاتح' : 'Light'))
                : (language === 'ar' ? 'فاتح' : 'Light')}
            </span>
          </button>
        </div>
      </div>

      {/* Notifications dropdown under toolbar icon */}
      {openNotifications && (
        <div
          ref={notificationRef}
          className="fixed z-[9998] w-[300px] max-w-[95vw] rounded-3xl bg-[var(--app-surface)]/90 backdrop-blur-3xl shadow-2xl shadow-black/25 overflow-hidden"
          style={{ top: '20px', left: notifPos.left }}
        >
          <div className="px-6 py-4 border-b border-white/20 bg-gradient-to-r from-[color-mix(in_oklab(var(--app-surface),90%,transparent))] to-[color-mix(in_oklab(var(--app-surface),85%,transparent))] backdrop-blur-3xl flex items-center gap-3 sticky top-0">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 p-2 shadow-xl shadow-amber-500/30 flex items-center justify-center">
              <BellIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-app">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
              <p className="text-xs text-muted/70">{language === 'ar' ? 'ابقَ على اطلاع بآخر المستجدات' : 'Stay updated with latest events'}</p>
            </div>
            <button
              onClick={() => setOpenNotifications(false)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:bg-white/10 hover:text-app transition-all duration-200 hover:scale-105"
              aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-4 mb-4 flex items-center justify-center">
                  <BellIcon className="h-8 w-8 text-muted/40" />
                </div>
                <p className="text-base font-semibold text-muted mb-2">{language === 'ar' ? 'لا توجد إشعارات بعد' : 'No notifications yet'}</p>
                <p className="text-sm text-muted/60">{language === 'ar' ? 'سنخطرك عند حدوث أي جديد' : 'Well notify you when something new happens'}</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {notifications.map((n) => {
                  const isRegistration = n.data?.kind === 'REGISTRATION_PENDING'
                  const displayTitle = isRegistration
                    ? (language === 'ar' ? 'تسجيل جديد بانتظار الموافقة' : 'New registration pending approval')
                    : n.title
                  const detailItems = isRegistration
                    ? [
                        { label: language === 'ar' ? 'الاسم' : 'Name', value: n.data?.name },
                        { label: language === 'ar' ? 'الدور' : 'Role', value: formatRoleLabel(n.data?.role, n.data?.roleLabel) },
                        { label: language === 'ar' ? 'البريد الإلكتروني' : 'Email', value: n.data?.email },
                        { label: language === 'ar' ? 'الهاتف' : 'Phone', value: n.data?.phone },
                        { label: language === 'ar' ? 'الشركة' : 'Company', value: n.data?.companyName },
                      ]
                    : []

                  return (
                    <div
                      key={n.id}
                      className={`group relative flex items-start gap-4 rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
                        n.read
                          ? 'bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/15'
                          : 'bg-gradient-to-r from-[var(--app-primary)]/10 via-[var(--app-primary)]/15 to-[var(--app-primary)]/10 hover:from-[var(--app-primary)]/15 hover:via-[var(--app-primary)]/20 hover:to-[var(--app-primary)]/15 shadow-lg shadow-[var(--app-primary)]/20'
                      } border border-white/10 hover:border-white/20`}
                    >
                      <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 transition-all duration-300 ${
                        n.read
                          ? 'bg-muted/40 group-hover:bg-muted/60'
                          : 'bg-gradient-to-r from-[var(--app-primary)] to-[var(--app-primary)]/80 shadow-lg shadow-[var(--app-primary)]/50'
                      }`} />

                      <div className={`h-10 w-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                        n.read
                          ? 'bg-gradient-to-br from-gray-500/20 to-gray-600/20'
                          : 'bg-gradient-to-br from-[var(--app-primary)]/20 to-[var(--app-primary)]/30 shadow-lg'
                      }`}>
                        <div className={`h-5 w-5 rounded-lg ${
                          n.read ? 'bg-gray-400' : 'bg-gradient-to-r from-[var(--app-primary)] to-[var(--app-primary)]/80'
                        }`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className={`font-bold text-sm leading-tight transition-colors ${
                              n.read ? 'text-app/80' : 'text-app'
                            }`}>
                              {displayTitle}
                            </p>
                            {isRegistration ? (
                              <div className="mt-2 space-y-1 text-xs text-muted">
                                {detailItems.map((item) => (
                                  <div key={item.label} className="flex items-center justify-between gap-3">
                                    <span className="font-semibold text-muted">{item.label}</span>
                                    <span className="text-app/90 truncate">{item.value || '-'}</span>
                                  </div>
                                ))}
                              </div>
                            ) : n.message ? (
                              <p className="mt-1.5 text-sm text-muted leading-relaxed line-clamp-2">
                                {n.message}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <p className="text-xs font-medium text-muted/70">
                            {formatNotificationDate(n.createdAt)}
                          </p>
                          {!n.read && (
                            <div className="h-2 w-2 rounded-full bg-[var(--app-primary)] animate-pulse" />
                          )}
                        </div>
                      </div>

                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer with mark all as read */}
          {notifications.length > 0 && (
            <div className="px-6 py-3 border-t border-white/20 bg-gradient-to-r from-[color-mix(in_oklab(var(--app-surface),90%,transparent))] to-[color-mix(in_oklab(var(--app-surface),85%,transparent))] backdrop-blur-2xl">
              <button
                onClick={markAllAsRead}
                disabled={markingAll || unreadNotifications === 0}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-[var(--app-primary)]/10 to-[var(--app-primary)]/20 hover:from-[var(--app-primary)]/20 hover:to-[var(--app-primary)]/30 text-sm font-semibold text-[var(--app-primary)] transition-all duration-200 hover:scale-105 border border-[var(--app-primary)]/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{language === 'ar' ? 'تعيين الكل كمقروء' : 'Mark all as read'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}







