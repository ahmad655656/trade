'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type WalletPayload = {
  wallet: {
    balance: number
    pendingBalance: number
    totalEarned: number
    totalWithdrawn: number
    transactions: Array<{
      id: string
      type: string
      amount: number
      description: string | null
      status: string
      createdAt: string
    }>
  }
  bankAccounts: Array<{
    id: string
    bankName: string
    accountNumber: string
    iban: string | null
    isDefault: boolean
  }>
  withdrawals: Array<{
    id: string
    amount: number
    status: string
    createdAt: string
  }>
}

export default function SupplierWalletPage() {
  const { language } = useUi()
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
  const [data, setData] = useState<WalletPayload | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/supplier/wallet', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to load wallet')
        setData(result.data)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحميل المحفظة' : 'Failed to load wallet')
      }
    }
    void load()
  }, [language])

  const visibleTransactions = useMemo(() => {
    if (!data) return []
    const mapped = data.wallet.transactions.map((item) => ({
      ...item,
      direction: item.type === 'DEPOSIT' || item.type === 'REFUND' || item.type === 'COMMISSION' ? 'IN' : 'OUT',
    }))
    return typeFilter === 'ALL' ? mapped : mapped.filter((item) => item.direction === typeFilter)
  }, [data, typeFilter])

  return (
    <div className="space-y-6">
      <SupplierPageHeader
        titleAr="المحفظة والأرباح"
        titleEn="Wallet & Earnings"
        subtitleAr="الرصيد الحالي، المعاملات، وطلبات السحب"
        subtitleEn="Current balance, transactions, and withdrawal requests"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat labelAr="الرصيد الحالي" labelEn="Current balance" value={formatSypAmount(data?.wallet.balance ?? 0, language)} />
        <Stat labelAr="الأرباح المعلقة" labelEn="Pending earnings" value={formatSypAmount(data?.wallet.pendingBalance ?? 0, language)} />
        <Stat labelAr="إجمالي الأرباح" labelEn="Total earnings" value={formatSypAmount(data?.wallet.totalEarned ?? 0, language)} />
        <Stat labelAr="إجمالي المسحوبات" labelEn="Total withdrawals" value={formatSypAmount(data?.wallet.totalWithdrawn ?? 0, language)} />
      </section>

      <section className="card-pro rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select className="input-pro !w-52" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'IN' | 'OUT')}>
            <option value="ALL">{language === 'ar' ? 'كل الأنواع' : 'All types'}</option>
            <option value="IN">{language === 'ar' ? 'داخل' : 'In'}</option>
            <option value="OUT">{language === 'ar' ? 'خارج' : 'Out'}</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-app text-muted">
                <th className="p-2 text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.map((item) => (
                <tr key={item.id} className="border-b border-app/50">
                  <td className="p-2 text-muted">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="p-2 text-app">{item.description || '-'}</td>
                  <td className="p-2 text-muted">{formatSypAmount(item.amount, language)}</td>
                  <td className="p-2 text-muted">{item.direction}</td>
                  <td className="p-2 text-muted">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-pro rounded-xl p-4">
        <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'الحسابات البنكية' : 'Bank accounts'}</h2>
        <div className="mt-3 space-y-2">
          {(data?.bankAccounts ?? []).map((account) => (
            <article key={account.id} className="rounded-lg border border-app p-3">
              <p className="font-medium text-app">{account.bankName}</p>
              <p className="text-sm text-muted">{account.accountNumber}</p>
              <p className="text-sm text-muted">{account.iban || '-'}</p>
            </article>
          ))}
          {!data?.bankAccounts?.length ? <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد حسابات بنكية' : 'No bank accounts'}</p> : null}
        </div>
      </section>
    </div>
  )
}

function Stat({ labelAr, labelEn, value }: { labelAr: string; labelEn: string; value: string }) {
  const { language } = useUi()
  return (
    <article className="card-pro rounded-xl p-4">
      <p className="text-sm text-muted">{language === 'ar' ? labelAr : labelEn}</p>
      <p className="mt-2 text-2xl font-bold text-app">{value}</p>
    </article>
  )
}
