'use client'

import Link from 'next/link'
import type { ComponentType, SVGProps } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRightIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useUi } from '@/components/providers/UiProvider'

type RoleCard = {
  key: string
  titleKey: string
  descKey: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

type CtaCard = {
  href: string
  arTitle: string
  enTitle: string
  arDesc: string
  enDesc: string
}

type UserRole = 'ADMIN' | 'SUPPLIER' | 'TRADER'

type MeResponse = {
  success: boolean
  data?: {
    role: UserRole
  }
}

const roleCards: RoleCard[] = [
  {
    key: 'admin',
    titleKey: 'home.adminTitle',
    descKey: 'home.adminDesc',
    icon: ShieldCheckIcon,
  },
  {
    key: 'supplier',
    titleKey: 'home.supplierTitle',
    descKey: 'home.supplierDesc',
    icon: BuildingStorefrontIcon,
  },
  {
    key: 'trader',
    titleKey: 'home.traderTitle',
    descKey: 'home.traderDesc',
    icon: UserGroupIcon,
  },
]

const highlights = [
  {
    id: 'secure',
    ar: 'مصادقة قوية وصلاحيات دقيقة لكل دور.',
    en: 'Strong authentication and granular permissions for every role.',
  },
  {
    id: 'workflow',
    ar: 'تدفق عمل واضح للطلبات والمخزون والمدفوعات.',
    en: 'Clear workflows for orders, inventory, and payments.',
  },
  {
    id: 'engagement',
    ar: 'رسائل وتنبيهات فورية لتسريع القرارات.',
    en: 'Instant messaging and alerts to speed up decisions.',
  },
]

const ctaCards: CtaCard[] = [
  {
    href: '/products',
    arTitle: 'تصفح المنتجات',
    enTitle: 'Browse products',
    arDesc: 'اطلع على المنتجات المنشورة من الموردين.',
    enDesc: 'Explore published products from suppliers.',
  },
  {
    href: '/suppliers',
    arTitle: 'اكتشف الموردين',
    enTitle: 'Discover suppliers',
    arDesc: 'ابحث عن أفضل الموردين حسب التقييم.',
    enDesc: 'Find top-rated suppliers and partners.',
  },
  {
    href: '/about',
    arTitle: 'تعرف على المنصة',
    enTitle: 'Learn about the platform',
    arDesc: 'لماذا صممت هذه المنصة وكيف تعمل.',
    enDesc: 'Why the platform was built and how it works.',
  },
]

export default function HomePage() {
  const { t, language } = useUi()
  const isArabic = language === 'ar'
  const [authLoading, setAuthLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!mounted) return
        if (!response.ok) {
          setUserRole(null)
          return
        }

        const result: MeResponse = await response.json()
        if (result.success && result.data) {
          setUserRole(result.data.role)
        } else {
          setUserRole(null)
        }
      } catch {
        if (mounted) setUserRole(null)
      } finally {
        if (mounted) setAuthLoading(false)
      }
    }

    void checkAuth()
    return () => {
      mounted = false
    }
  }, [])

  const dashboardHref = useMemo(() => {
    if (userRole === 'ADMIN') return '/dashboard/admin'
    if (userRole === 'SUPPLIER') return '/supplier'
    if (userRole === 'TRADER') return '/trader'
    return '/trader'
  }, [userRole])

  return (
    <div className="space-y-12">
      <section className="card-pro relative overflow-hidden p-8 md:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-28 -end-28 h-72 w-72 rounded-full bg-[color-mix(in_oklab,var(--app-primary)_18%,transparent)] blur-3xl" />
          <div className="absolute -bottom-28 -start-28 h-72 w-72 rounded-full bg-[color-mix(in_oklab,#22c55e_14%,transparent)] blur-3xl" />
        </div>

        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {isArabic ? 'منصة تجارة B2B' : 'B2B Marketplace'}
            </span>
            <h1 className="text-3xl font-bold leading-tight text-app md:text-4xl lg:text-5xl">
              {t('home.title')}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted">
              {t('home.description')}
            </p>

            {!authLoading && (
              <div className="flex flex-wrap gap-3">
                {userRole ? (
                  <>
                    <Link href={dashboardHref} className="btn-primary">
                      {t('nav.dashboard')}
                    </Link>
                    <Link href="/products" className="btn-secondary">
                      {t('nav.products')}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/register" className="btn-primary">
                      {t('home.create')}
                    </Link>
                    <Link href="/login" className="btn-secondary">
                      {t('home.login')}
                    </Link>
                  </>
                )}
              </div>
            )}

            <div className="grid gap-2 text-xs text-muted">
              {highlights.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-[var(--app-primary)]" />
                  <span>{isArabic ? item.ar : item.en}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {roleCards.map((role) => {
              const Icon = role.icon
              return (
                <div
                  key={role.key}
                  className="card-pro rounded-2xl p-5 transition duration-300 hover:shadow-lg hover:shadow-[var(--app-primary)]/10"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--app-primary)_18%,transparent)] text-[var(--app-primary)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-app">{t(role.titleKey)}</h3>
                      <p className="text-sm text-muted">{t(role.descKey)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {ctaCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card-pro group rounded-2xl p-6 transition duration-300 hover:shadow-lg hover:shadow-[var(--app-primary)]/10"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-app">
                {isArabic ? card.arTitle : card.enTitle}
              </h2>
              <ArrowUpRightIcon className="h-4 w-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--app-primary)]" />
            </div>
            <p className="mt-2 text-sm text-muted">
              {isArabic ? card.arDesc : card.enDesc}
            </p>
          </Link>
        ))}
      </section>
    </div>
  )
}
