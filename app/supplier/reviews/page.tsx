'use client'

import { useEffect, useMemo, useState } from 'react'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { useUi } from '@/components/providers/UiProvider'
import { CloudImage } from '@/components/common/CloudImage'

type Review = {
  id: string
  rating: number
  comment: string | null
  title: string | null
  createdAt: string
  images: string[]
  fromUser: { id: string; name: string }
  toProduct: { id: string; nameAr: string | null; nameEn: string | null } | null
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${filled ? 'text-amber-500' : 'text-gray-300'}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

export default function SupplierReviewsPage() {
  const { language } = useUi()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/supplier/reviews', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) {
          setReviews(result.data ?? [])
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const summary = useMemo(() => {
    if (!reviews.length) return null
    const total = reviews.reduce((sum, item) => sum + item.rating, 0)
    const average = total / reviews.length
    const buckets = [0, 0, 0, 0, 0]
    reviews.forEach((review) => {
      const index = Math.min(Math.max(review.rating, 1), 5) - 1
      buckets[index] += 1
    })
    return { average, total: reviews.length, buckets }
  }, [reviews])

  return (
    <div className="space-y-4">
      <SupplierPageHeader
        titleAr="التقييمات"
        titleEn="Reviews"
        subtitleAr="اطّلع على تقييمات التجار وتحليلات جودة الخدمة."
        subtitleEn="See trader feedback and quality insights."
      />

      {loading ? (
        <div className="card-pro rounded-xl p-4 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : reviews.length === 0 ? (
        <div className="card-pro rounded-xl p-4 text-sm text-muted">{language === 'ar' ? 'لا توجد تقييمات حتى الآن.' : 'No reviews yet.'}</div>
      ) : (
        <>
          {summary && (
            <section className="grid gap-4 md:grid-cols-[1fr_2fr]">
              <article className="card-pro rounded-xl p-4">
                <p className="text-sm text-muted">{language === 'ar' ? 'متوسط التقييم' : 'Average rating'}</p>
                <p className="mt-2 text-3xl font-bold text-app">{summary.average.toFixed(1)} / 5</p>
                <p className="mt-1 text-xs text-muted">
                  {language === 'ar' ? `بناءً على ${summary.total} تقييم` : `Based on ${summary.total} reviews`}
                </p>
              </article>
              <article className="card-pro rounded-xl p-4 space-y-2">
                {summary.buckets.map((count, index) => {
                  const stars = 5 - index
                  const percentage = Math.round((count / summary.total) * 100)
                  return (
                    <div key={stars} className="flex items-center gap-3 text-sm">
                      <span className="w-16 text-muted">{stars} {language === 'ar' ? 'نجوم' : 'stars'}</span>
                      <div className="h-2 flex-1 rounded-full bg-[var(--app-border)]">
                        <div
                          className="h-2 rounded-full bg-[linear-gradient(90deg,var(--app-primary),var(--app-primary-strong))]"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-12 text-muted">{percentage}%</span>
                    </div>
                  )
                })}
              </article>
            </section>
          )}

          <section className="grid gap-4 lg:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="card-pro rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-app">{review.fromUser.name}</p>
                    <p className="text-xs text-muted">
                      {review.toProduct
                        ? language === 'ar'
                          ? review.toProduct.nameAr || review.toProduct.nameEn
                          : review.toProduct.nameEn || review.toProduct.nameAr
                        : language === 'ar'
                          ? 'تقييم عام'
                          : 'General review'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} filled={index < review.rating} />
                    ))}
                  </div>
                </div>

                {review.title ? <p className="text-sm font-semibold text-app">{review.title}</p> : null}
                {review.comment ? <p className="text-sm text-muted leading-6">{review.comment}</p> : null}

                {review.images?.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {review.images.slice(0, 3).map((img) => (
                      <CloudImage key={img} src={img} alt="review" width={160} height={120} className="h-20 w-full rounded-lg object-cover" />
                    ))}
                  </div>
                ) : null}

                <p className="text-xs text-muted">{new Date(review.createdAt).toLocaleDateString(language)}</p>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
