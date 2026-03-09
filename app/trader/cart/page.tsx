'use client'

import { useEffect, useMemo, useState } from 'react'
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
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [manualPayment, setManualPayment] = useState({
    senderPhone: '',
    transferTo: process.env.NEXT_PUBLIC_SYRIATEL_CASH_NUMBER || '0999999999',
    receiptUrl: '',
    notes: '',
  })

  const uploadReceipt = async (file: File) => {
    setUploadingReceipt(true)
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

      setManualPayment((prev) => ({ ...prev, receiptUrl: result.data.url }))
      toast.success(language === 'ar' ? 'تم رفع صورة الوصل' : 'Receipt uploaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل رفع الوصل' : 'Failed to upload receipt')
    } finally {
      setUploadingReceipt(false)
    }
  }

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
        body: JSON.stringify(manualPayment),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Checkout failed')
      toast.success(
        language === 'ar'
          ? 'تم إرسال الطلب وبيانات التحويل للأدمن. بانتظار الاعتماد اليدوي.'
          : 'Order and transfer proof submitted to admin. Waiting manual approval.',
      )
      await loadCart()
      setShowPaymentForm(false)
      setManualPayment((prev) => ({ ...prev, senderPhone: '', receiptUrl: '', notes: '' }))
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

        <p className="mt-3 text-xs text-muted">{language === 'ar' ? 'يتم دفع عمولة المنصة فقط عبر سيرياتيل كاش ثم تعتمد يدويًا من الأدمن.' : 'Only platform fee is paid manually (Syriatel Cash) and then verified by admin.'}</p>

        {!showPaymentForm ? (
          <button
            className="mt-4 btn-primary w-full !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60"
            disabled={!cart || !cart.items.length}
            onClick={() => setShowPaymentForm(true)}
          >
            {language === 'ar' ? 'دفع عمولة المنصة وإرسال الوصل' : 'Pay platform fee & submit receipt'}
          </button>
        ) : (
          <div className="mt-4 space-y-2 rounded-lg border border-app p-3">
            <p className="text-xs font-semibold text-app">
              {language === 'ar' ? 'املأ بيانات تحويل عمولة المنصة:' : 'Fill platform-fee transfer details:'}
            </p>
            <p className="text-xs text-muted">
              {language === 'ar'
                ? `حوّل إلى رقم سيرياتيل كاش: ${manualPayment.transferTo}`
                : `Transfer to Syriatel Cash number: ${manualPayment.transferTo}`}
            </p>
            <input
              className="input-pro"
              placeholder={language === 'ar' ? 'رقم المرسل من حسابك' : 'Sender phone number'}
              value={manualPayment.senderPhone}
              onChange={(e) => setManualPayment((prev) => ({ ...prev, senderPhone: e.target.value }))}
            />
            <p className="text-xs text-muted">
              {language === 'ar' ? 'اكتب رقم هاتفك الذي أرسلت منه التحويل.' : 'Enter your phone number used to send the transfer.'}
            </p>
            <input
              className="input-pro"
              placeholder={language === 'ar' ? 'رقم التحويل إليه' : 'Transfer-to number'}
              value={manualPayment.transferTo}
              onChange={(e) => setManualPayment((prev) => ({ ...prev, transferTo: e.target.value }))}
            />
            <p className="text-xs text-muted">
              {language === 'ar' ? 'هذا الرقم يستقبل الحوالة، تأكد أنه صحيح قبل الإرسال.' : 'This is the receiving number, verify it before submission.'}
            </p>
            <input
              type="file"
              accept="image/*"
              className="input-pro"
              disabled={uploadingReceipt}
              onChange={async (e) => {
                const input = e.currentTarget
                const file = e.target.files?.[0]
                if (!file) return
                await uploadReceipt(file)
                input.value = ''
              }}
            />
            {manualPayment.receiptUrl ? (
              <a
                href={manualPayment.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--app-primary)] underline"
              >
                {language === 'ar' ? 'تم رفع الوصل - عرض الصورة' : 'Receipt uploaded - View image'}
              </a>
            ) : (
              <p className="text-xs text-muted">
                {uploadingReceipt
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
              placeholder={language === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Additional notes (optional)'}
              value={manualPayment.notes}
              onChange={(e) => setManualPayment((prev) => ({ ...prev, notes: e.target.value }))}
            />
            <p className="text-xs text-muted">
              {language === 'ar' ? 'يمكنك كتابة اسم صاحب التحويل أو وقت الإرسال لتسريع الاعتماد.' : 'You can add sender name or transfer time to speed verification.'}
            </p>
            <div className="flex gap-2">
              <button
                className="btn-primary w-full !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60"
                disabled={checkingOut || uploadingReceipt || !manualPayment.receiptUrl || !cart || !cart.items.length}
                onClick={checkout}
              >
                    {checkingOut ? (language === 'ar' ? 'جارٍ إرسال الطلب...' : 'Submitting order...') : language === 'ar' ? 'إرسال عمولة المنصة للأدمن' : 'Submit platform fee proof to admin'}
              </button>
              <button
                className="btn-secondary !rounded-lg !px-3 !py-2 text-sm"
                onClick={() => setShowPaymentForm(false)}
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
