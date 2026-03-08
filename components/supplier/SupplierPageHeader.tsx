'use client'

import { BellIcon, FunnelIcon, MagnifyingGlassIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { useUi } from '@/components/providers/UiProvider'

type SupplierPageHeaderProps = {
  titleAr: string
  titleEn: string
  subtitleAr: string
  subtitleEn: string
  onHelp?: () => void
}

export default function SupplierPageHeader({
  titleAr,
  titleEn,
  subtitleAr,
  subtitleEn,
  onHelp,
}: SupplierPageHeaderProps) {
  const { language } = useUi()

  return (
    <section className="card-pro rounded-2xl p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app">{language === 'ar' ? titleAr : titleEn}</h1>
          <p className="mt-1 text-sm text-muted">{language === 'ar' ? subtitleAr : subtitleEn}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-72 flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-muted" />
            <input
              placeholder={language === 'ar' ? 'بحث عام: منتجات، طلبات، عملاء' : 'Global search: products, orders, customers'}
              className="input-pro ps-9"
            />
          </div>
          <button className="btn-secondary !rounded-lg !px-3 !py-2 text-sm">
            <FunnelIcon className="h-4 w-4" />
            <span>{language === 'ar' ? 'فلاتر محفوظة' : 'Saved filters'}</span>
          </button>
          <button className="btn-secondary !rounded-lg !px-3 !py-2 text-sm" title={language === 'ar' ? 'الإشعارات' : 'Notifications'}>
            <BellIcon className="h-4 w-4" />
          </button>
          <button
            className="btn-secondary !rounded-lg !px-3 !py-2 text-sm"
            onClick={onHelp}
            title={language === 'ar' ? 'مساعدة' : 'Help'}
          >
            <QuestionMarkCircleIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
