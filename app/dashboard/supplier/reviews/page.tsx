'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { SupplierDonutChart } from '@/components/supplier/SupplierCharts'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { useUi } from '@/components/providers/UiProvider'

type ReviewItem = {
  id: string
  rating: number
  comment: string | null
  reply: string | null
  createdAt: string
  fromUser: { name: string }
  toProduct: { nameAr: string | null; nameEn: string | null } | null
}

export default function SupplierReviewsPage() {
  const { language } = useUi()
  const [showOnlyPendingReply, setShowOnlyPendingReply] = useState(false)
  const [reviews, setReviews] = useState<ReviewItem[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/supplier/reviews', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to load reviews')
        setReviews(result.data ?? [])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحميل التقييمات' : 'Failed to load reviews')
      }
    }
    void load()
  }, [language])

  const visibleReviews = useMemo(() => {
    return showOnlyPendingReply ? reviews.filter((item) => !item.reply) : reviews
  }, [reviews, showOnlyPendingReply])

  const averageRating = reviews.length ? (reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(2) : '0.00'

  const ratingDistribution = [
    { label: '5★', value: reviews.filter((r) => r.rating === 5).length },
    { label: '4★', value: reviews.filter((r) => r.rating === 4).length },
    { label: '3★', value: reviews.filter((r) => r.rating === 3).length },
    { label: '2★', value: reviews.filter((r) => r.rating === 2).length },
    { label: '1★', value: reviews.filter((r) => r.rating === 1).length },
  ]

  return (
    <div className="space-y-6">
      <SupplierPageHeader
        titleAr="التقييمات والمراجعات"
        titleEn="Ratings & Reviews"
        subtitleAr="بيانات مباشرة من قاعدة البيانات"
        subtitleEn="Live data from database"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat labelAr="متوسط التقييم" labelEn="Average rating" value={`${averageRating} / 5`} />
        <Stat labelAr="إجمالي التقييمات" labelEn="Total reviews" value={`${reviews.length}`} />
        <Stat labelAr="أعلى تقييم" labelEn="Top score" value={`${Math.max(...reviews.map((r) => r.rating), 0)} / 5`} />
        <Stat labelAr="غير مردود عليها" labelEn="Pending replies" value={`${reviews.filter((r) => !r.reply).length}`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="card-pro rounded-xl p-4 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'قائمة التقييمات' : 'Reviews list'}</h2>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={showOnlyPendingReply} onChange={(e) => setShowOnlyPendingReply(e.target.checked)} />
              {language === 'ar' ? 'غير مردود عليها فقط' : 'Pending replies only'}
            </label>
          </div>

          <div className="space-y-3">
            {visibleReviews.map((review) => (
              <article key={review.id} className="rounded-lg border border-app p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-app">{review.fromUser.name}</p>
                    <p className="text-xs text-muted">{language === 'ar' ? review.toProduct?.nameAr || review.toProduct?.nameEn || '-' : review.toProduct?.nameEn || review.toProduct?.nameAr || '-'}</p>
                  </div>
                  <p className="text-sm text-amber-500">{'★'.repeat(review.rating)}</p>
                </div>

                <p className="mt-2 text-sm text-muted">{review.comment || '-'}</p>
                <p className="mt-1 text-xs text-muted">{new Date(review.createdAt).toLocaleDateString()}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="card-pro rounded-xl p-4">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'توزيع التقييمات' : 'Rating distribution'}</h2>
          <div className="mt-4">
            <SupplierDonutChart data={ratingDistribution} />
          </div>
        </article>
      </section>
    </div>
  )
}

function Stat({ labelAr, labelEn, value }: { labelAr: string; labelEn: string; value: string }) {
  const { language } = useUi()
  return (
    <article className="card-pro rounded-xl p-4">
      <p className="text-sm text-muted">{language === 'ar' ? labelAr : labelEn}</p>
      <p className="mt-2 text-2xl font-bold text-app">{value}</p>
    </article>
  )
}
