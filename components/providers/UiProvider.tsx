'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type AppLanguage = 'ar' | 'en'
export type AppTheme = 'light' | 'dark'

type Dictionary = Record<string, { ar: string; en: string }>

const dictionary: Dictionary = {
  'nav.brand': { ar: 'منصة التجارة', en: 'Trade Platform' },
  'nav.about': { ar: 'عن المنصة', en: 'About' },
  'nav.suppliers': { ar: 'الموردون', en: 'Suppliers' },
  'nav.products': { ar: 'المنتجات', en: 'Products' },
  'nav.dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
  'nav.login': { ar: 'تسجيل الدخول', en: 'Login' },
  'nav.register': { ar: 'إنشاء حساب', en: 'Register' },
  'nav.logout': { ar: 'تسجيل الخروج', en: 'Logout' },
  'nav.admin': { ar: 'مدير', en: 'Admin' },
  'nav.supplier': { ar: 'مورد', en: 'Supplier' },
  'nav.trader': { ar: 'تاجر', en: 'Trader' },
  'nav.themeLight': { ar: 'فاتح', en: 'Light' },
  'nav.themeDark': { ar: 'داكن', en: 'Dark' },
  'home.title': { ar: 'منصة B2B احترافية وآمنة', en: 'Professional and Secure B2B Platform' },
  'home.description': {
    ar: 'نظام متكامل يربط المدير والموردين والتجار مع مصادقة قوية وإدارة أدوار دقيقة.',
    en: 'A complete system connecting admins, suppliers, and traders with strong authentication and strict role control.',
  },
  'home.create': { ar: 'إنشاء حساب', en: 'Create account' },
  'home.login': { ar: 'تسجيل الدخول', en: 'Login' },
  'home.adminTitle': { ar: 'المدير', en: 'Admin' },
  'home.adminDesc': { ar: 'إدارة المستخدمين والموردين والمدفوعات والتقارير.', en: 'Manage users, suppliers, payments, and reports.' },
  'home.supplierTitle': { ar: 'المورد', en: 'Supplier' },
  'home.supplierDesc': { ar: 'إدارة المنتجات والمخزون والطلبات والأرباح.', en: 'Manage products, inventory, orders, and earnings.' },
  'home.traderTitle': { ar: 'التاجر', en: 'Trader' },
  'home.traderDesc': { ar: 'تصفح المنتجات والشراء ومتابعة الطلبات.', en: 'Browse products, purchase, and track orders.' },
  'login.title': { ar: 'تسجيل الدخول', en: 'Login' },
  'login.subtitle': { ar: 'ادخل إلى حسابك بأمان.', en: 'Access your account securely.' },
  'login.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'login.password': { ar: 'كلمة المرور', en: 'Password' },
  'login.submit': { ar: 'تسجيل الدخول', en: 'Login' },
  'login.submitting': { ar: 'جارٍ تسجيل الدخول...', en: 'Signing in...' },
  'login.noAccount': { ar: 'لا تملك حسابًا؟', en: 'No account yet?' },
  'login.create': { ar: 'أنشئ حسابًا', en: 'Create one' },
  'register.title': { ar: 'إنشاء حساب جديد', en: 'Create account' },
  'register.subtitle': { ar: 'تسجيل احترافي وآمن للتاجر والمورد.', en: 'High-security registration for traders and suppliers.' },
  'register.accountType': { ar: 'نوع الحساب', en: 'Account type' },
  'register.trader': { ar: 'تاجر', en: 'Trader' },
  'register.supplier': { ar: 'مورد', en: 'Supplier' },
  'register.name': { ar: 'الاسم الكامل', en: 'Full name' },
  'register.phone': { ar: 'الهاتف (اختياري)', en: 'Phone (optional)' },
  'register.company': { ar: 'اسم الشركة', en: 'Company name' },
  'register.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'register.password': { ar: 'كلمة المرور', en: 'Password' },
  'register.confirmPassword': { ar: 'تأكيد كلمة المرور', en: 'Confirm password' },
  'register.submit': { ar: 'إنشاء الحساب', en: 'Create account' },
  'register.submitting': { ar: 'جارٍ إنشاء الحساب...', en: 'Creating account...' },
  'register.haveAccount': { ar: 'لديك حساب بالفعل؟', en: 'Already registered?' },
}

type UiContextValue = {
  language: AppLanguage
  theme: AppTheme
  setLanguage: (lang: AppLanguage) => void
  setTheme: (theme: AppTheme) => void
  toggleTheme: () => void
  t: (key: string) => string
}

const UiContext = createContext<UiContextValue | null>(null)

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    if (typeof window === 'undefined') return 'ar'
    const savedLanguage = localStorage.getItem('app_language')
    return savedLanguage === 'en' ? 'en' : 'ar'
  })
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window === 'undefined') return 'light'
    const savedTheme = localStorage.getItem('app_theme')
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    localStorage.setItem('app_language', language)
    const root = document.documentElement
    root.lang = language
    root.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  useEffect(() => {
    localStorage.setItem('app_theme', theme)
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  const value = useMemo<UiContextValue>(
    () => ({
      language,
      theme,
      setLanguage,
      setTheme,
      toggleTheme: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
      t: (key: string) => dictionary[key]?.[language] ?? key,
    }),
    [language, theme],
  )

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi() {
  const context = useContext(UiContext)
  if (!context) {
    throw new Error('useUi must be used within UiProvider')
  }
  return context
}
