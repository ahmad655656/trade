'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useRef } from 'react'

import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightOnRectangleIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
  XMarkIcon
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
}

type Notification = {
  id: string
  title: string
  message?: string
  read: boolean
  createdAt: string
}


/* -------------------------------- NAVBAR -------------------------------- */

export default function Navbar() {

  const { language, setLanguage, theme, toggleTheme, t } = useUi()

  const pathname = usePathname()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [openNotifications, setOpenNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  const [messageUnread, setMessageUnread] = useState(0)

  /* ------------------------------ SEARCH STATE ------------------------------ */

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchableItem[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)

  /* ------------------------------- NAV LINKS ------------------------------- */

  const links = [
    { href: '/products', label: t('nav.products') },
    { href: '/suppliers', label: t('nav.suppliers') },
    { href: '/about', label: t('nav.about') }
  ]

  /* ------------------------------ AUTH CHECK ------------------------------ */

  useEffect(() => {

    async function loadUser() {

      try {

        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        const data = await res.json()

        if (data.success) {
          setUser(data.data)
        }

      } catch { }

      setLoading(false)

    }

    loadUser()

  }, [pathname])

  /* ------------------------------ NOTIFICATIONS ------------------------------ */

  useEffect(() => {

    if (!user) return

    const load = async () => {

      try {

        const res = await fetch('/api/notifications', { cache: 'no-store' })
        const data = await res.json()

        if (data.success) {
          setNotifications(data.data)
        }

      } catch { }

    }

    load()

    const interval = setInterval(load, 15000)

    return () => clearInterval(interval)

  }, [user])

  useEffect(() => {
    if (!openNotifications) return

    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setOpenNotifications(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenNotifications(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openNotifications])

  /* ------------------------------ MESSAGES ------------------------------ */

  useEffect(() => {

    if (!user) return

    const load = async () => {

      try {

        const res = await fetch('/api/messages/conversations', { cache: 'no-store' })
        const data = await res.json()

        const count = data.data?.reduce(
          (sum: number, item: any) => sum + (item.unreadCount ?? 0),
          0
        )

        setMessageUnread(count)

      } catch { }

    }

    load()

    const interval = setInterval(load, 15000)

    return () => clearInterval(interval)

  }, [user])

  /* ------------------------------ SEARCH ------------------------------ */

  async function search(value: string) {

    setQuery(value)

    if (value.length < 2) {
      setResults([])
      return
    }

    trackPopularSearches(value)

    setSearchLoading(true)

    try {

      const res = await fetch(`/api/search/data?q=${value}&limit=10&type=all`)
      const data = await res.json()

      if (data.success) {
        setResults(data.data)
      }

    } catch {
      setResults([])
    }

    setSearchLoading(false)

  }

  /* ------------------------------ LOGOUT ------------------------------ */

  async function logout() {

    await fetch('/api/auth/logout', { method: 'POST' })

    router.push('/login')
    router.refresh()

  }

  /* ------------------------------ DASHBOARD ------------------------------ */

  const dashboardHref = useMemo(() => {

    if (!user) return '/'

    if (user.role === 'ADMIN') return '/dashboard/admin'
    if (user.role === 'SUPPLIER') return '/dashboard/supplier'

    return '/dashboard/trader'

  }, [user])

  /* ------------------------------ UNREAD ------------------------------ */

  const unreadNotifications =
    notifications.filter(n => !n.read).length

  const formatNotificationDate = (value: string) => {
    const date = new Date(value)
    return date.toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      month: 'short',
      day: 'numeric',
    })
  }

  /* -------------------------------------------------------------------------- */
  /*                                   UI                                       */
  /* -------------------------------------------------------------------------- */

  return (

    <header className="relative sticky top-0 z-50 border-b border-white/10 bg-[color-mix(in_oklab,var(--app-surface)_94%,transparent)] backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--app-primary)]/40 to-transparent" />

      <div className="container mx-auto px-6">

        <div className="flex h-20 items-center justify-between">

          {/* ------------------------------ LEFT ------------------------------ */}

          <div className="flex items-center gap-8">

            {/* Logo */}

            <Link href="/" className="flex items-center">

              <img
                src={language === 'ar' ? '/logoarabic.png' : '/logo.png'}
                className="h-10"
                alt="logo"
              />

            </Link>

            {/* Navigation */}

            <nav className="hidden lg:flex gap-6">

              {links.map(link => (

                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-semibold transition ${
                    pathname === link.href
                      ? 'text-[var(--app-primary)]'
                      : 'text-muted hover:text-app'
                  }`}
                >
                  {link.label}
                </Link>

              ))}

            </nav>

          </div>

          {/* ------------------------------ SEARCH ------------------------------ */}

          <div
            ref={searchRef}
            className="hidden xl:flex relative w-96"
          >

            <input
              value={query}
              onChange={(e) => search(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder={language === 'ar'
                ? 'ابحث عن منتجات او موردين'
                : 'Search products or suppliers'}
              className="w-full rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--app-surface)_92%,transparent)] px-4 py-2 pr-10 text-sm text-app outline-none placeholder:text-muted/70 focus:border-[var(--app-primary)]/50 focus:ring-2 focus:ring-[var(--app-primary)]/20"
            />

            <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />

            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  setResults([])
                }}
                className="absolute right-8 top-2"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}

            {searchOpen && (
              <AiSearchDropdown
                query={query}
                results={results}
                loading={searchLoading}
                onClose={() => setSearchOpen(false)}
                anchorRef={searchRef}
                onQueryChange={search}
              />
            )}

          </div>

          {/* ------------------------------ RIGHT ------------------------------ */}

          <div className="flex items-center gap-4">

            {/* Theme */}

            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-muted transition hover:bg-white/10 hover:text-app"
              aria-label="Toggle theme"
              suppressHydrationWarning
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Language */}

            <button
              onClick={() =>
                setLanguage(language === 'ar' ? 'en' : 'ar')
              }
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-bold text-muted transition hover:bg-white/10 hover:text-app"
            >
              {language === 'ar' ? 'EN' : 'AR'}
            </button>

            {/* AUTH */}

            {!loading && !user && (
              <>
                <Link href="/login" className="btn-secondary text-xs">
                  {t('nav.login')}
                </Link>
                <Link href="/register" className="btn-primary text-xs">
                  {t('nav.register')}
                </Link>
              </>
            )}

            {!loading && user && (
              <div className="flex items-center gap-4">

                {/* Messages */}

                <Link
                  href="/messages"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition hover:bg-white/10 hover:text-app"
                  aria-label={language === 'ar' ? 'الرسائل' : 'Messages'}
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  {messageUnread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--app-primary)] px-1 text-[10px] font-bold text-white shadow">
                      {messageUnread}
                    </span>
                  )}
                </Link>

                {/* Notifications */}

                <div ref={notificationRef} className="relative">
                  <button
                    onClick={() => setOpenNotifications(!openNotifications)}
                    className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition hover:bg-white/10 hover:text-app"
                    aria-label={language === 'ar' ? 'الإشعارات' : 'Notifications'}
                  >
                    <BellIcon className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>

                  {openNotifications && (
                    <div className="fixed inset-x-4 top-20 z-50 sm:absolute sm:inset-auto sm:end-0 sm:top-full sm:mt-3 sm:w-[360px]">
                      <div className="rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--app-surface)_96%,transparent)] backdrop-blur-2xl shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-app">
                              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
                            </p>
                            <p className="text-xs text-muted">
                              {language === 'ar'
                                ? `${unreadNotifications} غير مقروءة`
                                : `${unreadNotifications} unread`}
                            </p>
                          </div>
                          <button
                            onClick={() => setOpenNotifications(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition hover:bg-white/10 hover:text-app"
                            aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-2 sm:max-h-[420px]">
                          {notifications.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted">
                              <BellIcon className="h-8 w-8" />
                              <p className="text-sm">{language === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications yet'}</p>
                            </div>
                          ) : (
                            notifications.slice(0, 12).map((n) => (
                              <div
                                key={n.id}
                                className={`mb-2 rounded-xl border border-white/10 px-3 py-2 transition ${
                                  n.read ? 'bg-transparent' : 'bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${n.read ? 'bg-slate-400/50' : 'bg-[var(--app-primary)]'}`} />
                                    <p className="text-sm font-semibold text-app">{n.title}</p>
                                  </div>
                                  <span className="text-[11px] text-muted">{formatNotificationDate(n.createdAt)}</span>
                                </div>
                                {n.message ? (
                                  <p className="mt-1 text-xs text-muted line-clamp-2">{n.message}</p>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dashboard */}

                <Link
                  href={dashboardHref}
                  className="btn-primary"
                >
                  <Squares2X2Icon className="h-5 w-5" />
                  {t('nav.dashboard')}
                </Link>

                {/* Logout */}

                <button onClick={logout}>
                  <ArrowRightOnRectangleIcon className="h-6 w-6" />
                </button>

              </div>
            )}

          </div>

        </div>

      </div>

    </header>

  )

}
