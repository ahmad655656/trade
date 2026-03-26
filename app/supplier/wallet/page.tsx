'use client'

import { useEffect, useMemo, useState } from 'react'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { useUi } from '@/components/providers/UiProvider'
import { formatSypAmount } from '@/lib/currency'

type WalletTransaction = {
  id: string
  type: string
  amount: number
  description: string | null
  referenceId: string | null
  status: string
  createdAt: string
}

type WalletData = {
  balance: number
  pendingBalance: number
  totalEarned: number
  totalWithdrawn: number
  transactions: WalletTransaction[]
}

type BankAccount = {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  iban: string | null
  swift: string | null
  isDefault: boolean
}

type Withdrawal = {
  id: string
  amount: number
  status: string
  notes: string | null
  processedAt: string | null
  createdAt: string
}

function transactionTypeLabel(type: string, language: 'ar' | 'en') {
  const map: Record<string, { ar: string; en: string }> = {
    DEPOSIT: { ar: 'إيداع', en: 'Deposit' },
    WITHDRAWAL: { ar: 'سحب', en: 'Withdrawal' },
    PURCHASE: { ar: 'شراء', en: 'Purchase' },
    REFUND: { ar: 'استرداد', en: 'Refund' },
    COMMISSION: { ar: 'عمولة', en: 'Commission' },
    ADJUSTMENT: { ar: 'تعديل', en: 'Adjustment' },
  }
  return map[type]?.[language] ?? type
}

function transactionStatusLabel(status: string, language: 'ar' | 'en') {
  const map: Record<string, { ar: string; en: string }> = {
    PENDING: { ar: 'معلق', en: 'Pending' },
    COMPLETED: { ar: 'مكتمل', en: 'Completed' },
    FAILED: { ar: 'فشل', en: 'Failed' },
    CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
  }
  return map[status]?.[language] ?? status
}

export default function SupplierWalletPage() {
  const { language } = useUi()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/supplier/wallet', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.success) {
          setWallet(result.data.wallet)
          setBankAccounts(result.data.bankAccounts ?? [])
          setWithdrawals(result.data.withdrawals ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const summary = useMemo(() => {
    if (!wallet) return null
    return [
      { labelAr: 'الرصيد المتاح', labelEn: 'Available balance', value: wallet.balance },
      { labelAr: 'رصيد قيد التحصيل', labelEn: 'Pending balance', value: wallet.pendingBalance },
      { labelAr: 'إجمالي الأرباح', labelEn: 'Total earned', value: wallet.totalEarned },
      { labelAr: 'إجمالي المسحوبات', labelEn: 'Total withdrawn', value: wallet.totalWithdrawn },
    ]
  }, [wallet])

  return (
    <div className="space-y-4">
      <SupplierPageHeader
        titleAr="المحفظة المالية"
        titleEn="Wallet"
        subtitleAr="تابع أرصدتك وحركة العمليات البنكية والسحوبات."
        subtitleEn="Track balances, transactions, and withdrawals."
      />

      {loading ? (
        <div className="card-pro rounded-xl p-4 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : !wallet ? (
        <div className="card-pro rounded-xl p-4 text-sm text-muted">{language === 'ar' ? 'لا توجد بيانات للمحفظة.' : 'No wallet data.'}</div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summary?.map((item) => (
              <div key={item.labelEn} className="card-pro rounded-xl p-4">
                <p className="text-sm text-muted">{language === 'ar' ? item.labelAr : item.labelEn}</p>
                <p className="mt-2 text-2xl font-bold text-app">{formatSypAmount(item.value, language)}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <article className="card-pro rounded-xl p-4">
              <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'آخر العمليات' : 'Recent transactions'}</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-app text-muted">
                      <th className="p-2 text-start">{language === 'ar' ? 'النوع' : 'Type'}</th>
                      <th className="p-2 text-start">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                      <th className="p-2 text-start">{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                      <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="p-2 text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallet.transactions.length === 0 ? (
                      <tr>
                        <td className="p-3 text-sm text-muted" colSpan={5}>
                          {language === 'ar' ? 'لا توجد عمليات حتى الآن.' : 'No transactions yet.'}
                        </td>
                      </tr>
                    ) : (
                      wallet.transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-app/50">
                          <td className="p-2 text-app">{transactionTypeLabel(tx.type, language)}</td>
                          <td className="p-2 text-muted">{tx.description || '-'}</td>
                          <td className="p-2 text-app">{formatSypAmount(tx.amount, language)}</td>
                          <td className="p-2 text-muted">{transactionStatusLabel(tx.status, language)}</td>
                          <td className="p-2 text-muted">{new Date(tx.createdAt).toLocaleDateString(language)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="card-pro rounded-xl p-4">
              <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'الحسابات البنكية' : 'Bank accounts'}</h2>
              <div className="mt-4 space-y-3">
                {bankAccounts.length === 0 ? (
                  <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد حسابات مسجلة.' : 'No bank accounts yet.'}</p>
                ) : (
                  bankAccounts.map((account) => (
                    <div key={account.id} className="rounded-lg border border-app p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-app">{account.bankName}</p>
                        {account.isDefault ? (
                          <span className="text-xs text-emerald-600">{language === 'ar' ? 'افتراضي' : 'Default'}</span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted">{account.accountName}</p>
                      <p className="text-xs text-muted">{account.accountNumber}</p>
                      {account.iban ? <p className="text-xs text-muted">IBAN: {account.iban}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          <section className="card-pro rounded-xl p-4">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'طلبات السحب' : 'Withdrawals'}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-app text-muted">
                    <th className="p-2 text-start">{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                    <th className="p-2 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="p-2 text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="p-2 text-start">{language === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td className="p-3 text-sm text-muted" colSpan={4}>
                        {language === 'ar' ? 'لا توجد طلبات سحب.' : 'No withdrawals yet.'}
                      </td>
                    </tr>
                  ) : (
                    withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id} className="border-b border-app/50">
                        <td className="p-2 text-app">{formatSypAmount(withdrawal.amount, language)}</td>
                        <td className="p-2 text-muted">{transactionStatusLabel(withdrawal.status, language)}</td>
                        <td className="p-2 text-muted">{new Date(withdrawal.createdAt).toLocaleDateString(language)}</td>
                        <td className="p-2 text-muted">{withdrawal.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
