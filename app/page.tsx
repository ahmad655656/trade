'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  BoltIcon,
  ChartBarSquareIcon,
  CheckBadgeIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { useUi } from '@/components/providers/UiProvider'

type UserRole = 'ADMIN' | 'SUPPLIER' | 'TRADER'

type MeResponse = {
  success: boolean
  data?: {
    role: UserRole
  }
}

export default function HomePage() {
  const { t, language } = useUi()
  const isArabic = language === 'ar'
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!response.ok) {
          setIsLoggedIn(false)
          setUserRole(null)
          return
        }

        const result: MeResponse = await response.json()
        if (result.success && result.data) {
          setIsLoggedIn(true)
          setUserRole(result.data.role)
        } else {
          setIsLoggedIn(false)
          setUserRole(null)
        }
      } catch {
        setIsLoggedIn(false)
        setUserRole(null)
      } finally {
        setLoading(false)
      }
    }

    void checkAuth()
  }, [])

  const dashboardHref = useMemo(() => {
    if (userRole === 'ADMIN') return '/dashboard/admin'
    if (userRole === 'SUPPLIER') return '/dashboard/supplier'
    return '/dashboard/trader'
  }, [userRole])

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-app bg-surface p-6 md:p-10">
        <div className="pointer-events-none absolute -top-24 end-0 h-64 w-64 rounded-full bg-[color-mix(in_oklab,var(--app-primary)_22%,transparent)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 start-0 h-64 w-64 rounded-full bg-[color-mix(in_oklab,var(--app-primary)_12%,transparent)] blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-app bg-[color-mix(in_oklab,var(--app-surface)_88%,transparent)] px-3 py-1 text-xs text-muted">
              <BoltIcon className="h-4 w-4" />
              {isArabic ? 'منصة تجارة B2B متقدمة' : 'Advanced B2B marketplace'}
            </p>
            <h1 className="text-3xl font-bold leading-tight text-app md:text-5xl">{t('home.title')}</h1>
            <p className="max-w-2xl text-sm text-muted md:text-base">{t('home.description')}</p>

            {!loading && (
              <div className="flex flex-wrap gap-3">
                {isLoggedIn ? (
                  <>
                    <Link href={dashboardHref} className="btn-primary text-base">
                      {t('nav.dashboard')}
                    </Link>
                    <Link href="/messages" className="btn-secondary text-base">
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      {isArabic ? 'الرسائل' : 'Messages'}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/register" className="btn-primary text-base">
                      {t('home.create')}
                    </Link>
                    <Link href="/login" className="btn-secondary text-base">
                      {t('home.login')}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="card-pro animate-fade-in-up rounded-2xl p-4 [animation-delay:70ms]">
              <p className="text-xs text-muted">{isArabic ? 'أمان وصلاحيات' : 'Security and permissions'}</p>
              <p className="mt-1 text-lg font-semibold text-app">{isArabic ? 'تحكم كامل لكل دور' : 'Full role-based control'}</p>
            </div>
            <div className="card-pro animate-fade-in-up rounded-2xl p-4 [animation-delay:140ms]">
              <p className="text-xs text-muted">{isArabic ? 'تواصل' : 'Communication'}</p>
              <p className="mt-1 text-lg font-semibold text-app">{isArabic ? 'مراسلات مباشرة بين الجميع' : 'Direct messaging for everyone'}</p>
            </div>
            <div className="card-pro animate-fade-in-up rounded-2xl p-4 [animation-delay:210ms] sm:col-span-2 lg:col-span-1">
              <p className="text-xs text-muted">{isArabic ? 'تشغيل يومي' : 'Daily operations'}</p>
              <p className="mt-1 text-lg font-semibold text-app">{isArabic ? 'طلبات ومدفوعات ونزاعات في مكان واحد' : 'Orders, payments, and disputes in one workspace'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card-pro rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-md">
          <div className="mb-3 inline-flex rounded-xl bg-emerald-500/15 p-2 text-emerald-500">
            <ShieldCheckIcon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-app">{t('home.adminTitle')}</h2>
          <p className="mt-2 text-sm text-muted">{t('home.adminDesc')}</p>
        </article>
        <article className="card-pro rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-md">
          <div className="mb-3 inline-flex rounded-xl bg-sky-500/15 p-2 text-sky-500">
            <ChartBarSquareIcon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-app">{t('home.supplierTitle')}</h2>
          <p className="mt-2 text-sm text-muted">{t('home.supplierDesc')}</p>
        </article>
        <article className="card-pro rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-md">
          <div className="mb-3 inline-flex rounded-xl bg-amber-500/15 p-2 text-amber-500">
            <CheckBadgeIcon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-app">{t('home.traderTitle')}</h2>
          <p className="mt-2 text-sm text-muted">{t('home.traderDesc')}</p>
        </article>
      </section>

      <section className="card-pro rounded-2xl p-5">
        <h3 className="text-lg font-semibold text-app">
          {isArabic ? 'طريقة العمل خلال 3 خطوات' : 'How it works in 3 steps'}
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-app p-3">
            <p className="text-xs text-muted">{isArabic ? 'الخطوة 1' : 'Step 1'}</p>
            <p className="mt-1 text-sm font-semibold text-app">{isArabic ? 'سجل بالحساب المناسب' : 'Register with your role'}</p>
          </div>
          <div className="rounded-xl border border-app p-3">
            <p className="text-xs text-muted">{isArabic ? 'الخطوة 2' : 'Step 2'}</p>
            <p className="mt-1 text-sm font-semibold text-app">{isArabic ? 'ابدأ التعاملات والطلبات' : 'Start orders and operations'}</p>
          </div>
          <div className="rounded-xl border border-app p-3">
            <p className="text-xs text-muted">{isArabic ? 'الخطوة 3' : 'Step 3'}</p>
            <p className="mt-1 text-sm font-semibold text-app">{isArabic ? 'تابع كل شيء عبر الرسائل والإشعارات' : 'Track everything via messages and notifications'}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
