'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import { orderStatusLabel, paymentStatusLabel, shippingStatusLabel } from '@/lib/order-labels'
import { SYRIATEL_CASH_NUMBER, SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants'
import ReviewModal, { ReviewFormData } from '@/components/trader/ReviewModal'

type Order = {
  id: string
  orderNumber: string
  totalAmount: number
  status: string
  paymentStatus: string
  shippingStatus: string
  createdAt: string
  estimatedDelivery: string | null
  trackingNumber: string | null
  payment: {
    refundReason: string | null
  } | null
  items: Array<{
    id: string
    quantity: number
    price: number
    total: number
    product: { nameAr: string | null; nameEn: string | null; id: string }
    supplier: { id: string; user: { name: string } }
  }>
}

const tabs = ['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const

function tabLabel(tab: (typeof tabs)[number], language: 'ar' | 'en') {
  if (tab === 'ALL') return language === 'ar' ? 'الكل' : 'All'
  if (tab === 'ACTIVE') return language === 'ar' ? 'النشطة' : 'Active'
  if (tab === 'COMPLETED') return language === 'ar' ? 'المكتملة' : 'Completed'
  return language === 'ar' ? 'الملغاة' : 'Cancelled'
}

export default function TraderOrdersPage() {
  const { language } = useUi()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<(typeof tabs)[number]>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [submittingProof, setSubmittingProof] = useState(false)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null)
  const [reviewedOrders, setReviewedOrders] = useState<Set<string>>(new Set())
  const [proofForm, setProofForm] = useState({
    senderPhone: '',
    transferTo: '',
    receiptUrl: '',
    notes: '',
  })

  const uploadReceipt = async (file: File) => {
    setUploadingProof(true)
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error(language === 'ar' ? 'يجب اختيار ملف صورة فقط' : 'Please select an image file only')
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(language === 'ar' ? 'حجم الصورة يجب أن يكون 5MB أو أقل' : 'Image must be 5MB or less')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/uploads/receipt', {
        method: 'POST',
        headers: { 'x-app-language': language },
        body: formData,
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Upload failed')

      setProofForm((prev) => ({ ...prev, receiptUrl: result.data.url }))
    } finally {
      setUploadingProof(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/orders', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) {
          setOrders(result.data ?? [])
          if (result.data?.length) setSelectedId(result.data[0].id)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (tab === 'ALL') return orders
    if (tab === 'ACTIVE')
      return orders.filter((o) =>
        [
          'PENDING_PLATFORM_FEE_PAYMENT',
          'WAITING_FOR_PAYMENT_VERIFICATION',
          'PLATFORM_FEE_CONFIRMED',
          'WAITING_FOR_ADMIN_REVIEW',
          'ADMIN_APPROVED',
          'SUPPLIER_PREPARING_ORDER',
          'SHIPPED',
          'AWAITING_DELIVERY_CONFIRMATION',
          'DISPUTE_OPENED',
          'PENDING',
          'CONFIRMED',
          'PROCESSING',
        ].includes(o.status),
      )
    if (tab === 'COMPLETED') return orders.filter((o) => ['DELIVERED', 'COMPLETED', 'ORDER_CLOSED'].includes(o.status))
    return orders.filter((o) => ['CANCELLED', 'PAYMENT_REJECTED', 'ADMIN_REJECTED'].includes(o.status))
  }, [orders, tab])

  const selected = filtered.find((o) => o.id === selectedId) ?? filtered[0] ?? null
  const selectedManualPayment = useMemo(() => {
    if (!selected?.payment?.refundReason) return null
    try {
      return JSON.parse(selected.payment.refundReason) as {
        senderPhone?: string
        transferTo?: string
        receiptUrl?: string
        notes?: string
        submittedAt?: string
      }
    } catch {
      return null
    }
  }, [selected])

  const estimatedDeliveryDate = useMemo(() => {
    if (!selected?.estimatedDelivery) return null
    const date = new Date(selected.estimatedDelivery)
    return Number.isFinite(date.getTime()) ? date : null
  }, [selected])

  const canConfirmDelivery = useMemo(() => {
    if (!selected) return false
    if (selected.status === 'AWAITING_DELIVERY_CONFIRMATION') return true
    if (selected.status === 'SHIPPED' && estimatedDeliveryDate) {
      return new Date() >= estimatedDeliveryDate
    }
    return false
  }, [selected, estimatedDeliveryDate])

  useEffect(() => {
    if (!selected) return
    setProofForm((prev) => ({
      ...prev,
      transferTo: selectedManualPayment?.transferTo || SYRIATEL_CASH_NUMBER,
    }))
  }, [selected, selectedManualPayment])

  const handleReviewSubmit = async (data: ReviewFormData) => {
    if (!reviewOrder) return
    
    const response = await fetch(`/api/trader/orders/${reviewOrder.id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-language': language,
      },
      body: JSON.stringify(data),
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error || (language === 'ar' ? 'فشل إرسال التقييم' : 'Failed to submit review'))
    }
    
    setReviewedOrders(prev => new Set([...prev, reviewOrder.id]))
    alert(language === 'ar' ? '✅ تم إرسال التقييم بنجاح' : '✅ Review submitted successfully')
  }

  const openReviewModal = (order: Order) => {
    setReviewOrder(order)
    setShowReviewModal(true)
  }

  const progressByStatus: Record<string, number> = {
    PENDING_PLATFORM_FEE_PAYMENT: 10,
    WAITING_FOR_PAYMENT_VERIFICATION: 20,
    PLATFORM_FEE_CONFIRMED: 35,
    WAITING_FOR_ADMIN_REVIEW: 40,
    ADMIN_APPROVED: 45,
    SUPPLIER_PREPARING_ORDER: 55,
    PENDING: 10,
    CONFIRMED: 25,
    PROCESSING: 50,
    SHIPPED: 75,
    AWAITING_DELIVERY_CONFIRMATION: 90,
    DELIVERED: 95,
    ORDER_CLOSED: 100,
    COMPLETED: 100,
    CANCELLED: 100,
    PAYMENT_REJECTED: 100,
    ADMIN_REJECTED: 100,
    DISPUTE_OPENED: 60,
  }

  return (
    <div className="space-y-4">
      <section className="card-pro rounded-xl p-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-2 text-sm ${tab === t ? 'bg-[color-mix(in_oklab,var(--app-primary)_14%,transparent)] text-app' : 'text-muted hover:bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)]'}`}>
              {tabLabel(t, language)}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="card-pro rounded-xl p-4">
          {loading ? (
            <p className="text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((order) => (
                <button key={order.id} onClick={() => setSelectedId(order.id)} className={`w-full rounded-lg border p-3 text-start ${selected?.id === order.id ? 'border-[var(--app-primary)] bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)]' : 'border-app'}`}>
                  <p className="font-medium text-app">{order.orderNumber}</p>
                  <p className="text-xs text-muted">{formatSypAmount(order.totalAmount, language)} | {paymentStatusLabel(order.paymentStatus, language)}</p>
                  <div className="mt-2 h-1.5 rounded bg-[var(--app-border)]">
                    <div className="h-1.5 rounded bg-[var(--app-primary)]" style={{ width: `${progressByStatus[order.status] ?? 15}%` }} />
                  </div>
                  {reviewedOrders.has(order.id) && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {language === 'ar' ? 'تم التقييم' : 'Reviewed'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="card-pro rounded-xl p-4">
          {!selected ? (
            <p className="text-sm text-muted">{language === 'ar' ? 'اختر طلبًا لعرض التفاصيل' : 'Select an order for details'}</p>
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-app">{selected.orderNumber}</h2>
              <p className="text-sm text-muted">
                {orderStatusLabel(selected.status, language)} | {paymentStatusLabel(selected.paymentStatus, language)} | {shippingStatusLabel(selected.shippingStatus, language)}
              </p>
              <p className="text-sm text-muted">{new Date(selected.createdAt).toLocaleString()}</p>

              <div className="space-y-2">
                {selected.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-app p-2">
                    <p className="text-sm text-app">{language === 'ar' ? item.product.nameAr || item.product.nameEn : item.product.nameEn || item.product.nameAr}</p>
                    <p className="text-xs text-muted">{item.supplier.user.name}</p>
                    <p className="text-xs text-muted">{item.quantity} x {formatSypAmount(item.price, language)} = {formatSypAmount(item.total, language)}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-app p-2 text-sm text-muted">
                {language === 'ar' ? 'رقم التتبع:' : 'Tracking number:'} {selected.trackingNumber ?? (language === 'ar' ? 'غير متوفر بعد' : 'Not available yet')}
              </div>

                            {selected.paymentStatus === 'PAID' && selected.status === 'WAITING_FOR_ADMIN_REVIEW' && (
                <div className="rounded-lg border border-amber-300/70 bg-amber-50/70 p-3 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                  {language === 'ar'
                    ? 'تم اعتماد الدفع وبانتظار مراجعة الإدارة للطلب قبل إرساله للمورد.'
                    : 'Payment verified. Waiting for admin review before sending to supplier.'}
                </div>
              )}

              {selected.paymentStatus === 'PAID' && selected.status !== 'WAITING_FOR_ADMIN_REVIEW' && selected.status !== 'ADMIN_REJECTED' && (
                <div className="rounded-lg border border-emerald-300/70 bg-emerald-50/60 p-3 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
                  {language === 'ar'
                    ? 'تم اعتماد الطلب وإرساله للمورد. بانتظار تحديثات الشحن.'
                    : 'Order approved and sent to supplier. Waiting for shipping updates.'}
                </div>
              )}

                            {selected.status === 'ADMIN_REJECTED' && (
                <div className="rounded-lg border border-red-300/70 bg-red-50/70 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
                  {language === 'ar'
                    ? 'تم رفض الطلب من الإدارة. يمكنك تعديل بيانات الشحن وإعادة الطلب.'
                    : 'Order was rejected by admin. Please update shipping details and reorder.'}
                </div>
              )}
{selected.paymentStatus === 'FAILED' && (
                <div className="rounded-lg border border-red-300/70 bg-red-50/70 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
                  {language === 'ar'
                    ? 'تم رفض الدفع لهذا الطلب. يمكنك إعادة الإرسال بطلب جديد أو التواصل مع الدعم.'
                    : 'Payment for this order was rejected. You can place a new order or contact support.'}
                </div>
              )}

              {selected.paymentStatus !== 'PAID' && selected.status !== 'ADMIN_REJECTED' && (
                <div className="rounded-lg border border-app p-3 space-y-2">
                  <h3 className="font-semibold text-app">{language === 'ar' ? 'تأكيد عمولة المنصة (سيرياتيل كاش)' : 'Platform fee confirmation (Syriatel Cash)'}</h3>
                  <p className="text-xs text-muted">
                    {language === 'ar'
                      ? 'حوّل عمولة المنصة إلى الرقم التالي ثم ارفع صورة الوصل للتحقق التلقائي.'
                      : 'Transfer platform commission to the number below, then upload receipt for verification.'}
                  </p>
                  <div className="rounded-md border border-app bg-surface px-3 py-2 text-xs text-app">
                    {language === 'ar'
                      ? `رقم سيرياتيل كاش: ${SYRIATEL_CASH_NUMBER}`
                      : `Syriatel Cash: ${SYRIATEL_CASH_NUMBER}`}
                  </div>
                  <div className="text-xs text-muted">
                    {language === 'ar'
                      ? `للاستفسار أو الدعم: ${SUPPORT_EMAIL} - ${SUPPORT_PHONE}`
                      : `For support: ${SUPPORT_EMAIL} - ${SUPPORT_PHONE}`}
                  </div>
                  <input
                    className="input-pro"
                    placeholder={language === 'ar' ? 'رقم المرسل (من حسابك سيرياتيل كاش)' : 'Sender phone (your Syriatel Cash number)'}
                    value={proofForm.senderPhone}
                    onChange={(e) => setProofForm((p) => ({ ...p, senderPhone: e.target.value }))}
                  />
                  <p className="text-xs text-muted">
                    {language === 'ar' ? 'هذا هو رقم حسابك الذي أرسلت منه التحويل.' : 'This is your account number that sent the transfer.'}
                  </p>
                  <input
                    className="input-pro"
                    placeholder={language === 'ar' ? 'الرقم المحول إليه' : 'Transfer-to number'}
                    value={proofForm.transferTo}
                    onChange={(e) => setProofForm((p) => ({ ...p, transferTo: e.target.value }))}
                  />
                  <p className="text-xs text-muted">
                    {language === 'ar' ? 'رقم سيرياتيل كاش الذي حوّلت إليه المبلغ.' : 'The Syriatel Cash number you transferred to.'}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="input-pro"
                    disabled={uploadingProof}
                    onChange={async (e) => {
                      const input = e.currentTarget
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        await uploadReceipt(file)
                      } catch (error) {
                        alert(error instanceof Error ? error.message : 'Upload failed')
                      } finally {
                        input.value = ''
                      }
                    }}
                  />
                  {proofForm.receiptUrl ? (
                    <a href={proofForm.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--app-primary)] underline">
                      {language === 'ar' ? 'تم رفع الوصل - عرض الصورة' : 'Receipt uploaded - View image'}
                    </a>
                  ) : (
                    <p className="text-xs text-muted">
                      {uploadingProof
                        ? language === 'ar'
                          ? 'جارٍ رفع صورة الوصل...'
                          : 'Uploading receipt image...'
                        : language === 'ar'
                          ? 'ارفع لقطة شاشة الوصل من جهازك'
                          : 'Upload receipt screenshot from your device'}
                    </p>
                  )}
                  <textarea
                    className="input-pro min-h-20"
                    placeholder={language === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Extra notes (optional)'}
                    value={proofForm.notes}
                    onChange={(e) => setProofForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                  <p className="text-xs text-muted">
                    {language === 'ar' ? 'أضف أي ملاحظة تساعد الأدمن في التحقق السريع.' : 'Add any note that helps admin verify faster.'}
                  </p>
                  <button
                    className="btn-primary !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60"
                    disabled={submittingProof || uploadingProof || !proofForm.receiptUrl}
                    onClick={async () => {
                      if (!selected) return
                      setSubmittingProof(true)
                      try {
                        const response = await fetch(`/api/trader/orders/${selected.id}/manual-payment`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-app-language': language,
                          },
                          body: JSON.stringify(proofForm),
                        })
                        const result = await response.json()
                        if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to submit proof')
                        window.location.reload()
                      } catch (error) {
                        alert(error instanceof Error ? error.message : 'Failed to submit proof')
                      } finally {
                        setSubmittingProof(false)
                      }
                    }}
                  >
                    {submittingProof
                      ? language === 'ar'
                        ? 'جارٍ الإرسال...'
                        : 'Submitting...'
                      : language === 'ar'
                        ? 'إرسال بيانات الدفع للأدمن'
                        : 'Submit payment details to admin'}
                  </button>
                </div>
              )}

              {(selected.status === 'AWAITING_DELIVERY_CONFIRMATION' || (selected.status === 'SHIPPED' && estimatedDeliveryDate)) && (
                <div className="space-y-2">
                  {selected.status === 'SHIPPED' && estimatedDeliveryDate && !canConfirmDelivery && (
                    <div className="rounded-lg border border-amber-300/70 bg-amber-50/70 p-3 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                      {language === 'ar'
                        ? `يمكنك تأكيد الاستلام بعد تاريخ ${estimatedDeliveryDate.toLocaleDateString()} ${estimatedDeliveryDate.toLocaleTimeString()}`
                        : `You can confirm delivery after ${estimatedDeliveryDate.toLocaleDateString()} ${estimatedDeliveryDate.toLocaleTimeString()}`}
                    </div>
                  )}
                  <button
                    className="btn-primary !rounded-lg !px-3 !py-2 text-sm"
                    disabled={!canConfirmDelivery}
                    onClick={async () => {
                      if (!selected) return
                      const response = await fetch(`/api/trader/orders/${selected.id}/confirm-delivery`, {
                        method: 'POST',
                        headers: { 'x-app-language': language },
                      })
                      const result = await response.json()
                      if (!response.ok || !result.success) {
                        alert(result.error || (language === 'ar' ? 'فشل تأكيد الاستلام' : 'Failed to confirm delivery'))
                        return
                      }
                      window.location.reload()
                    }}
                  >
                    {language === 'ar' ? 'تأكيد الاستلام وإغلاق الطلب' : 'Confirm delivery & close order'}
                  </button>
                </div>
              )}

              {['SHIPPED', 'AWAITING_DELIVERY_CONFIRMATION', 'DELIVERED', 'ORDER_CLOSED'].includes(selected.status) && (
                <button
                  className="btn-secondary !rounded-lg !px-3 !py-2 text-sm"
                  onClick={async () => {
                    if (!selected) return
                    const reasonPrompt = language === 'ar'
                      ? window.prompt('سبب النزاع: 1) NOT_AS_DESCRIBED 2) DAMAGED_GOODS 3) MISSING_ITEMS')
                      : window.prompt('Dispute reason: 1) NOT_AS_DESCRIBED 2) DAMAGED_GOODS 3) MISSING_ITEMS')
                    const reason = reasonPrompt === '2' ? 'DAMAGED_GOODS' : reasonPrompt === '3' ? 'MISSING_ITEMS' : 'NOT_AS_DESCRIBED'
                    const description = language === 'ar'
                      ? window.prompt('اكتب وصف المشكلة')
                      : window.prompt('Describe the issue')
                    if (!description?.trim()) return
                    const response = await fetch('/api/disputes', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-app-language': language,
                      },
                      body: JSON.stringify({
                        orderId: selected.id,
                        reason,
                        description,
                        images: selectedManualPayment?.receiptUrl ? [selectedManualPayment.receiptUrl] : [],
                      }),
                    })
                    const result = await response.json()
                    if (!response.ok || !result.success) {
                      alert(result.error || (language === 'ar' ? 'فشل فتح النزاع' : 'Failed to open dispute'))
                      return
                    }
                    window.location.reload()
                  }}
                >
                  {language === 'ar' ? 'فتح نزاع' : 'Open dispute'}
                </button>
              )}

              {selected.status === 'ORDER_CLOSED' && (
                <button
                  className={`btn-secondary !rounded-lg !px-3 !py-2 text-sm ${
                    reviewedOrders.has(selected.id) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => openReviewModal(selected)}
                  disabled={reviewedOrders.has(selected.id)}
                >
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {reviewedOrders.has(selected.id)
                      ? language === 'ar'
                        ? 'تم التقييم'
                        : 'Reviewed'
                      : language === 'ar'
                        ? 'تقييم المورد'
                        : 'Rate Supplier'}
                  </span>
                </button>
              )}

              {selectedManualPayment?.submittedAt && (
                <div className="rounded-lg border border-app p-2 text-xs text-muted">
                  {language === 'ar'
                    ? `تم إرسال بيانات الدفع بتاريخ ${new Date(selectedManualPayment.submittedAt).toLocaleString()}`
                    : `Payment details submitted at ${new Date(selectedManualPayment.submittedAt).toLocaleString()}`}
                </div>
              )}
            </div>
          )}
        </article>
      </section>

      {reviewOrder && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false)
            setReviewOrder(null)
          }}
          onSubmit={handleReviewSubmit}
          orderNumber={reviewOrder.orderNumber}
          supplierName={reviewOrder.items[0]?.supplier.user.name || ''}
          productName={language === 'ar' 
            ? reviewOrder.items[0]?.product.nameAr || reviewOrder.items[0]?.product.nameEn || ''
            : reviewOrder.items[0]?.product.nameEn || reviewOrder.items[0]?.product.nameAr || ''
          }
        />
      )}
    </div>
  )
}

