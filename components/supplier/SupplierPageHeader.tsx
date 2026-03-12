'use client'

import type { ReactNode } from 'react'
import { useUi } from '@/components/providers/UiProvider'

type SupplierPageHeaderProps = {
  titleAr: string
  titleEn: string
  subtitleAr: string
  subtitleEn: string
  actions?: ReactNode
}

export default function SupplierPageHeader({
  titleAr,
  titleEn,
  subtitleAr,
  subtitleEn,
  actions,
}: SupplierPageHeaderProps) {
  const { language } = useUi()

  return (
    <section className="card-pro rounded-2xl p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app">{language === 'ar' ? titleAr : titleEn}</h1>
          <p className="mt-1 text-sm text-muted">{language === 'ar' ? subtitleAr : subtitleEn}</p>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  )
}
