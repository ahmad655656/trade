'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import { orderStatusLabel, paymentStatusLabel } from '@/lib/order-labels'

type SupplierOrder = {
  id: string
  orderNumber: string
  totalAmount: number
  status: string
  paymentStatus: string
  shippingStatus: string
  trackingNumber: string | null
  trader: { user: { name: string; email: string } }
  items: Array<{ product: { nameAr: string | null; nameEn: string | null }; quantity: number }>
}

export default function SupplierOrdersPage() {
  const { language } = useUi()
  const [orders, setOrders] = useState<SupplierOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shippingMethod, setShippingMethod] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [estimatedDays, setEstimatedDays] = useState('3')
  const [status, setStatus] = useState<'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'>('PROCESSING')

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/orders', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) {
        setOrders(result.data ?? [])
        if (result.data?.length) {
          const firstId = result.data[0].id as string
          setSelectedId((prev) => prev ?? firstId)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const selectedOrder = useMemo(() => orders.find((o) => o.id === selectedId) || null, [orders, selectedId])

  const updateFulfillment = async () => {
    if (!selectedOrder) return

    try {
      const response = await fetch(`/api/supplier/orders/${selectedOrder.id}/fulfillment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify({
          status,
          shippingMethod: shippingMethod || undefined,
          trackingNumber: trackingNumber || undefined,
          estimatedDeliveryDays: Number(estimatedDays),
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to update order')
      toast.success(language === 'ar' ? 'تم تحديث الطلب وإرسال إشعار للأطراف' : 'Order updated and notifications sent')
      await loadOrders()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحديث الطلب' : 'Failed to update order')
    }
  }

  return (
    <div className="space-y-6">
      <SupplierPageHeader
        titleAr="الطلبات الواردة بعد اعتماد الدفع"
        titleEn="Approved incoming orders"
        subtitleAr="بعد قبول الأدمن للدفع، حدّث الشحن والحالة وتفاصيل التسليم"
        subtitleEn="After admin payment approval, update shipping, status, and delivery details"
      />

      <section className="card-pro rounded-xl p-4">
        {loading ? (
          <p className="text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد طلبات وصلت للمورد بعد.' : 'No orders reached supplier yet.'}</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-app text-muted">
                    <th className="p-2 text-start">{language === 'ar' ? 'الطلب' : 'Order'}</th>
                    <th className="p-2 text-start">{language === 'ar' ? 'التاجر' : 'Trader'}</th>
                    <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="p-2 text-start">{language === 'ar' ? 'الدفع' : 'Payment'}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className={`cursor-pointer border-b border-app/50 ${selectedId === order.id ? 'bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)]' : ''}`} onClick={() => setSelectedId(order.id)}>
                      <td className="p-2 font-medium text-app">{order.orderNumber}</td>
                      <td className="p-2 text-muted">{order.trader.user.name}</td>
                      <td className="p-2 text-muted">{orderStatusLabel(order.status, language)}</td>
                      <td className="p-2 text-muted">{paymentStatusLabel(order.paymentStatus, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedOrder && (
              <div className="rounded-lg border border-app p-3 space-y-3">
                <p className="font-semibold text-app">{selectedOrder.orderNumber}</p>
                <p className="text-sm text-muted">{language === 'ar' ? 'التاجر:' : 'Trader:'} {selectedOrder.trader.user.name}</p>
                <p className="text-sm text-muted">{language === 'ar' ? 'الإجمالي:' : 'Total:'} {formatSypAmount(selectedOrder.totalAmount, language)}</p>

                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <p key={idx} className="text-sm text-muted">
                      {language === 'ar' ? item.product.nameAr || item.product.nameEn : item.product.nameEn || item.product.nameAr} x {item.quantity}
                    </p>
                  ))}
                </div>

                <select className="input-pro" value={status} onChange={(e) => setStatus(e.target.value as 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED')}>
                  <option value="PROCESSING">{language === 'ar' ? 'قيد التجهيز' : 'Processing'}</option>
                  <option value="SHIPPED">{language === 'ar' ? 'تم الشحن' : 'Shipped'}</option>
                  <option value="DELIVERED">{language === 'ar' ? 'تم التسليم' : 'Delivered'}</option>
                  <option value="CANCELLED">{language === 'ar' ? 'ملغي' : 'Cancelled'}</option>
                </select>
                <p className="text-xs text-muted">
                  {language === 'ar' ? 'حدد الحالة الحالية للطلب ليتم إشعار التاجر والأدمن فورًا.' : 'Set current order status to notify trader and admin instantly.'}
                </p>
                <input className="input-pro" placeholder={language === 'ar' ? 'طريقة الشحن' : 'Shipping method'} value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} />
                <p className="text-xs text-muted">
                  {language === 'ar' ? 'مثال: شركة الشحن أو طريقة التسليم.' : 'Example: courier company or delivery method.'}
                </p>
                <input className="input-pro" placeholder={language === 'ar' ? 'رقم التتبع' : 'Tracking number'} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                <p className="text-xs text-muted">
                  {language === 'ar' ? 'رقم تتبع الشحنة كما هو من شركة الشحن.' : 'Shipment tracking number from courier provider.'}
                </p>
                <input className="input-pro" type="number" min={1} placeholder={language === 'ar' ? 'مدة الشحن بالأيام' : 'Estimated days'} value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} />
                <p className="text-xs text-muted">
                  {language === 'ar' ? 'عدد الأيام المتوقعة حتى وصول الطلب للتاجر.' : 'Expected days until order reaches the trader.'}
                </p>

                <button className="btn-primary !rounded-lg !px-3 !py-2 text-sm" onClick={updateFulfillment}>
                  {language === 'ar' ? 'تحديث حالة الطلب' : 'Update fulfillment'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
