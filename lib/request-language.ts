export type AppLanguage = 'ar' | 'en'

export function getRequestLanguage(request: Request): AppLanguage {
  const explicit = request.headers.get('x-app-language')?.toLowerCase().trim()
  if (explicit === 'ar') return 'ar'
  if (explicit === 'en') return 'en'

  const acceptLanguage = request.headers.get('accept-language')?.toLowerCase() ?? ''
  if (acceptLanguage.includes('ar')) return 'ar'
  return 'en'
}

export function i18nText(language: AppLanguage, ar: string, en: string) {
  return language === 'ar' ? ar : en
}
