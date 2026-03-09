'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'

type SupplierItem = {
  id: string
  companyName: string
  verified: boolean
  user: { name: string; email: string; phone: string | null }
  verification: {
    id: string
    status: string
    rejectionReason: string | null
    documents: Array<{ id: string; type: string; fileUrl: string }>
  } | null
}

export default function AdminSuppliersPage() {
  const { language } = useUi()
  const [items, setItems] = useState<SupplierItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/suppliers', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed')
      setItems(result.data ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحميل الموردين' : 'Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }, [language])

  useEffect(() => {
    void load()
  }, [load])

  const review = async (supplierId: string, approved: boolean) => {
    setProcessingId(supplierId)
    try {
      const rejectionReason =
        !approved && language === 'ar'
          ? window.prompt('سبب الرفض (اختياري)') ?? ''
          : !approved
            ? window.prompt('Rejection reason (optional)') ?? ''
            : ''
      const response = await fetch(`/api/admin/suppliers/${supplierId}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify({
          status: approved ? 'APPROVED' : 'REJECTED',
          rejectionReason,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to review')
      toast.success(approved ? (language === 'ar' ? 'تم اعتماد المورد' : 'Supplier approved') : language === 'ar' ? 'تم رفض المورد' : 'Supplier rejected')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشلت العملية' : 'Operation failed')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="card-pro rounded-xl p-6">
        <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'توثيق الموردين (KYC)' : 'Supplier verification (KYC)'}</h2>
        <p className="mt-2 text-muted">{language === 'ar' ? 'مراجعة وثائق الهوية والسجل التجاري وإعطاء شارة المورد الموثق.' : 'Review identity/business docs and assign verified supplier badge.'}</p>
      </div>

      <div className="card-pro rounded-xl p-4">
        {loading ? (
          <p className="text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="space-y-3">
            {items.map((supplier) => (
              <article key={supplier.id} className="rounded-lg border border-app p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-app">{supplier.companyName}</p>
                    <p className="text-xs text-muted">{supplier.user.name} - {supplier.user.email}</p>
                    <p className="text-xs text-muted">{supplier.user.phone || '-'}</p>
                  </div>
                  <div className="text-xs text-muted">
                    {language === 'ar' ? 'الحالة:' : 'Status:'} {supplier.verification?.status || 'PENDING'}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {(supplier.verification?.documents ?? []).map((doc) => (
                    <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="rounded-md border border-app px-2 py-1 text-xs text-[var(--app-primary)] underline">
                      {doc.type}
                    </a>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="btn-primary !rounded-md !px-3 !py-1.5 text-xs disabled:opacity-60"
                    onClick={() => review(supplier.id, true)}
                    disabled={processingId === supplier.id}
                  >
                    {language === 'ar' ? 'اعتماد' : 'Approve'}
                  </button>
                  <button
                    className="btn-secondary !rounded-md !px-3 !py-1.5 text-xs disabled:opacity-60"
                    onClick={() => review(supplier.id, false)}
                    disabled={processingId === supplier.id}
                  >
                    {language === 'ar' ? 'رفض' : 'Reject'}
                  </button>
                </div>
              </article>
            ))}
            {!items.length && <p className="text-sm text-muted">{language === 'ar' ? 'لا يوجد موردون' : 'No suppliers'}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
