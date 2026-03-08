import type { AppLanguage } from '@/components/providers/UiProvider'

export function formatSypAmount(amount: number, language: AppLanguage) {
  const normalized = Number.isFinite(amount) ? amount : 0
  const locale = language === 'ar' ? 'ar-SY' : 'en-US'
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(normalized))
  return language === 'ar' ? `${formatted} ل.س` : `${formatted} SYP`
}

