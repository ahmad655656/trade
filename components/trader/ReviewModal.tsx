'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useUi } from '@/components/providers/UiProvider'

type ReviewModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ReviewFormData) => Promise<void>
  orderNumber: string
  supplierName: string
  productName: string
}

export type ReviewFormData = {
  rating: number
  qualityRating: number
  deliverySpeedRating: number
  descriptionAccuracyRating: number
  communicationRating: number
  title: string
  comment: string
  images: string[]
}

const ratingLabels = {
  ar: {
    quality: 'جودة المنتج',
    deliverySpeed: 'سرعة التوصيل',
    descriptionAccuracy: 'دقة الوصف',
    communication: 'جودة التواصل',
    overall: 'التقييم العام',
  },
  en: {
    quality: 'Product Quality',
    deliverySpeed: 'Delivery Speed',
    descriptionAccuracy: 'Description Accuracy',
    communication: 'Communication Quality',
    overall: 'Overall Rating',
  },
}

const ratingDescriptions = {
  ar: {
    1: 'سيء جداً',
    2: 'سيء',
    3: 'مقبول',
    4: 'جيد',
    5: 'ممتاز',
  },
  en: {
    1: 'Very Bad',
    2: 'Bad',
    3: 'Acceptable',
    4: 'Good',
    5: 'Excellent',
  },
}

export default function ReviewModal({ isOpen, onClose, onSubmit, orderNumber, supplierName, productName }: ReviewModalProps) {
  const { language } = useUi()
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<ReviewFormData>({
    rating: 5,
    qualityRating: 5,
    deliverySpeedRating: 5,
    descriptionAccuracyRating: 5,
    communicationRating: 5,
    title: '',
    comment: '',
    images: [],
  })

  const t = ratingLabels[language]
  const td = ratingDescriptions[language]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
      setFormData({
        rating: 5,
        qualityRating: 5,
        deliverySpeedRating: 5,
        descriptionAccuracyRating: 5,
        communicationRating: 5,
        title: '',
        comment: '',
        images: [],
      })
    } finally {
      setSubmitting(false)
    }
  }

  const renderStarRating = (
    name: keyof ReviewFormData,
    label: string,
    showDescription: boolean = true
  ) => {
    const value = formData[name] as number
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-app">{label}</label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, [name]: star }))}
              className="focus:outline-none"
            >
              <svg
                className={`h-8 w-8 transition-colors ${
                  star <= value ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'
                }`}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
          {showDescription && (
            <span className="text-sm font-medium text-amber-600 mr-2">{td[value as keyof typeof td]}</span>
          )}
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="mb-1 text-xl font-bold text-app">
          {language === 'ar' ? 'تقييم المورد' : 'Rate Supplier'}
        </h2>
        <p className="mb-6 text-sm text-muted">
          {language === 'ar'
            ? `طلب رقم ${orderNumber} - ${supplierName}`
            : `Order #${orderNumber} - ${supplierName}`}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
            {renderStarRating('rating', t.overall)}
          </div>

          {/* Sub Ratings */}
          <div className="grid gap-4 sm:grid-cols-2">
            {renderStarRating('qualityRating', t.quality)}
            {renderStarRating('deliverySpeedRating', t.deliverySpeed)}
            {renderStarRating('descriptionAccuracyRating', t.descriptionAccuracy)}
            {renderStarRating('communicationRating', t.communication)}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-app">
              {language === 'ar' ? 'عنوان التقييم (اختياري)' : 'Review Title (Optional)'}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={language === 'ar' ? 'ملخص تجربتك...' : 'Summarize your experience...'}
              maxLength={200}
              className="input-pro mt-1"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-app">
              {language === 'ar' ? 'التعليق (اختياري)' : 'Comment (Optional)'}
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder={language === 'ar'
                ? 'شارك تجربتك مع هذا المورد...'
                : 'Share your experience with this supplier...'}
              maxLength={4000}
              rows={4}
              className="input-pro mt-1 resize-none"
            />
            <p className="mt-1 text-xs text-muted">{formData.comment.length}/4000</p>
          </div>

          {/* Average Rating Preview */}
          <div className="rounded-lg border border-app p-3">
            <p className="text-sm text-muted">
              {language === 'ar' ? 'متوسط التقييم:' : 'Average Rating:'}
            </p>
            <p className="text-2xl font-bold text-app">
              {(
                (formData.rating +
                  formData.qualityRating +
                  formData.deliverySpeedRating +
                  formData.descriptionAccuracyRating +
                  formData.communicationRating) /
                5
              ).toFixed(1)}{' '}
              / 5
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting
              ? language === 'ar'
                ? 'جارٍ الإرسال...'
                : 'Submitting...'
              : language === 'ar'
                ? 'إرسال التقييم'
                : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  )
}

