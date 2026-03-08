'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import { useUi } from '@/components/providers/UiProvider'

type UserRole = 'ADMIN' | 'SUPPLIER' | 'TRADER'

type MeResponse = {
  success: boolean
  data?: {
    name: string
    email: string
    role: UserRole
  }
}

type AppNotification = {
  id: string
  title: string
  message: string | null
  read: boolean
  createdAt: string
}

export default function Navbar() {
  const { language, setLanguage, theme, toggleTheme, t } = useUi()
  const pathname = usePathname()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [openNotifications, setOpenNotifications] = useState(false)
  const [lastUnreadCount, setLastUnreadCount] = useState(0)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!response.ok) {
          setIsLoggedIn(false)
          setUserRole(null)
          setUserName('')
          setUserEmail('')
          return
        }

        const result: MeResponse = await response.json()
        if (result.success && result.data) {
          setIsLoggedIn(true)
          setUserRole(result.data.role)
          setUserName(result.data.name)
          setUserEmail(result.data.email)
        }
      } catch {
        setIsLoggedIn(false)
        setUserRole(null)
        setUserName('')
        setUserEmail('')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [pathname])

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([])
      setLastUnreadCount(0)
      return
    }

    let mounted = true

    const playNotificationSound = async () => {
      try {
        const audio = new Audio('/notification.mp3')
        audio.volume = 0.7
        await audio.play()
      } catch {
        try {
          const context = new AudioContext()
          const oscillator = context.createOscillator()
          const gain = context.createGain()
          oscillator.type = 'sine'
          oscillator.frequency.value = 880
          gain.gain.value = 0.08
          oscillator.connect(gain)
          gain.connect(context.destination)
          oscillator.start()
          oscillator.stop(context.currentTime + 0.12)
        } catch {
          // Ignore sound failure if browser blocks autoplay.
        }
      }
    }

    const loadNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', { cache: 'no-store' })
        const result = await response.json()
        if (!mounted || !response.ok || !result.success) return

        const next: AppNotification[] = result.data ?? []
        const unreadCount = next.filter((item) => !item.read).length
        if (unreadCount > lastUnreadCount && lastUnreadCount > 0) {
          void playNotificationSound()
        }
        setLastUnreadCount(unreadCount)
        setNotifications(next)
      } catch {
        // Ignore polling errors; next interval will retry.
      }
    }

    void loadNotifications()
    const interval = setInterval(loadNotifications, 15000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isLoggedIn, lastUnreadCount])

  const dashboardHref = useMemo(() => {
    if (userRole === 'ADMIN') return '/dashboard/admin'
    if (userRole === 'SUPPLIER') return '/dashboard/supplier'
    return '/dashboard/trader'
  }, [userRole])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setIsLoggedIn(false)
    setUserRole(null)
    setUserName('')
    setUserEmail('')
    router.push('/login')
    router.refresh()
  }

  const roleLabel = useMemo(() => {
    if (userRole === 'ADMIN') return t('nav.admin')
    if (userRole === 'SUPPLIER') return t('nav.supplier')
    if (userRole === 'TRADER') return t('nav.trader')
    return ''
  }, [userRole, t])

  const navLinks = [
    { href: '/products', label: t('nav.products') },
    { href: '/suppliers', label: t('nav.suppliers') },
    { href: '/about', label: t('nav.about') },
  ]
  const unreadCount = notifications.filter((item) => !item.read).length

  const markNotificationAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      const result = await response.json()
      if (!response.ok || !result.success) return
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch {
      // Ignore read errors.
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-app bg-[color-mix(in_oklab,var(--app-surface)_90%,transparent)] backdrop-blur-md">
      <div className="container mx-auto px-4 py-3">
        <div className="card-pro flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-bold tracking-tight text-app">
              {t('nav.brand')}
            </Link>
            <nav className="hidden items-center gap-2 md:flex">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    pathname === item.href
                      ? 'bg-[color-mix(in_oklab,var(--app-primary)_14%,transparent)] text-app'
                      : 'text-muted hover:bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)] hover:text-app'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleTheme}
              className="btn-secondary !rounded-lg !px-3 !py-1.5 text-xs"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
            </button>
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="btn-secondary !rounded-lg !px-3 !py-1.5 text-xs"
              aria-label="Toggle language"
            >
              {language === 'ar' ? 'EN' : 'AR'}
            </button>

            {!loading && isLoggedIn ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setOpenNotifications((prev) => !prev)}
                    className="btn-secondary !rounded-lg !px-3 !py-2 text-sm"
                    aria-label="Notifications"
                  >
                    <BellIcon className="h-4 w-4" />
                    {unreadCount > 0 ? (
                      <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                        {unreadCount}
                      </span>
                    ) : null}
                  </button>
                  {openNotifications ? (
                    <div className="absolute end-0 top-11 z-50 w-80 rounded-xl border border-app bg-surface p-2 shadow-lg">
                      <p className="px-2 py-1 text-xs font-semibold text-app">
                        {language === 'ar' ? 'الإشعارات' : 'Notifications'}
                      </p>
                      <div className="max-h-80 overflow-auto">
                        {notifications.length ? (
                          notifications.slice(0, 20).map((n) => (
                            <button
                              key={n.id}
                              className={`w-full rounded-lg px-2 py-2 text-start text-xs transition ${
                                n.read ? 'text-muted hover:bg-[color-mix(in_oklab,var(--app-primary)_6%,transparent)]' : 'bg-[color-mix(in_oklab,var(--app-primary)_10%,transparent)] text-app'
                              }`}
                              onClick={() => markNotificationAsRead(n.id)}
                            >
                              <p className="font-semibold">{n.title}</p>
                              {n.message ? <p className="mt-1">{n.message}</p> : null}
                              <p className="mt-1 text-[10px] opacity-75">{new Date(n.createdAt).toLocaleString()}</p>
                            </button>
                          ))
                        ) : (
                          <p className="px-2 py-3 text-xs text-muted">
                            {language === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications yet'}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="hidden rounded-lg border border-app bg-surface px-3 py-2 text-xs md:block">
                  <p className="font-semibold text-app">{userName}</p>
                  <p className="text-muted" dir="ltr">{userEmail}</p>
                  <p className="text-[color:var(--app-primary)]">{roleLabel}</p>
                </div>
                <Link href={dashboardHref} className="btn-primary !rounded-lg !px-3 !py-2 text-sm">
                  {t('nav.dashboard')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn-secondary !rounded-lg !px-3 !py-2 text-sm"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary !rounded-lg !px-3 !py-2 text-sm">
                  {t('nav.login')}
                </Link>
                <Link href="/register" className="btn-primary !rounded-lg !px-3 !py-2 text-sm">
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto md:hidden">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                pathname === item.href
                  ? 'bg-[color-mix(in_oklab,var(--app-primary)_14%,transparent)] text-app'
                  : 'text-muted hover:bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)] hover:text-app'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
