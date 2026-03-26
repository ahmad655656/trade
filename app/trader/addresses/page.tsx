'use client'

import { AddressType } from '@/lib/prisma-enums'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'

type AddressItem = {
  id: string
  type: AddressType
  title: string
  recipient: string
  phone: string
  country: string
  city: string
  state: string | null
  address: string
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

type AddressForm = {
  type: AddressType
  title: string
  recipient: string
  phone: string
  country: string
  city: string
  state: string
  address: string
  postalCode: string
  latitude: string
  longitude: string
  isDefault: boolean
}

const emptyForm: AddressForm = {
  type: 'HOME',
  title: '',
  recipient: '',
  phone: '',
  country: 'Syria',
  city: '',
  state: '',
  address: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  isDefault: false,
}

export default function TraderAddressesPage() {
  const { language } = useUi()
  const [items, setItems] = useState<AddressItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AddressForm>(emptyForm)

  const typeLabel = useMemo(
    () => ({
      HOME: language === 'ar' ? 'منزل' : 'Home',
      WORK: language === 'ar' ? 'عمل' : 'Work',
      OTHER: language === 'ar' ? 'أخرى' : 'Other',
    }),
    [language],
  )

  const loadAddresses = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/trader/addresses', { cache: 'no-store', headers: { 'x-app-language': language } })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to load addresses')
      setItems(result.data ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحميل العناوين' : 'Failed to load addresses')
    } finally {
      setLoading(false)
    }
  }, [language])

  useEffect(() => {
    void loadAddresses()
  }, [loadAddresses])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        state: form.state || undefined,
        postalCode: form.postalCode || undefined,
        latitude: form.latitude.trim() ? Number(form.latitude) : undefined,
        longitude: form.longitude.trim() ? Number(form.longitude) : undefined,
      }

      const endpoint = editingId ? `/api/trader/addresses/${editingId}` : '/api/trader/addresses'
      const method = editingId ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to save address')

      toast.success(editingId ? (language === 'ar' ? 'تم تحديث العنوان' : 'Address updated') : language === 'ar' ? 'تمت إضافة العنوان' : 'Address added')
      resetForm()
      await loadAddresses()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل الحفظ' : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (item: AddressItem) => {
    setEditingId(item.id)
    setForm({
      type: item.type,
      title: item.title,
      recipient: item.recipient,
      phone: item.phone,
      country: item.country,
      city: item.city,
      state: item.state || '',
      address: item.address,
      postalCode: item.postalCode || '',
      latitude: item.latitude?.toString() ?? '',
      longitude: item.longitude?.toString() ?? '',
      isDefault: item.isDefault,
    })
  }

  const deleteAddress = async (id: string) => {
    const confirmed = window.confirm(language === 'ar' ? 'تأكيد حذف العنوان؟' : 'Confirm delete address?')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/trader/addresses/${id}`, {
        method: 'DELETE',
        headers: { 'x-app-language': language },
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to delete address')
      toast.success(language === 'ar' ? 'تم حذف العنوان' : 'Address deleted')
      if (editingId === id) resetForm()
      await loadAddresses()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل الحذف' : 'Delete failed')
    }
  }

  const setAsDefault = async (item: AddressItem) => {
    if (item.isDefault) return
    try {
      const response = await fetch(`/api/trader/addresses/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify({ ...item, isDefault: true }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to set default')
      toast.success(language === 'ar' ? 'تم تعيين العنوان الافتراضي' : 'Default address updated')
      await loadAddresses()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تعيين الافتراضي' : 'Failed to set default')
    }
  }

  return (
    <section className="space-y-4">
      <div className="card-pro rounded-xl p-6">
        <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'عناويني' : 'My addresses'}</h2>
        <p className="mt-2 text-muted">
          {language === 'ar'
            ? 'أضف عناوين الشحن وحدد العنوان الافتراضي لإتمام الطلبات بسرعة.'
            : 'Manage shipping addresses and set a default one for faster checkout.'}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <article className="card-pro rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-app">{language === 'ar' ? 'العناوين المحفوظة' : 'Saved addresses'}</h3>
          {loading ? (
            <p className="text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
          ) : !items.length ? (
            <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد عناوين بعد' : 'No addresses yet'}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-app p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-app">{item.title}</p>
                    {item.isDefault ? <span className="rounded-full bg-[color-mix(in_oklab,var(--app-primary)_16%,transparent)] px-2 py-0.5 text-[11px] text-app">{language === 'ar' ? 'افتراضي' : 'Default'}</span> : null}
                  </div>
                  <p className="text-xs text-muted">{typeLabel[item.type]}</p>
                  <p className="mt-2 text-sm text-app">{item.recipient}</p>
                  <p className="text-xs text-muted">{item.phone}</p>
                  <p className="mt-1 text-xs text-muted">{item.country} - {item.city}{item.state ? ` - ${item.state}` : ''}</p>
                  <p className="text-xs text-muted">{item.address}</p>
                  {item.postalCode ? <p className="text-xs text-muted">{language === 'ar' ? `الرمز البريدي: ${item.postalCode}` : `Postal code: ${item.postalCode}`}</p> : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-secondary !rounded-md !px-2 !py-1 text-xs" onClick={() => startEdit(item)}>{language === 'ar' ? 'تعديل' : 'Edit'}</button>
                    <button className="btn-secondary !rounded-md !px-2 !py-1 text-xs" onClick={() => deleteAddress(item.id)}>{language === 'ar' ? 'حذف' : 'Delete'}</button>
                    {!item.isDefault ? (
                      <button className="btn-primary !rounded-md !px-2 !py-1 text-xs" onClick={() => setAsDefault(item)}>{language === 'ar' ? 'تعيين افتراضي' : 'Set default'}</button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="card-pro rounded-xl p-4">
          <h3 className="font-semibold text-app">{editingId ? (language === 'ar' ? 'تعديل العنوان' : 'Edit address') : language === 'ar' ? 'إضافة عنوان جديد' : 'Add new address'}</h3>

          <form className="mt-3 space-y-2" onSubmit={onSubmit}>
            <select className="input-pro" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as AddressType }))}>
              <option value="HOME">{typeLabel.HOME}</option>
              <option value="WORK">{typeLabel.WORK}</option>
              <option value="OTHER">{typeLabel.OTHER}</option>
            </select>
            <input className="input-pro" required placeholder={language === 'ar' ? 'اسم الموقع التجاري (المستودع الرئيسي، المكتب...)' : 'Business Location Name (Main Warehouse, Office...)'} value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
            <input className="input-pro" required placeholder={language === 'ar' ? 'اسم المستلم التجاري' : 'Business Recipient Name'} value={form.recipient} onChange={(e) => setForm((prev) => ({ ...prev, recipient: e.target.value }))} />
            <input className="input-pro" required placeholder={language === 'ar' ? 'رقم الهاتف' : 'Phone number'} value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <input className="input-pro" required placeholder={language === 'ar' ? 'الدولة' : 'Country'} value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} />
            <input className="input-pro" required placeholder={language === 'ar' ? 'المدينة' : 'City'} value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} />
            <input className="input-pro" placeholder={language === 'ar' ? 'المنطقة/الحي (اختياري)' : 'State/Area (optional)'} value={form.state} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} />
            <textarea className="input-pro min-h-20" required placeholder={language === 'ar' ? 'العنوان التجاري الكامل (الشارع، المبنى، الطابق، المستودع...)' : 'Full Business Address (street, building, floor, warehouse...)'} value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
            <input className="input-pro" placeholder={language === 'ar' ? 'الرمز البريدي (اختياري)' : 'Postal code (optional)'} value={form.postalCode} onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input-pro" type="number" step="any" placeholder={language === 'ar' ? 'خط العرض (اختياري)' : 'Latitude (optional)'} value={form.latitude} onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))} />
              <input className="input-pro" type="number" step="any" placeholder={language === 'ar' ? 'خط الطول (اختياري)' : 'Longitude (optional)'} value={form.longitude} onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))} />
            </div>
              <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))} />
              {language === 'ar' ? 'تعيين كعنوان شحن افتراضي' : 'Set as Default Shipping Address'}
            </label>

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="submit" disabled={saving} className="btn-primary !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60">
                {saving ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : editingId ? (language === 'ar' ? 'حفظ التعديلات' : 'Save changes') : language === 'ar' ? 'إضافة العنوان' : 'Add address'}
              </button>
              {editingId ? (
                <button type="button" className="btn-secondary !rounded-lg !px-3 !py-2 text-sm" onClick={resetForm}>
                  {language === 'ar' ? 'إلغاء التعديل' : 'Cancel edit'}
                </button>
              ) : null}
            </div>
          </form>
        </article>
      </div>
    </section>
  )
}



