'use client'

import { useEffect, useState } from 'react'
import { useUi } from '@/components/providers/UiProvider'

export default function TraderVerifyPage() {
  const { language } = useUi()
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')

  useEffect(() => {
    // Fetch verification status
  }, [])

  return (
    <div className="card-pro mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-bold text-app mb-4">
        {language === 'ar' ? 'التحقق من الحساب' : 'Account Verification'}
      </h1>
      <p className="text-muted mb-8">
        {language === 'ar' ? 'حسابك قيد التحقق. سيتم إشعارك عبر البريد الإلكتروني خلال 48 ساعة.' : 'Your account is under review. You will be notified via email within 48 hours.'}
      </p>
      <div className="text-center py-8">
        <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-app">
          {language === 'ar' ? 'في الانتظار' : 'Pending Review'}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="text-sm text-muted">
          <strong>الحالة:</strong> قيد المراجعة
        </div>
        <div className="text-sm text-muted">
          <strong>التاريخ:</strong> {new Date().toLocaleDateString('ar')}
        </div>
      </div>
    </div>
  )
}
