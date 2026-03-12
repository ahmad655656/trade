'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
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
  const totalRatings = reviews.length || 1

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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'قائمة التقييمات' : 'Reviews list'}</h2>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={showOnlyPendingReply}
                onChange={(e) => setShowOnlyPendingReply(e.target.checked)}
              />
              {language === 'ar' ? 'غير مردود عليها فقط' : 'Pending replies only'}
            </label>
          </div>

          <div className="space-y-3">
            {visibleReviews.map((review) => {
              const reviewerInitial = review.fromUser.name?.charAt(0)?.toUpperCase() ?? 'U'
              const productName = language === 'ar'
                ? review.toProduct?.nameAr || review.toProduct?.nameEn || '-'
                : review.toProduct?.nameEn || review.toProduct?.nameAr || '-'

              return (
                <article key={review.id} className="rounded-xl border border-app/70 bg-[color-mix(in_oklab,var(--app-surface)_94%,transparent)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--app-primary)_18%,transparent)] text-sm font-bold text-[var(--app-primary)]">
                        {reviewerInitial}
                      </div>
                      <div>
                        <p className="font-semibold text-app">{review.fromUser.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <span className="rounded-full border border-app/60 px-2 py-0.5">{productName}</span>
                          <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-amber-500">{'★'.repeat(review.rating)}</span>
                      {!review.reply ? (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                          {language === 'ar' ? 'بانتظار رد' : 'Pending reply'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                          {language === 'ar' ? 'تم الرد' : 'Replied'}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-muted">{review.comment || '-'}</p>
                </article>
              )
            })}
          </div>
        </article>

        <article className="card-pro rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'توزيع التقييمات' : 'Rating distribution'}</h2>
            <span className="text-xs text-muted">{language === 'ar' ? `${reviews.length} تقييم` : `${reviews.length} ratings`}</span>
          </div>

          <div className="mt-4 space-y-3">
            {ratingDistribution.map((item, idx) => {
              const percent = Math.round((item.value / totalRatings) * 100)
              const color = ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-orange-500', 'bg-rose-500'][idx] || 'bg-[var(--app-primary)]'
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-app">{item.label}</span>
                    <span className="text-xs text-muted">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[color-mix(in_oklab,var(--app-border)_60%,transparent)]">
                    <div className={`h-2 rounded-full ${color}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )
            })}
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
