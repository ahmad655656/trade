'use client'

import Link from 'next/link'
import type { ComponentType, SVGProps } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useUi } from '@/components/providers/UiProvider'
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants'

type RoleGuide = {
  id: string
  title: { ar: string; en: string }
  description: { ar: string; en: string }
  steps: { ar: string; en: string }[]
  cta: { ar: string; en: string; href: string }
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

type ValueCard = {
  id: string
  title: { ar: string; en: string }
  description: { ar: string; en: string }
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

type FaqItem = {
  id: string
  question: { ar: string; en: string }
  answer: { ar: string; en: string }
}

type UserRole = 'ADMIN' | 'SUPPLIER' | 'TRADER'

type MeResponse = {
  success: boolean
  data?: {
    role: UserRole
  }
}

const highlights = [
  {
    id: 'steps',
    ar: 'خطوات واضحة للتاجر والمورد بدون أي تعقيد.',
    en: 'Clear steps for traders and suppliers without any complexity.',
  },
  {
    id: 'orders',
    ar: 'طلبات وعروض مرتبة في مكان واحد.',
    en: 'Orders and offers neatly organized in one place.',
  },
  {
    id: 'support',
    ar: 'دعم مباشر عندما تحتاجه.',
    en: 'Direct support whenever you need it.',
  },
]

const roleGuides: RoleGuide[] = [
  {
    id: 'trader',
    title: { ar: 'للتاجر: اطلب بضاعتك بسهولة', en: 'For traders: order your stock easily' },
    description: {
      ar: 'أرسل طلبك واستقبل عروض الموردين ثم اختر الأنسب خلال دقائق.',
      en: 'Send your request, receive supplier offers, and choose the best fit in minutes.',
    },
    steps: [
      { ar: 'سجّل محلك بخطوة واحدة.', en: 'Register your store in one step.' },
      { ar: 'أرسل طلبك أو ابحث عن مورد.', en: 'Send a request or search for a supplier.' },
      { ar: 'قارن العروض واختر الأفضل.', en: 'Compare offers and choose the best.' },
    ],
    cta: { ar: 'ابدأ كتاجر', en: 'Start as a trader', href: '/register?role=TRADER' },
    icon: UserGroupIcon,
  },
  {
    id: 'supplier',
    title: { ar: 'للمورد: اعرض منتجاتك ووصل لعملاء جدد', en: 'For suppliers: list products and reach new clients' },
    description: {
      ar: 'اعرض منتجاتك واستقبل طلبات المحلات بسرعة ومن دون مراسلات طويلة.',
      en: 'List your products and receive store requests quickly without long back-and-forth.',
    },
    steps: [
      { ar: 'سجّل كمورد موثوق.', en: 'Sign up as a verified supplier.' },
      { ar: 'أضف منتجاتك وأسعارك.', en: 'Add your products and pricing.' },
      { ar: 'استقبل الطلبات وقدّم عروضك.', en: 'Receive requests and send offers.' },
    ],
    cta: { ar: 'ابدأ كمورد', en: 'Start as a supplier', href: '/register?role=SUPPLIER' },
    icon: BuildingStorefrontIcon,
  },
]

const valueCards: ValueCard[] = [
  {
    id: 'simple',
    title: { ar: 'واجهة بسيطة', en: 'Simple interface' },
    description: {
      ar: 'كل شيء أمامك بخطوات قصيرة وواضحة.',
      en: 'Everything is laid out in short, clear steps.',
    },
    icon: CheckCircleIcon,
  },
  {
    id: 'organized',
    title: { ar: 'طلبات منظمة', en: 'Organized orders' },
    description: {
      ar: 'طلباتك وعروضك في صفحة واحدة لتسريع القرار.',
      en: 'Your orders and offers in one view to speed decisions.',
    },
    icon: ShieldCheckIcon,
  },
  {
    id: 'direct',
    title: { ar: 'تواصل مباشر', en: 'Direct communication' },
    description: {
      ar: 'تواصل سريع وواضح بين التاجر والمورد.',
      en: 'Fast, clear communication between traders and suppliers.',
    },
    icon: UserGroupIcon,
  },
]

const faqItems: FaqItem[] = [
  {
    id: 'skills',
    question: { ar: 'هل أحتاج خبرة تقنية؟', en: 'Do I need technical experience?' },
    answer: {
      ar: 'لا، الواجهة مصممة لتكون مفهومة لأي تاجر أو مورد.',
      en: 'No, the interface is designed to be clear for any trader or supplier.',
    },
  },
  {
    id: 'start',
    question: { ar: 'كيف أبدأ أول طلب أو عرض؟', en: 'How do I start my first order or offer?' },
    answer: {
      ar: 'بعد التسجيل تختار نوعك وتظهر لك الخطوات مباشرة.',
      en: 'After signup, choose your role and the steps appear immediately.',
    },
  },
  {
    id: 'support',
    question: { ar: 'كيف أتواصل عند مشكلة؟', en: 'How can I get help?' },
    answer: {
      ar: 'تواصل معنا عبر الهاتف أو البريد، وسنساعدك فورًا.',
      en: 'Reach us by phone or email and we will help right away.',
    },
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

  const visibleGuides = useMemo(() => {
    if (!userRole) return roleGuides
    if (userRole === 'TRADER') return roleGuides.filter((guide) => guide.id === 'trader')
    if (userRole === 'SUPPLIER') return roleGuides.filter((guide) => guide.id === 'supplier')
    return []
  }, [userRole])

  const dashboardCta = {
    ar: 'اذهب إلى لوحة التحكم',
    en: 'Go to dashboard',
    href: dashboardHref,
  }

  const phoneHref = `tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`

  return (
    <div className="space-y-14">
      <section className="card-pro relative overflow-hidden p-8 md:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-28 -end-28 h-72 w-72 rounded-full bg-[color-mix(in_oklab,var(--app-primary)_18%,transparent)] blur-3xl" />
          <div className="absolute -bottom-28 -start-28 h-72 w-72 rounded-full bg-[color-mix(in_oklab,#22c55e_14%,transparent)] blur-3xl" />
        </div>

        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t('home.badge')}
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
                    {userRole !== 'ADMIN' && (
                      <Link
                        href={userRole === 'SUPPLIER' ? '/supplier/products' : '/trader/products'}
                        className="btn-secondary"
                      >
                        {isArabic
                          ? (userRole === 'SUPPLIER' ? 'منتجاتي' : 'تصفح المنتجات')
                          : (userRole === 'SUPPLIER' ? 'My products' : 'Browse products')}
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link href="/register?role=TRADER" className="btn-primary">
                      {t('home.ctaTrader')}
                    </Link>
                    <Link href="/register?role=SUPPLIER" className="btn-secondary">
                      {t('home.ctaSupplier')}
                    </Link>
                    <Link href="/login" className="inline-flex items-center px-3 py-2 text-sm font-semibold text-muted hover:text-app">
                      {t('nav.login')}
                    </Link>
                  </>
                )}
              </div>
            )}

            <div className="grid gap-2 text-sm text-muted">
              {highlights.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-[var(--app-primary)]" />
                  <span>{isArabic ? item.ar : item.en}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {visibleGuides.length > 0 ? (
              visibleGuides.map((guide) => {
                const Icon = guide.icon
                return (
                  <div
                    key={guide.id}
                    className="card-pro rounded-2xl p-5 transition duration-300 hover:shadow-lg hover:shadow-[var(--app-primary)]/10"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--app-primary)_18%,transparent)] text-[var(--app-primary)]">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-app">
                          {isArabic ? guide.title.ar : guide.title.en}
                        </h3>
                        <p className="text-sm text-muted">
                          {isArabic ? guide.description.ar : guide.description.en}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="card-pro rounded-2xl p-5">
                <h3 className="text-base font-bold text-app">
                  {isArabic ? 'إدارة المنصة' : 'Platform admin'}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {isArabic
                    ? 'انتقل إلى لوحة الإدارة لمتابعة المستخدمين والطلبات.'
                    : 'Go to the admin dashboard to manage users and orders.'}
                </p>
                <Link href={dashboardHref} className="btn-primary mt-4 w-full">
                  {t('nav.dashboard')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {visibleGuides.length > 0 && (
        <section id="roles" className="grid gap-6 lg:grid-cols-2">
          {visibleGuides.map((guide) => {
            const Icon = guide.icon
            const cta = userRole ? dashboardCta : guide.cta
            return (
              <div key={guide.id} className="card-pro rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-[var(--app-primary)]" />
                  <h2 className="text-xl font-bold text-app">
                    {isArabic ? guide.title.ar : guide.title.en}
                  </h2>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {isArabic ? guide.description.ar : guide.description.en}
                </p>
                <div className="mt-4 space-y-2 text-sm text-muted">
                  {guide.steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-primary)]/10 text-xs font-bold text-[var(--app-primary)]">
                        {index + 1}
                      </span>
                      <span>{isArabic ? step.ar : step.en}</span>
                    </div>
                  ))}
                </div>
                <Link href={cta.href} className="btn-primary mt-5 w-full">
                  {isArabic ? cta.ar : cta.en}
                </Link>
              </div>
            )
          })}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {valueCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.id} className="card-pro rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--app-primary)_18%,transparent)] text-[var(--app-primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-app">
                  {isArabic ? card.title.ar : card.title.en}
                </h3>
              </div>
              <p className="mt-3 text-sm text-muted">
                {isArabic ? card.description.ar : card.description.en}
              </p>
            </div>
          )
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card-pro rounded-2xl p-6">
          <h2 className="text-xl font-bold text-app">
            {isArabic ? 'مثال توضيحي سريع' : 'Quick example'}
          </h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            {isArabic
              ? 'مثال: صاحب محل بقالة طلب 5 أصناف، وصلته 3 عروض من موردين مختلفين، فاختار العرض الأنسب من حيث السعر ووقت التوصيل.'
              : 'Example: a grocery owner requested 5 items, received 3 offers from different suppliers, and chose the best price and delivery time.'}
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
            {isArabic
              ? 'الفكرة بسيطة: طلب واضح ? عروض واضحة ? قرار سريع.'
              : 'Simple flow: clear request ? clear offers ? fast decision.'}
          </div>
        </div>

        <div id="faq" className="card-pro rounded-2xl p-6">
          <h2 className="text-xl font-bold text-app">
            {isArabic ? 'أسئلة سريعة' : 'Quick FAQ'}
          </h2>
          <div className="mt-4 space-y-4">
            {faqItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-app">
                  {isArabic ? item.question.ar : item.question.en}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {isArabic ? item.answer.ar : item.answer.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card-pro rounded-2xl p-8 md:p-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <h2 className="text-2xl font-bold text-app">
              {isArabic ? 'دعم مباشر عند الحاجة' : 'Direct support when you need it'}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {isArabic
                ? 'لو واجهت أي خطوة غير واضحة، تواصل معنا وسنساعدك فورًا.'
                : 'If anything is unclear, reach out and we will help immediately.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={phoneHref} className="btn-primary" dir="ltr">
                {SUPPORT_PHONE}
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-secondary" dir="ltr">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-muted">
            {isArabic
              ? 'ابدأ كتاجر أو مورد، والواجهة سترشدك خطوة بخطوة داخل الموقع.'
              : 'Start as a trader or supplier, and the interface will guide you step by step.'}
            <Link href="/register" className="btn-primary mt-4 w-full">
              {isArabic ? 'ابدأ الآن' : 'Get started'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}



