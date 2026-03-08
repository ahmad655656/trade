'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'

type UserRole = 'ADMIN' | 'SUPPLIER' | 'TRADER'

type MeResponse = {
  success: boolean
  data?: {
    role: UserRole
  }
}

export default function HomePage() {
  const { t } = useUi()
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

    checkAuth()
  }, [])

  const dashboardHref = useMemo(() => {
    if (userRole === 'ADMIN') return '/dashboard/admin'
    if (userRole === 'SUPPLIER') return '/dashboard/supplier'
    return '/dashboard/trader'
  }, [userRole])

  return (
    <div className="space-y-10">
      <section className="card-pro rounded-2xl p-10">
        <h1 className="text-4xl font-bold text-app">{t('home.title')}</h1>
        <p className="mt-4 max-w-2xl text-muted">{t('home.description')}</p>

        {!loading && (
          <div className="mt-6 flex flex-wrap gap-3">
            {isLoggedIn ? (
              <Link href={dashboardHref} className="btn-primary text-base">
                {t('nav.dashboard')}
              </Link>
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
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card-pro p-5">
          <h2 className="text-lg font-semibold text-app">{t('home.adminTitle')}</h2>
          <p className="mt-2 text-sm text-muted">{t('home.adminDesc')}</p>
        </article>
        <article className="card-pro p-5">
          <h2 className="text-lg font-semibold text-app">{t('home.supplierTitle')}</h2>
          <p className="mt-2 text-sm text-muted">{t('home.supplierDesc')}</p>
        </article>
        <article className="card-pro p-5">
          <h2 className="text-lg font-semibold text-app">{t('home.traderTitle')}</h2>
          <p className="mt-2 text-sm text-muted">{t('home.traderDesc')}</p>
        </article>
      </section>
    </div>
  )
}
