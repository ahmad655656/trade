'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'

type TraderRow = {
  id: string
  companyName: string
  taxNumber: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    status: string
    createdAt: string
  }
  verification: {
    status: string
  } | null
}

export default function AdminUsersPage() {
  const { language } = useUi()
  const [items, setItems] = useState<TraderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/traders?status=PENDING', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load traders')
      }
      setItems(result.data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل التحميل' : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const decide = async (traderId: string, status: 'APPROVED' | 'REJECTED') => {
    let rejectionReason: string | undefined
    if (status === 'REJECTED') {
      const reason = window.prompt(language === 'ar' ? 'سبب الرفض (اختياري)' : 'Rejection reason (optional)')
      rejectionReason = reason || undefined
    }

    setActionId(traderId)
    try {
      const response = await fetch(`/api/admin/traders/${traderId}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update verification')
      }

      toast.success(language === 'ar' ? 'تم التحديث' : 'Updated')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل التحديث' : 'Update failed')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-pro p-5">
        <h1 className="text-lg font-semibold text-app">
          {language === 'ar' ? 'طلبات تفعيل التجار' : 'Trader activation requests'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {language === 'ar'
            ? 'اعتماد أو رفض حسابات التجار المسجلة حديثاً.'
            : 'Approve or reject newly registered trader accounts.'}
        </p>
      </div>

      {loading ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : items.length === 0 ? (
        <div className="card-pro p-5 text-sm text-muted">{language === 'ar' ? 'لا توجد طلبات حالياً.' : 'No pending requests.'}</div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <article key={item.id} className="card-pro p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted">
                    {language === 'ar' ? 'الاسم' : 'Name'}: <span className="text-app">{item.user?.name || '-'}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {language === 'ar' ? 'البريد' : 'Email'}: <span className="text-app">{item.user?.email || '-'}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {language === 'ar' ? 'الهاتف' : 'Phone'}: <span className="text-app">{item.user?.phone || '-'}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {language === 'ar' ? 'الشركة' : 'Company'}: <span className="text-app">{item.companyName || '-'}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {language === 'ar' ? 'الرقم الضريبي' : 'Tax ID'}: <span className="text-app">{item.taxNumber || '-'}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {language === 'ar' ? 'تاريخ التسجيل' : 'Registered'}:{' '}
                    {item.user?.createdAt ? new Date(item.user.createdAt).toLocaleDateString(language) : '-'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-primary !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60"
                    disabled={actionId === item.id}
                    onClick={() => decide(item.id, 'APPROVED')}
                  >
                    {language === 'ar' ? 'اعتماد' : 'Approve'}
                  </button>
                  <button
                    className="btn-secondary !rounded-lg !px-3 !py-2 text-sm disabled:opacity-60"
                    disabled={actionId === item.id}
                    onClick={() => decide(item.id, 'REJECTED')}
                  >
                    {language === 'ar' ? 'رفض' : 'Reject'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
