'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import { orderStatusLabel, paymentStatusLabel, shippingStatusLabel } from '@/lib/order-labels'

type OrderRow = {
  id: string
  orderNumber: string
  totalAmount: number
  status: string
  paymentStatus: string
  shippingStatus: string
  createdAt: string
  shippingMethod: string | null
  trackingNumber: string | null
  estimatedDelivery: string | null
  payment?: {
    status: string
    refundReason?: string | null
  } | null
  trader?: { user?: { name: string; email: string } }
  address?: {
    id: string
    title: string
    recipient: string
    phone: string
    country: string
    city: string
    state: string | null
    address: string
    postalCode: string | null
  } | null
  items: Array<{
    id: string
    quantity: number
    price: number
    total: number
    product: { nameAr: string | null; nameEn: string | null }
    supplier: { user: { name: string; email: string } }
  }>
}

const reviewStatuses = ['WAITING_FOR_ADMIN_REVIEW']

export default function AdminOrdersPage() {
  const { language } = useUi()
  const [items, setItems] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'REVIEW'>('ALL')
  const [reviewNotes, setReviewNotes] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittingPayment, setSubmittingPayment] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/orders', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) {
        setItems(result.data || [])
        if (result.data?.length) {
          setSelectedId((prev) => prev ?? result.data[0].id)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((order) => {
      const matchesSearch =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.trader?.user?.name?.toLowerCase().includes(query) ||
        order.trader?.user?.email?.toLowerCase().includes(query)

      if (!matchesSearch) return false

      if (filter === 'REVIEW') return reviewStatuses.includes(order.status)
      return true
    })
  }, [items, search, filter])

  const selected = filtered.find((order) => order.id === selectedId) ?? filtered[0] ?? null

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

  useEffect(() => {
    setReviewNotes('')
    setPaymentNotes('')
  }, [selected?.id])

  const submitReview = async (approved: boolean) => {
    if (!selected) return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/admin/orders/${selected.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify({ approved, notes: reviewNotes.trim() || undefined }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Review failed')
      toast.success(language === 'ar' ? 'تم تحديث حالة الطلب' : 'Order updated')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحديث الطلب' : 'Failed to update order')
    } finally {
      setSubmitting(false)
    }
  }

  const verifyPayment = async (approved: boolean) => {
    if (!selected) return
    setSubmittingPayment(true)
    try {
      const response = await fetch(`/api/admin/orders/${selected.id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify({ approved, notes: paymentNotes.trim() || undefined }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Payment verification failed')
      toast.success(language === 'ar' ? 'تم تحديث حالة الدفع' : 'Payment status updated')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحديث حالة الدفع' : 'Failed to update payment status')
    } finally {
      setSubmittingPayment(false)
    }
  }

  const addressLine = selected?.address
    ? `${selected.address.country} - ${selected.address.city}${selected.address.state ? ` - ${selected.address.state}` : ''}`
    : null

  return (
    <div className="space-y-4">
      <div className="card-pro p-5">
        <h1 className="text-lg font-semibold text-app">{language === 'ar' ? 'إدارة الطلبات' : 'Orders management'}</h1>
        <p className="mt-1 text-sm text-muted">
          {language === 'ar' ? 'مراجعة الطلبات واعتماد بيانات الشحن قبل إرسالها للمورد.' : 'Review orders and approve shipping details before sending to suppliers.'}
        </p>
      </div>

      <section className="card-pro rounded-xl p-4">
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'REVIEW'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-3 py-2 text-sm ${
                filter === tab
                  ? 'bg-[color-mix(in_oklab,var(--app-primary)_14%,transparent)] text-app'
                  : 'text-muted hover:bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)]'
              }`}
            >
              {tab === 'ALL' ? (language === 'ar' ? 'الكل' : 'All') : language === 'ar' ? 'بانتظار المراجعة' : 'Review pending'}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            className="input-pro"
            placeholder={language === 'ar' ? 'ابحث برقم الطلب أو اسم التاجر' : 'Search by order number or trader'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.6fr]">
        <article className="card-pro rounded-xl p-4">
          {loading ? (
            <p className="text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد طلبات مطابقة.' : 'No matching orders.'}</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedId(order.id)}
                  className={`w-full rounded-lg border p-3 text-start ${
                    selected?.id === order.id
                      ? 'border-[var(--app-primary)] bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)]'
                      : 'border-app'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-app">{order.orderNumber}</p>
                    <span className="text-xs text-muted">{new Date(order.createdAt).toLocaleDateString(language)}</span>
                  </div>
                  <p className="text-xs text-muted">{order.trader?.user?.name || '-'}</p>
                  <p className="text-xs text-muted">
                    {formatSypAmount(order.totalAmount, language)} | {orderStatusLabel(order.status, language)}
                  </p>
                  {reviewStatuses.includes(order.status) && (
                    <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">
                      {language === 'ar' ? 'بانتظار المراجعة' : 'Review pending'}
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
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-app">{selected.orderNumber}</h2>
                <p className="text-sm text-muted">
                  {orderStatusLabel(selected.status, language)} | {paymentStatusLabel(selected.paymentStatus, language)} |{' '}
                  {shippingStatusLabel(selected.shippingStatus, language)}
                </p>
                <p className="text-xs text-muted">{new Date(selected.createdAt).toLocaleString()}</p>
              </div>

              <div className="rounded-lg border border-app p-3">
                <p className="text-sm text-app">{language === 'ar' ? 'بيانات التاجر' : 'Trader details'}</p>
                <p className="text-xs text-muted">{selected.trader?.user?.name || '-'}</p>
                <p className="text-xs text-muted">{selected.trader?.user?.email || '-'}</p>
              </div>

              <div className="rounded-lg border border-app p-3">
                <p className="text-sm text-app">{language === 'ar' ? 'بيانات الإرسال' : 'Shipping details'}</p>
                {selected.address ? (
                  <div className="mt-2 space-y-1 text-xs text-muted">
                    <p>{selected.address.title}</p>
                    <p>{selected.address.recipient}</p>
                    <p>{selected.address.phone}</p>
                    <p>{addressLine}</p>
                    <p>{selected.address.address}</p>
                    {selected.address.postalCode ? <p>{language === 'ar' ? `الرمز البريدي: ${selected.address.postalCode}` : `Postal code: ${selected.address.postalCode}`}</p> : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-600">{language === 'ar' ? 'لا يوجد عنوان شحن مرتبط بعد.' : 'No shipping address linked yet.'}</p>
                )}
                <div className="mt-3 text-xs text-muted">
                  {language === 'ar' ? 'طريقة الشحن:' : 'Shipping method:'} {selected.shippingMethod || (language === 'ar' ? 'غير محددة' : 'Not set')}
                </div>
                <div className="text-xs text-muted">
                  {language === 'ar' ? 'رقم التتبع:' : 'Tracking number:'} {selected.trackingNumber || (language === 'ar' ? 'غير متوفر' : 'Not available')}
                </div>
                {selected.estimatedDelivery ? (
                  <div className="text-xs text-muted">
                    {language === 'ar' ? 'التسليم المتوقع:' : 'Estimated delivery:'} {new Date(selected.estimatedDelivery).toLocaleDateString(language)}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                {selected.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-app p-2">
                    <p className="text-sm text-app">
                      {language === 'ar' ? item.product.nameAr || item.product.nameEn : item.product.nameEn || item.product.nameAr}
                    </p>
                    <p className="text-xs text-muted">{item.supplier.user.name}</p>
                    <p className="text-xs text-muted">
                      {item.quantity} × {formatSypAmount(item.price, language)} = {formatSypAmount(item.total, language)}
                    </p>
                  </div>
                ))}
              </div>

              {selected.status === 'WAITING_FOR_PAYMENT_VERIFICATION' ? (
                <div className="rounded-xl border border-app p-4 space-y-3">
                  <h3 className="font-semibold text-app">{language === 'ar' ? 'التحقق من الدفع' : 'Payment verification'}</h3>
                  <div className="space-y-2 rounded-lg border border-app/60 bg-surface p-3 text-sm">
                    <p className="font-medium text-app">{language === 'ar' ? 'تفاصيل التحويل' : 'Transfer details'}</p>
                    {selectedManualPayment ? (
                      <div className="space-y-1 text-xs text-muted">
                        <p>
                          {language === 'ar' ? 'رقم المرسل:' : 'Sender phone:'} {selectedManualPayment.senderPhone || '-'}
                        </p>
                        <p>
                          {language === 'ar' ? 'التحويل إلى:' : 'Transfer to:'} {selectedManualPayment.transferTo || '-'}
                        </p>
                        {selectedManualPayment.receiptUrl ? (
                          <p>
                            {language === 'ar' ? 'وصل الدفع:' : 'Receipt:'}{' '}
                            <a href={selectedManualPayment.receiptUrl} target="_blank" rel="noreferrer" className="text-[var(--app-primary)] underline">
                              {language === 'ar' ? 'عرض الوصل' : 'View receipt'}
                            </a>
                          </p>
                        ) : null}
                        {selectedManualPayment.notes ? (
                          <p>
                            {language === 'ar' ? 'ملاحظات التاجر:' : 'Trader notes:'} {selectedManualPayment.notes}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600">{language === 'ar' ? 'لا توجد بيانات دفع متاحة.' : 'No payment details available.'}</p>
                    )}
                  </div>

                  <textarea
                    className="input-pro min-h-[90px]"
                    placeholder={language === 'ar' ? 'ملاحظات الاعتماد (اختياري)' : 'Verification notes (optional)'}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary !rounded-lg !px-4 !py-2 text-sm disabled:opacity-60"
                      onClick={() => verifyPayment(true)}
                      disabled={submittingPayment}
                    >
                      {submittingPayment ? (language === 'ar' ? 'جارٍ الاعتماد...' : 'Approving...') : language === 'ar' ? 'اعتماد الدفع' : 'Approve payment'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !rounded-lg !px-4 !py-2 text-sm disabled:opacity-60"
                      onClick={() => verifyPayment(false)}
                      disabled={submittingPayment}
                    >
                      {submittingPayment ? (language === 'ar' ? 'جارٍ الرفض...' : 'Rejecting...') : language === 'ar' ? 'رفض الدفع' : 'Reject payment'}
                    </button>
                  </div>
                </div>
              ) : reviewStatuses.includes(selected.status) ? (
                <div className="rounded-xl border border-app p-4 space-y-3">
                  <h3 className="font-semibold text-app">{language === 'ar' ? 'مراجعة الطلب' : 'Order review'}</h3>
                  <textarea
                    className="input-pro min-h-[90px]"
                    placeholder={language === 'ar' ? 'ملاحظات الإدارة (اختياري)' : 'Admin notes (optional)'}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary !rounded-lg !px-4 !py-2 text-sm disabled:opacity-60"
                      onClick={() => submitReview(true)}
                      disabled={submitting}
                    >
                      {submitting ? (language === 'ar' ? 'جارٍ الاعتماد...' : 'Approving...') : language === 'ar' ? 'اعتماد وإرسال للمورد' : 'Approve & send to supplier'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !rounded-lg !px-4 !py-2 text-sm disabled:opacity-60"
                      onClick={() => submitReview(false)}
                      disabled={submitting}
                    >
                      {submitting ? (language === 'ar' ? 'جارٍ الرفض...' : 'Rejecting...') : language === 'ar' ? 'رفض الطلب' : 'Reject order'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-app p-3 text-sm text-muted">
                  {language === 'ar' ? 'لا توجد مراجعة مطلوبة لهذا الطلب حالياً.' : 'No review action is required for this order right now.'}
                </div>
              )}
            </div>
          )}
        </article>
      </section>
    </div>
  )
}