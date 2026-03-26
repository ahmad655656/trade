'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import { orderStatusLabel, paymentStatusLabel, shippingStatusLabel } from '@/lib/order-labels'



type Order = {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  shippingStatus: string
  totalAmount: number
  createdAt: string
  shippingMethod: string | null
  trackingNumber: string | null
  estimatedDelivery: string | null
  supplierPaymentConfirmedAt: string | null
  trader: { user: { name: string; email: string } }
  items: Array<{
    id: string
    quantity: number
    price: number
    total: number
    product: { id: string; nameAr: string | null; nameEn: string | null }
  }>
}

type ShippingMethod = {
  id: string
  name: string
}

const statusBuckets: Record<string, string[]> = {
  ALL: [],
  PREPARING: ['WAITING_FOR_ADMIN_REVIEW', 'PLATFORM_FEE_CONFIRMED', 'ADMIN_APPROVED', 'SUPPLIER_PREPARING_ORDER', 'PROCESSING'],
  SHIPPED: ['SHIPPED'],
  DELIVERED: ['AWAITING_DELIVERY_CONFIRMATION', 'DELIVERED', 'ORDER_CLOSED'],
  CANCELLED: ['CANCELLED'],
}

export default function SupplierOrdersPage() {
  const { language } = useUi()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [updating, setUpdating] = useState(false)
  const [fulfillment, setFulfillment] = useState({
    status: 'PROCESSING',
    shippingMethod: '',
    trackingNumber: '',
    estimatedDeliveryDays: '',
    notes: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const [ordersResponse, methodsResponse] = await Promise.all([
        fetch('/api/orders', { cache: 'no-store' }),
        fetch('/api/supplier/shipping-methods', { cache: 'no-store' }),
      ])
      const ordersResult = await ordersResponse.json()
      const methodsResult = await methodsResponse.json()
      if (ordersResponse.ok && ordersResult.success) {
        setOrders(ordersResult.data ?? [])
        if (ordersResult.data?.length) {
          setSelectedId((prev) => prev ?? ordersResult.data[0].id)
        }
      }
      if (methodsResponse.ok && methodsResult.success) {
        setShippingMethods(methodsResult.data ?? [])
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
    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.trader.user.name.toLowerCase().includes(query)

      if (!matchesSearch) return false

      if (statusFilter === 'ALL') return true
      const bucket = statusBuckets[statusFilter] ?? []
      return bucket.includes(order.status)
    })
  }, [orders, search, statusFilter])

  const selected = filtered.find((order) => order.id === selectedId) ?? filtered[0] ?? null

  useEffect(() => {
    if (!selected) return
    const defaultStatus = selected.shippingStatus === 'SHIPPED'
      ? 'SHIPPED'
      : selected.shippingStatus === 'DELIVERED'
        ? 'DELIVERED'
        : 'PROCESSING'

    setFulfillment({
      status: defaultStatus,
      shippingMethod: selected.shippingMethod ?? '',
      trackingNumber: selected.trackingNumber ?? '',
      estimatedDeliveryDays: '',
      notes: '',
    })
  }, [selected?.id])

  const canUpdate = Boolean(selected && selected.paymentStatus === 'PAID' && !['DELIVERED', 'ORDER_CLOSED', 'SUPPLIER_PAYMENT_CONFIRMED'].includes(selected.status) && ['ADMIN_APPROVED', 'PLATFORM_FEE_CONFIRMED', 'SUPPLIER_PREPARING_ORDER', 'SHIPPED', 'AWAITING_DELIVERY_CONFIRMATION'].includes(selected.status))

  const submitFulfillment = async () => {
    if (!selected) return

    setUpdating(true)
    try {
      const payload = {
        status: fulfillment.status,
        shippingMethod: fulfillment.shippingMethod || undefined,
        trackingNumber: fulfillment.trackingNumber || undefined,
        estimatedDeliveryDays: fulfillment.estimatedDeliveryDays ? Number(fulfillment.estimatedDeliveryDays) : undefined,
        notes: fulfillment.notes || undefined,
      }

      const response = await fetch(`/api/supplier/orders/${selected.id}/fulfillment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || (language === 'ar' ? 'فشل تحديث الطلب' : 'Failed to update order'))
      }

      toast.success(language === 'ar' ? 'تم تحديث الطلب' : 'Order updated')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحديث الطلب' : 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <SupplierPageHeader
        titleAr="إدارة الطلبات"
        titleEn="Orders management"
        subtitleAr="تابع طلباتك وحدّث حالة الشحن والتسليم بسهولة."
        subtitleEn="Track orders and update shipping status with ease."
        actions={
          <button className="btn-secondary !rounded-lg !px-3 !py-2 text-sm" onClick={load}>
            {language === 'ar' ? 'تحديث القائمة' : 'Refresh list'}
          </button>
        }
      />

      <section className="card-pro rounded-xl p-4">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`rounded-lg px-3 py-2 text-sm ${
                statusFilter === tab
                  ? 'bg-[color-mix(in_oklab,var(--app-primary)_14%,transparent)] text-app'
                  : 'text-muted hover:bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)]'
              }`}
            >
              {tab === 'ALL'
                ? language === 'ar' ? 'الكل' : 'All'
                : tab === 'PREPARING'
                  ? language === 'ar' ? 'قيد التجهيز' : 'Preparing'
                  : tab === 'SHIPPED'
                    ? language === 'ar' ? 'تم الشحن' : 'Shipped'
                    : tab === 'DELIVERED'
                      ? language === 'ar' ? 'تم التسليم' : 'Delivered'
                      : language === 'ar' ? 'ملغاة' : 'Cancelled'}
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

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
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
                  <p className="text-xs text-muted">{order.trader.user.name}</p>
                  <p className="text-xs text-muted">
                    {formatSypAmount(order.totalAmount, language)} | {orderStatusLabel(order.status, language)}
                  </p>
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
                <p className="text-sm text-app">{language === 'ar' ? 'معلومات التاجر' : 'Trader details'}</p>
                <p className="text-xs text-muted">{selected.trader.user.name}</p>
                <p className="text-xs text-muted">{selected.trader.user.email}</p>
              </div>

              <div className="space-y-2">
                {selected.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-app p-2">
                    <p className="text-sm text-app">
                      {language === 'ar' ? item.product.nameAr || item.product.nameEn : item.product.nameEn || item.product.nameAr}
                    </p>
                    <p className="text-xs text-muted">
                      {item.quantity} × {formatSypAmount(item.price, language)} = {formatSypAmount(item.total, language)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-app p-3 text-sm text-muted">
                {language === 'ar' ? 'طريقة الشحن الحالية:' : 'Current shipping method:'} {selected.shippingMethod || (language === 'ar' ? 'غير محددة' : 'Not set')}
              </div>

              <div className="rounded-lg border border-app p-3 text-sm text-muted">
                {language === 'ar' ? 'رقم التتبع:' : 'Tracking number:'} {selected.trackingNumber || (language === 'ar' ? 'غير متوفر بعد' : 'Not available yet')}
              </div>

              {!canUpdate && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  {language === 'ar'
                    ? 'لا يمكن تحديث الطلب قبل اعتماد الإدارة للطلب.'
                    : 'You can update fulfillment only after admin approval.'}
                </div>
              )}

              {['DELIVERED', 'ORDER_CLOSED'].includes(selected?.status || '') && !selected?.supplierPaymentConfirmedAt && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="font-semibold text-emerald-700 mb-3">{language === 'ar' ? 'تأكيد استلام المال' : 'Confirm Payment Received'}</h3>
                  <p className="text-sm text-emerald-700 mb-4">
                    {language === 'ar' 
                      ? 'التاجر أكد استلام البضاعة. هل استلمت المال نقدياً؟'
                      : 'Trader confirmed goods receipt. Did you receive cash payment?'}
                  </p>
                  <button
                    className="btn-primary !rounded-lg !px-6 !py-2 text-sm"
                    onClick={async () => {
                      if (!selected) return
                      const confirmed = confirm(language === 'ar' 
                        ? 'هل أنت متأكد من تأكيد استلام المال؟ سيتم إرسال طلب تحويل للإدارة.'
                        : 'Confirm you received cash payment? Payout request will be sent to admin.')
                      if (!confirmed) return

                      const response = await fetch(`/api/supplier/orders/${selected.id}/confirm-payment`, {
                        method: 'POST',
                        headers: { 'x-app-language': language }
                      })
                      const result = await response.json()
                      if (response.ok && result.success) {
                        toast.success(language === 'ar' ? '✅ تم تأكيد الدفع' : '✅ Payment confirmed')
                        await load()
                      } else {
                        toast.error(result.error || (language === 'ar' ? 'فشل التأكيد' : 'Confirmation failed'))
                      }
                    }}
                  >
                    {language === 'ar' ? 'نعم، استلمت المال' : 'Yes, received cash'}
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-app p-4 space-y-3">
                <h3 className="font-semibold text-app">{language === 'ar' ? 'تحديث حالة الطلب' : 'Update fulfillment'}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted">{language === 'ar' ? 'الحالة الجديدة' : 'New status'}</label>
                    <select
                      className="input-pro mt-2"
                      value={fulfillment.status}
                      onChange={(e) => setFulfillment((prev) => ({ ...prev, status: e.target.value }))}
                      disabled={!canUpdate}
                    >
                      <option value="PROCESSING">{language === 'ar' ? 'قيد التجهيز' : 'Processing'}</option>
                      <option value="SHIPPED">{language === 'ar' ? 'تم الشحن' : 'Shipped'}</option>
                      <option value="DELIVERED">{language === 'ar' ? 'تم التسليم' : 'Delivered'}</option>
                      <option value="CANCELLED">{language === 'ar' ? 'إلغاء الطلب' : 'Cancel order'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted">{language === 'ar' ? 'طريقة الشحن' : 'Shipping method'}</label>
                    <input
                      className="input-pro mt-2"
                      list="shipping-methods"
                      value={fulfillment.shippingMethod}
                      onChange={(e) => setFulfillment((prev) => ({ ...prev, shippingMethod: e.target.value }))}
                      disabled={!canUpdate}
                    />
                    <datalist id="shipping-methods">
                      {shippingMethods.map((method) => (
                        <option key={method.id} value={method.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs text-muted">{language === 'ar' ? 'رقم التتبع' : 'Tracking number'}</label>
                    <input
                      className="input-pro mt-2"
                      value={fulfillment.trackingNumber}
                      onChange={(e) => setFulfillment((prev) => ({ ...prev, trackingNumber: e.target.value }))}
                      disabled={!canUpdate}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted">{language === 'ar' ? 'مدة التسليم المتوقعة (بالأيام)' : 'Estimated delivery (days)'}</label>
                    <input
                      className="input-pro mt-2"
                      type="number"
                      min="1"
                      value={fulfillment.estimatedDeliveryDays}
                      onChange={(e) => setFulfillment((prev) => ({ ...prev, estimatedDeliveryDays: e.target.value }))}
                      disabled={!canUpdate}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted">{language === 'ar' ? 'ملاحظات إضافية' : 'Additional notes'}</label>
                  <textarea
                    className="input-pro mt-2 min-h-[90px]"
                    value={fulfillment.notes}
                    onChange={(e) => setFulfillment((prev) => ({ ...prev, notes: e.target.value }))}
                    disabled={!canUpdate}
                  />
                </div>
                <button
                  type="button"
                  className="btn-primary !rounded-lg !px-4 !py-2 text-sm disabled:opacity-60"
                  onClick={submitFulfillment}
                  disabled={!canUpdate || updating}
                >
                  {updating
                    ? language === 'ar'
                      ? 'جارٍ التحديث...' : 'Updating...'
                    : language === 'ar'
                      ? 'حفظ التحديث'
                      : 'Save update'}
                </button>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
