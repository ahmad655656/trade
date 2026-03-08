'use client'

import Link from 'next/link'
import { useUi } from '@/components/providers/UiProvider'

export default function ForbiddenPage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'تم رفض الوصول',
      description: 'ليس لديك صلاحية للوصول إلى هذه الصفحة.',
      back: 'العودة للرئيسية',
    },
    en: {
      title: 'Access denied',
      description: 'You do not have permission to access this page.',
      back: 'Back to home',
    },
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-red-300/70 bg-red-50/80 p-8 text-center dark:bg-red-950/30">
      <h1 className="text-2xl font-bold text-red-800 dark:text-red-300">{content[language].title}</h1>
      <p className="mt-3 text-red-700 dark:text-red-200">{content[language].description}</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
      >
        {content[language].back}
      </Link>
    </div>
  )
}
