'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import { orderStatusLabel, paymentStatusLabel, shippingStatusLabel } from '@/lib/order-labels'

type Order = {
  id: string
  orderNumber: string
  totalAmount: number
  status: string
  paymentStatus: string
  shippingStatus: string
  createdAt: string
  trackingNumber: string | null
  payment: {
    refundReason: string | null
  } | null
  items: Array<{
    id: string
    quantity: number
    price: number
    total: number
    product: { nameAr: string | null; nameEn: string | null }
    supplier: { user: { name: string } }
  }>
}

const tabs = ['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const
const tabLabel = (tab: (typeof tabs)[number], language: 'ar' | 'en') => {
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
    if (tab === 'ACTIVE') return orders.filter((o) => ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status))
    if (tab === 'COMPLETED') return orders.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status))
    return orders.filter((o) => o.status === 'CANCELLED')
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

  useEffect(() => {
    if (!selected) return
    setProofForm((prev) => ({
      ...prev,
      transferTo: selectedManualPayment?.transferTo || process.env.NEXT_PUBLIC_SYRIATEL_CASH_NUMBER || '0999999999',
    }))
  }, [selected, selectedManualPayment])

  const progressByStatus: Record<string, number> = {
    PENDING: 10,
    CONFIRMED: 25,
    PROCESSING: 50,
    SHIPPED: 75,
    DELIVERED: 100,
    COMPLETED: 100,
    CANCELLED: 100,
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

              {selected.paymentStatus === 'PAID' && (
                <div className="rounded-lg border border-emerald-300/70 bg-emerald-50/60 p-3 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
                  {language === 'ar'
                    ? 'تم دفع هذا الطلب واعتماده من الأدمن. لا تحتاج لإعادة الدفع. بانتظار متابعة الشحن من المورد.'
                    : 'This order is already paid and approved by admin. No further payment is required. Waiting for supplier fulfillment.'}
                </div>
              )}

              {selected.paymentStatus === 'FAILED' && (
                <div className="rounded-lg border border-red-300/70 bg-red-50/70 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
                  {language === 'ar'
                    ? 'تم رفض الدفع لهذا الطلب. يمكنك إعادة الإرسال بطلب جديد أو التواصل مع الدعم.'
                    : 'Payment for this order was rejected. You can place a new order or contact support.'}
                </div>
              )}

              {selected.paymentStatus === 'PENDING' && (
                <div className="rounded-lg border border-app p-3 space-y-2">
                  <h3 className="font-semibold text-app">{language === 'ar' ? 'تأكيد الدفع اليدوي (سيرياتيل كاش)' : 'Manual payment confirmation (Syriatel Cash)'}</h3>
                  <p className="text-xs text-muted">
                    {language === 'ar'
                      ? 'حوّل المبلغ على الرقم التالي ثم ارفع صورة الوصل لإرساله إلى الأدمن للتحقق.'
                      : 'Transfer to the number below, then submit receipt image for admin verification.'}
                  </p>
                  <div className="rounded-md border border-app bg-surface px-3 py-2 text-xs text-app">
                    {language === 'ar'
                      ? `رقم التحويل (سيرياتيل كاش): ${proofForm.transferTo || '0999999999'}`
                      : `Syriatel Cash transfer number: ${proofForm.transferTo || '0999999999'}`}
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
    </div>
  )
}
