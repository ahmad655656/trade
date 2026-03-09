'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'

type AdminUser = {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  status: string
  lastLogin: string | null
  createdAt: string
}

export default function AdminUsersPage() {
  const { language } = useUi()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/admin/users', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) setUsers(result.data ?? [])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <section className="space-y-4">
      <div className="card-pro rounded-xl p-6">
        <h2 className="text-xl font-semibold text-app">{language === 'ar' ? 'إدارة المستخدمين' : 'Users management'}</h2>
        <p className="mt-2 text-muted">{language === 'ar' ? 'قائمة المستخدمين مع الدور والحالة وآخر تسجيل دخول.' : 'Users list with role, status, and last login.'}</p>
      </div>

      <div className="card-pro rounded-xl p-4">
        {loading ? (
          <p className="text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-app text-muted">
                  <th className="p-2 text-start">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'البريد' : 'Email'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'الدور' : 'Role'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-2 text-start">{language === 'ar' ? 'آخر دخول' : 'Last login'}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-app/50">
                    <td className="p-2 text-app">{user.name}</td>
                    <td className="p-2 text-muted">{user.email}</td>
                    <td className="p-2 text-muted">{user.role}</td>
                    <td className="p-2 text-muted">{user.status}</td>
                    <td className="p-2 text-muted">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '-'}</td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td className="p-2 text-muted" colSpan={5}>{language === 'ar' ? 'لا توجد بيانات' : 'No data'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

