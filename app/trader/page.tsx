'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'
import { orderStatusLabel } from '@/lib/order-labels'

type Order = {
  id: string
  orderNumber: string
  totalAmount: number
  status: string
  paymentStatus: string
  createdAt: string
  items: Array<{
    supplier: { user: { name: string } }
    product: { nameAr: string | null; nameEn: string | null }
  }>
}

type Cart = {
  totalItems: number
}

type Product = {
  id: string
  nameAr: string | null
  nameEn: string | null
  price: number
  compareAtPrice: number | null
  supplier: { user: { name: string } }
}

type Notification = {
  id: string
  title: string
  message: string | null
  createdAt: string
  read: boolean
}

export default function TraderDashboardPage() {
  const { language } = useUi()
  const [orders, setOrders] = useState<Order[]>([])
  const [cart, setCart] = useState<Cart | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, cartRes, productsRes, notifRes] = await Promise.all([
          fetch('/api/orders', { cache: 'no-store' }),
          fetch('/api/cart', { cache: 'no-store' }),
          fetch('/api/products?limit=6&sort=best_selling', { cache: 'no-store' }),
          fetch('/api/notifications', { cache: 'no-store' }),
        ])

        const [ordersJson, cartJson, productsJson, notifJson] = await Promise.all([
          ordersRes.json(),
          cartRes.json(),
          productsRes.json(),
          notifRes.json(),
        ])

        if (ordersRes.ok && ordersJson.success) setOrders(ordersJson.data ?? [])
        if (cartRes.ok && cartJson.success) setCart(cartJson.data ?? null)
        if (productsRes.ok && productsJson.success) setProducts(productsJson.data ?? [])
        if (notifRes.ok && notifJson.success) setNotifications(notifJson.data ?? [])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const kpis = useMemo(() => {
    const month = new Date().getMonth()
    const thisMonthOrders = orders.filter((o) => new Date(o.createdAt).getMonth() === month)
    const totalPurchases = thisMonthOrders.reduce((s, o) => s + o.totalAmount, 0)
    const activeOrders = orders.filter((o) => ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status)).length
    const completedOrders = orders.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status)).length
    const totalSavings = products.reduce((s, p) => s + Math.max((p.compareAtPrice ?? p.price) - p.price, 0), 0)

    return [
      { labelAr: 'إجمالي المشتريات (الشهر)', labelEn: 'Monthly purchases', value: formatSypAmount(totalPurchases, language) },
      { labelAr: 'الطلبات النشطة', labelEn: 'Active orders', value: activeOrders },
      { labelAr: 'الطلبات المكتملة', labelEn: 'Completed orders', value: completedOrders },
      { labelAr: 'منتجات السلة', labelEn: 'Cart items', value: cart?.totalItems ?? 0 },
      { labelAr: 'إجمالي التوفير', labelEn: 'Total savings', value: formatSypAmount(totalSavings, language) },
    ]
  }, [orders, cart, products, language])

  const lastOrders = orders.slice(0, 5)

  const supplierStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    for (const order of orders) {
      for (const item of order.items ?? []) {
        const name = item.supplier?.user?.name ?? 'Unknown'
        const prev = map.get(name)
        if (prev) prev.count += 1
        else map.set(name, { name, count: 1 })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [orders])

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
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <article key={kpi.labelEn} className="card-pro rounded-xl p-4">
            <p className="text-sm text-muted">{language === 'ar' ? kpi.labelAr : kpi.labelEn}</p>
            <p className="mt-2 text-2xl font-bold text-app">{kpi.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="card-pro rounded-xl p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'آخر الطلبات' : 'Latest orders'}</h2>
            <Link href="/trader/orders" className="btn-secondary !rounded-lg !px-3 !py-1.5 text-xs">
              {language === 'ar' ? 'عرض الكل' : 'View all'}
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-app text-muted">
                    <th className="p-2 text-start">{language === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                    <th className="p-2 text-start">{language === 'ar' ? 'عدد المنتجات' : 'Items'}</th>
                    <th className="p-2 text-start">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                    <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="p-2 text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody>
                  {lastOrders.map((order) => (
                    <tr key={order.id} className="border-b border-app/50">
                      <td className="p-2 font-medium text-app">{order.orderNumber}</td>
                      <td className="p-2 text-muted">{order.items.length}</td>
                      <td className="p-2 text-muted">{formatSypAmount(order.totalAmount, language)}</td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <p className="text-xs text-muted">{orderStatusLabel(order.status, language)}</p>
                          <div className="h-1.5 rounded bg-[var(--app-border)]">
                            <div className="h-1.5 rounded bg-[var(--app-primary)]" style={{ width: `${progressByStatus[order.status] ?? 15}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-muted">{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="card-pro rounded-xl p-4">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'الإشعارات السريعة' : 'Quick notifications'}</h2>
          <div className="mt-3 space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="rounded-lg border border-app p-2">
                <p className="text-sm font-medium text-app">{n.title}</p>
                {n.message ? <p className="text-xs text-muted">{n.message}</p> : null}
              </div>
            ))}
            {!notifications.length && <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications yet'}</p>}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="card-pro rounded-xl p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'منتجات مقترحة' : 'Suggested products'}</h2>
            <Link href="/trader/products" className="btn-secondary !rounded-lg !px-3 !py-1.5 text-xs">
              {language === 'ar' ? 'تصفح المنتجات' : 'Browse products'}
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {products.slice(0, 6).map((product) => (
              <article key={product.id} className="rounded-lg border border-app p-3">
                <p className="font-medium text-app">{language === 'ar' ? product.nameAr || product.nameEn : product.nameEn || product.nameAr}</p>
                <p className="text-sm text-muted">{product.supplier.user.name}</p>
                <p className="mt-2 text-sm text-app">{formatSypAmount(product.price, language)}</p>
                <Link href="/trader/products" className="mt-2 inline-flex btn-secondary !rounded-md !px-2 !py-1 text-xs">
                  {language === 'ar' ? 'أضف للسلة' : 'Add to cart'}
                </Link>
              </article>
            ))}
          </div>
        </article>

        <article className="card-pro rounded-xl p-4">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'الموردون المفضلون' : 'Preferred suppliers'}</h2>
          <div className="mt-3 space-y-2">
            {supplierStats.map((supplier) => (
              <div key={supplier.name} className="rounded-lg border border-app p-2">
                <p className="font-medium text-app">{supplier.name}</p>
                <p className="text-xs text-muted">{language === 'ar' ? `عدد الطلبات: ${supplier.count}` : `Orders: ${supplier.count}`}</p>
              </div>
            ))}
            {!supplierStats.length && <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد بيانات بعد' : 'No supplier data yet'}</p>}
          </div>
        </article>
      </section>
    </div>
  )
}
