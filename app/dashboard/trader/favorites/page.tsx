'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function TraderFavoritesPage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'المفضلة',
      description: 'الاحتفاظ بقائمة قصيرة من المنتجات والموردين للشراء لاحقًا.',
    },
    en: {
      title: 'Favorites',
      description: 'Keep a shortlist of products and suppliers for future procurement.',
    },
  }

  return (
    <section className="card-pro rounded-xl p-6">
      <h2 className="text-xl font-semibold text-app">{content[language].title}</h2>
      <p className="mt-2 text-muted">{content[language].description}</p>
    </section>
  )
}
