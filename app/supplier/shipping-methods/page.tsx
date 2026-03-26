'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { useUi } from '@/components/providers/UiProvider'

type ShippingMethod = {
  id: string
  name: string
  description: string | null
  fee: number
  estimatedDays: number | null
  isActive: boolean
  createdAt: string
}

type MethodDraft = {
  name: string
  description: string
  fee: string
  estimatedDays: string
  isActive: boolean
}

export default function SupplierShippingMethodsPage() {
  const { language } = useUi()
  const [methods, setMethods] = useState<ShippingMethod[]>([])
  const [drafts, setDrafts] = useState<Record<string, MethodDraft>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    fee: '0',
    estimatedDays: '',
    isActive: true,
  })

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/supplier/shipping-methods', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) {
        setMethods(result.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    const nextDrafts: Record<string, MethodDraft> = {}
    for (const method of methods) {
      nextDrafts[method.id] = {
        name: method.name,
        description: method.description ?? '',
        fee: method.fee.toString(),
        estimatedDays: method.estimatedDays?.toString() ?? '',
        isActive: method.isActive,
      }
    }
    setDrafts(nextDrafts)
  }, [methods])

  const hasMethods = methods.length > 0

  const createMethod = async () => {
    if (!form.name.trim()) {
      toast.error(language === 'ar' ? 'اسم طريقة الشحن مطلوب' : 'Shipping method name is required')
      return
    }

    const fee = Number(form.fee)
    if (Number.isNaN(fee) || fee < 0) {
      toast.error(language === 'ar' ? 'يرجى إدخال رسوم صحيحة' : 'Please enter a valid fee')
      return
    }

    const estimatedDays = form.estimatedDays ? Number(form.estimatedDays) : null
    if (estimatedDays !== null && Number.isNaN(estimatedDays)) {
      toast.error(language === 'ar' ? 'يرجى إدخال مدة صحيحة' : 'Please enter valid days')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/supplier/shipping-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          fee,
          estimatedDays,
          isActive: form.isActive,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || (language === 'ar' ? 'فشل إضافة الطريقة' : 'Failed to add method'))
      }
      setMethods(result.data ?? [])
      setForm({ name: '', description: '', fee: '0', estimatedDays: '', isActive: true })
      toast.success(language === 'ar' ? 'تم إضافة طريقة الشحن' : 'Shipping method added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل إضافة الطريقة' : 'Failed to add method')
    } finally {
      setSaving(false)
    }
  }

  const updateMethod = async (id: string) => {
    const draft = drafts[id]
    if (!draft) return

    if (!draft.name.trim()) {
      toast.error(language === 'ar' ? 'اسم طريقة الشحن مطلوب' : 'Shipping method name is required')
      return
    }

    const fee = Number(draft.fee)
    if (Number.isNaN(fee) || fee < 0) {
      toast.error(language === 'ar' ? 'رسوم غير صالحة' : 'Invalid fee')
      return
    }

    const estimatedDays = draft.estimatedDays ? Number(draft.estimatedDays) : null
    if (estimatedDays !== null && Number.isNaN(estimatedDays)) {
      toast.error(language === 'ar' ? 'مدة غير صالحة' : 'Invalid days')
      return
    }

    setBusyId(id)
    try {
      const response = await fetch(`/api/supplier/shipping-methods/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          fee,
          estimatedDays,
          isActive: draft.isActive,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || (language === 'ar' ? 'فشل تحديث الطريقة' : 'Failed to update method'))
      }
      setMethods(result.data ?? [])
      toast.success(language === 'ar' ? 'تم تحديث الطريقة' : 'Method updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحديث الطريقة' : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  const removeMethod = async (id: string) => {
    const confirmed = window.confirm(language === 'ar' ? 'هل تريد حذف طريقة الشحن؟' : 'Delete this shipping method?')
    if (!confirmed) return

    setBusyId(id)
    try {
      const response = await fetch(`/api/supplier/shipping-methods/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || (language === 'ar' ? 'فشل حذف الطريقة' : 'Failed to delete method'))
      }
      setMethods(result.data ?? [])
      toast.success(language === 'ar' ? 'تم حذف الطريقة' : 'Method deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل حذف الطريقة' : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  const summary = useMemo(() => {
    const activeCount = methods.filter((method) => method.isActive).length
    return { total: methods.length, active: activeCount }
  }, [methods])

  return (
    <div className="space-y-4">
      <SupplierPageHeader
        titleAr="طرق الشحن"
        titleEn="Shipping methods"
        subtitleAr="جهّز خيارات الشحن المفضلة لديك وحدد الرسوم ومدة التوصيل."
        subtitleEn="Configure your shipping options with fees and delivery times."
        actions={
          <button className="btn-secondary !rounded-lg !px-3 !py-2 text-sm" onClick={load}>
            {language === 'ar' ? 'تحديث القائمة' : 'Refresh list'}
          </button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <article className="card-pro rounded-xl p-4">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'إضافة طريقة شحن' : 'Add shipping method'}</h2>
          <div className="mt-4 grid gap-3">
            <input
              className="input-pro"
              placeholder={language === 'ar' ? 'اسم الطريقة (مثال: توصيل سريع)' : 'Method name (e.g. Express delivery)'}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="input-pro"
              placeholder={language === 'ar' ? 'رسوم الشحن' : 'Shipping fee'}
              type="number"
              min="0"
              value={form.fee}
              onChange={(e) => setForm((prev) => ({ ...prev, fee: e.target.value }))}
            />
            <input
              className="input-pro"
              placeholder={language === 'ar' ? 'مدة التوصيل المتوقعة (أيام)' : 'Estimated delivery days'}
              type="number"
              min="1"
              value={form.estimatedDays}
              onChange={(e) => setForm((prev) => ({ ...prev, estimatedDays: e.target.value }))}
            />
            <textarea
              className="input-pro min-h-[90px]"
              placeholder={language === 'ar' ? 'وصف مختصر (اختياري)' : 'Short description (optional)'}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              {language === 'ar' ? 'تفعيل الطريقة فوراً' : 'Activate immediately'}
            </label>
            <button
              className="btn-primary !rounded-lg !px-4 !py-2 text-sm disabled:opacity-60"
              type="button"
              onClick={createMethod}
              disabled={saving}
            >
              {saving
                ? language === 'ar'
                  ? 'جارٍ الإضافة...' : 'Saving...'
                : language === 'ar'
                  ? 'إضافة الطريقة'
                  : 'Add method'}
            </button>
          </div>
        </article>

        <article className="card-pro rounded-xl p-4">
          <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'ملخص الطرق' : 'Summary'}</h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-lg border border-app p-3">
              <p className="text-xs text-muted">{language === 'ar' ? 'إجمالي الطرق' : 'Total methods'}</p>
              <p className="mt-1 text-xl font-semibold text-app">{summary.total}</p>
            </div>
            <div className="rounded-lg border border-app p-3">
              <p className="text-xs text-muted">{language === 'ar' ? 'الطرق النشطة' : 'Active methods'}</p>
              <p className="mt-1 text-xl font-semibold text-app">{summary.active}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="card-pro rounded-xl p-4">
        <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'طرق الشحن الحالية' : 'Current shipping methods'}</h2>
        {loading ? (
          <p className="mt-3 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
        ) : !hasMethods ? (
          <p className="mt-3 text-sm text-muted">{language === 'ar' ? 'لا توجد طرق شحن بعد.' : 'No shipping methods yet.'}</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {methods.map((method) => {
              const draft = drafts[method.id]
              if (!draft) return null
              return (
                <div key={method.id} className="rounded-xl border border-app p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-app">{method.name}</h3>
                    <span className={`text-xs ${method.isActive ? 'text-emerald-600' : 'text-muted'}`}>
                      {method.isActive ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    <input
                      className="input-pro"
                      value={draft.name}
                      onChange={(e) => setDrafts((prev) => ({
                        ...prev,
                        [method.id]: { ...prev[method.id], name: e.target.value },
                      }))}
                    />
                    <input
                      className="input-pro"
                      type="number"
                      min="0"
                      value={draft.fee}
                      onChange={(e) => setDrafts((prev) => ({
                        ...prev,
                        [method.id]: { ...prev[method.id], fee: e.target.value },
                      }))}
                    />
                    <input
                      className="input-pro"
                      type="number"
                      min="1"
                      value={draft.estimatedDays}
                      onChange={(e) => setDrafts((prev) => ({
                        ...prev,
                        [method.id]: { ...prev[method.id], estimatedDays: e.target.value },
                      }))}
                    />
                    <textarea
                      className="input-pro min-h-[80px]"
                      value={draft.description}
                      onChange={(e) => setDrafts((prev) => ({
                        ...prev,
                        [method.id]: { ...prev[method.id], description: e.target.value },
                      }))}
                    />
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(e) => setDrafts((prev) => ({
                          ...prev,
                          [method.id]: { ...prev[method.id], isActive: e.target.checked },
                        }))}
                      />
                      {language === 'ar' ? 'تفعيل الطريقة' : 'Activate method'}
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="btn-primary !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60"
                      onClick={() => updateMethod(method.id)}
                      disabled={busyId === method.id}
                    >
                      {busyId === method.id
                        ? language === 'ar'
                          ? 'جارٍ الحفظ...' : 'Saving...'
                        : language === 'ar'
                          ? 'حفظ'
                          : 'Save'}
                    </button>
                    <button
                      className="btn-secondary !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60"
                      onClick={() => removeMethod(method.id)}
                      disabled={busyId === method.id}
                    >
                      {language === 'ar' ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
