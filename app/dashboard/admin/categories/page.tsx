'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'

type CategoryRow = {
  id: string
  name: string
  nameAr: string | null
  nameEn: string | null
  parentId: string | null
}

export default function AdminCategoriesPage() {
  const { language } = useUi()
  const [items, setItems] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/categories', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) {
          setItems(result.data || [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="card-pro p-5">
        <h1 className="text-lg font-semibold text-app">{language === 'ar' ? 'إدارة التصنيفات' : 'Categories management'}</h1>
        <p className="mt-1 text-sm text-muted">
          {language === 'ar' ? 'عرض التصنيفات الحالية في المنصة.' : 'View the current category tree.'}
        </p>
      </div>

      {loading ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : items.length === 0 ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'لا توجد تصنيفات حالياً.' : 'No categories found.'}</div>
      ) : (
        <div className="card-pro p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-app text-muted">
                <th className="p-2 text-start">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الاسم (عربي)' : 'Arabic name'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الاسم (إنجليزي)' : 'English name'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'التصنيف الأب' : 'Parent ID'}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((cat) => (
                <tr key={cat.id} className="border-b border-app/50">
                  <td className="p-2 text-muted">{cat.name}</td>
                  <td className="p-2 text-muted">{cat.nameAr || '-'}</td>
                  <td className="p-2 text-muted">{cat.nameEn || '-'}</td>
                  <td className="p-2 text-muted">{cat.parentId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
