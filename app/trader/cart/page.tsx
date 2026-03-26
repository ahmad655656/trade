'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type CartItem = {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    nameAr: string | null
    nameEn: string | null
    quantity: number
    supplier: { user: { name: string } }
  }
}

type Cart = {
  id: string
  totalItems: number
  totalAmount: number
  items: CartItem[]
}

export default function TraderCartPage() {
  const { language } = useUi()
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)

  const loadCart = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cart', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) setCart(result.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCart()
  }, [])

  const summary = useMemo(() => {
    const subtotal = cart?.totalAmount ?? 0
    const shipping = 0
    const tax = 0
    const discount = 0
    const total = subtotal + shipping + tax - discount
    return { subtotal, shipping, tax, discount, total }
  }, [cart])

  const updateQty = async (itemId: string, quantity: number) => {
    setUpdatingId(itemId)
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to update quantity')
      await loadCart()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحديث الكمية' : 'Failed to update')
    } finally {
      setUpdatingId(null)
    }
  }

  const removeItem = async (itemId: string) => {
    setUpdatingId(itemId)
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to remove item')
      await loadCart()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل الحذف' : 'Failed to remove')
    } finally {
      setUpdatingId(null)
    }
  }

  const clearCart = async () => {
    if (!window.confirm(language === 'ar' ? 'تفريغ السلة بالكامل؟' : 'Clear all cart items?')) return
    try {
      const response = await fetch('/api/cart', { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to clear cart')
      await loadCart()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تفريغ السلة' : 'Failed to clear cart')
    }
  }

  const checkout = async () => {
    setCheckingOut(true)
    try {
      const response = await fetch('/api/trader/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify({}),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Checkout failed')
      toast.success(
        language === 'ar'
          ? 'تم إنشاء الطلب. اذهب إلى صفحة الطلبات لإرفاق صورة الوصل وإرسال بيانات التحويل.'
          : 'Order created. Go to Orders page to attach receipt and submit transfer details.',
      )
      await loadCart()
      router.push('/trader/orders')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل إتمام الطلب' : 'Checkout failed')
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <section className="card-pro rounded-xl p-4">
        <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'سلة التسوق' : 'Shopping cart'}</h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
        ) : !cart || cart.items.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{language === 'ar' ? 'السلة فارغة' : 'Cart is empty'}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {cart.items.map((item) => (
              <article key={item.id} className="rounded-lg border border-app p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-app">{language === 'ar' ? item.product.nameAr || item.product.nameEn : item.product.nameEn || item.product.nameAr}</p>
                    <p className="text-xs text-muted">{item.product.supplier.user.name}</p>
                  </div>
                  <p className="text-sm text-muted">{formatSypAmount(item.price, language)}</p>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button className="btn-secondary !rounded-md !px-2 !py-1 text-xs" disabled={updatingId === item.id || item.quantity <= 1} onClick={() => updateQty(item.id, item.quantity - 1)}>-</button>
                  <span className="text-sm text-app">{item.quantity}</span>
                  <button className="btn-secondary !rounded-md !px-2 !py-1 text-xs" disabled={updatingId === item.id} onClick={() => updateQty(item.id, item.quantity + 1)}>+</button>
                  <button className="btn-secondary !rounded-md !px-2 !py-1 text-xs ms-auto" disabled={updatingId === item.id} onClick={() => removeItem(item.id)}>
                    {language === 'ar' ? 'حذف' : 'Remove'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button className="btn-secondary !rounded-lg !px-3 !py-2 text-sm" onClick={clearCart}>{language === 'ar' ? 'تفريغ السلة' : 'Clear cart'}</button>
        </div>
      </section>

      <aside className="card-pro rounded-xl p-4 h-fit">
        <h3 className="text-lg font-semibold text-app">{language === 'ar' ? 'ملخص الطلب' : 'Order summary'}</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted">{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span><span className="text-app">{formatSypAmount(summary.subtotal, language)}</span></div>
          <div className="flex justify-between"><span className="text-muted">{language === 'ar' ? 'الشحن' : 'Shipping'}</span><span className="text-app">{formatSypAmount(summary.shipping, language)}</span></div>
          <div className="flex justify-between"><span className="text-muted">{language === 'ar' ? 'الضريبة' : 'Tax'}</span><span className="text-app">{formatSypAmount(summary.tax, language)}</span></div>
          <div className="flex justify-between"><span className="text-muted">{language === 'ar' ? 'الخصم' : 'Discount'}</span><span className="text-app">{formatSypAmount(summary.discount, language)}</span></div>
          <div className="mt-2 border-t border-app pt-2 flex justify-between font-semibold"><span className="text-app">{language === 'ar' ? 'الإجمالي' : 'Total'}</span><span className="text-app">{formatSypAmount(summary.total, language)}</span></div>
        </div>

        <p className="mt-3 text-xs text-muted">
          {language === 'ar'
            ? 'بعد وضع الطلب، يجب رفع وصل الدفع وإرسال تفاصيل التحويل من صفحة الطلبات.'
            : 'After placing the order, you must upload the receipt and submit transfer details from the Orders page.'}
        </p>

        <button
          className="mt-4 btn-primary w-full !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60"
          disabled={!cart || !cart.items.length || checkingOut}
          onClick={checkout}
        >
          {checkingOut
            ? language === 'ar'
              ? 'جارٍ إرسال الطلب...'
              : 'Submitting order...'
            : language === 'ar'
              ? 'طلب الآن' 
              : 'Place order'}
        </button>
      </aside>
    </div>
  )
}
