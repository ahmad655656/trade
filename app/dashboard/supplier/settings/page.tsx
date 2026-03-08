'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { useUi } from '@/components/providers/UiProvider'

type BankAccount = {
  id: string
  bankName: string
  accountNumber: string
  iban: string | null
  isDefault: boolean
}

type SettingsTab = 'profile' | 'shipping' | 'banking'

export default function SupplierSettingsPage() {
  const { language } = useUi()
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [accounts, setAccounts] = useState<BankAccount[]>([])

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/supplier/wallet', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) setAccounts(result.data?.bankAccounts ?? [])
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <SupplierPageHeader
        titleAr="إعدادات المتجر"
        titleEn="Store Settings"
        subtitleAr="الملف التعريفي، الشحن، الحسابات البنكية والتفضيلات"
        subtitleEn="Store profile, shipping, banking accounts and preferences"
      />

      <section className="card-pro rounded-xl p-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: 'profile', ar: 'ملف المتجر', en: 'Store profile' },
              { key: 'shipping', ar: 'إعدادات الشحن', en: 'Shipping settings' },
              { key: 'banking', ar: 'الحسابات البنكية', en: 'Bank accounts' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`rounded-lg px-3 py-2 text-sm ${
                tab === item.key
                  ? 'bg-[color-mix(in_oklab,var(--app-primary)_14%,transparent)] text-app'
                  : 'text-muted hover:bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)]'
              }`}
            >
              {language === 'ar' ? item.ar : item.en}
            </button>
          ))}
        </div>
      </section>

      {tab === 'profile' && (
        <section className="card-pro rounded-xl p-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              toast.success(language === 'ar' ? 'تم حفظ ملف المتجر' : 'Store profile saved')
            }}
          >
            <input className="input-pro" placeholder={language === 'ar' ? 'اسم المتجر (عربي)' : 'Store name (Arabic)'} />
            <input className="input-pro" placeholder={language === 'ar' ? 'اسم المتجر (إنجليزي)' : 'Store name (English)'} />
            <textarea className="input-pro min-h-24 md:col-span-2" placeholder={language === 'ar' ? 'وصف المتجر AR/EN' : 'Store description AR/EN'} />
            <input className="input-pro" placeholder={language === 'ar' ? 'الهاتف' : 'Phone'} />
            <input className="input-pro" placeholder="WhatsApp" />
            <input className="input-pro" placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email'} />
            <button className="btn-primary !rounded-lg !px-4 !py-2 w-fit" type="submit">
              {language === 'ar' ? 'حفظ' : 'Save'}
            </button>
          </form>
        </section>
      )}

      {tab === 'shipping' && (
        <section className="card-pro rounded-xl p-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              toast.success(language === 'ar' ? 'تم حفظ إعدادات الشحن' : 'Shipping settings saved')
            }}
          >
            <input className="input-pro" placeholder={language === 'ar' ? 'شركات الشحن' : 'Shipping carriers'} />
            <input className="input-pro" placeholder={language === 'ar' ? 'تكلفة الشحن الأساسية (ل.س)' : 'Base shipping cost (SYP)'} />
            <input className="input-pro" placeholder={language === 'ar' ? 'مدة التوصيل المتوقعة (أيام)' : 'Estimated delivery days'} />
            <input className="input-pro" placeholder={language === 'ar' ? 'مناطق الشحن' : 'Shipping regions'} />
            <button className="btn-primary !rounded-lg !px-4 !py-2 w-fit" type="submit">
              {language === 'ar' ? 'حفظ' : 'Save'}
            </button>
          </form>
        </section>
      )}

      {tab === 'banking' && (
        <section className="card-pro rounded-xl p-4 space-y-4">
          {accounts.map((account) => (
            <article key={account.id} className="rounded-lg border border-app p-3">
              <p className="font-medium text-app">{account.bankName}</p>
              <p className="text-sm text-muted">{account.accountNumber}</p>
              <p className="text-sm text-muted">{account.iban || '-'}</p>
              {account.isDefault ? <p className="text-xs text-[var(--app-primary)]">{language === 'ar' ? 'الحساب الافتراضي' : 'Default account'}</p> : null}
            </article>
          ))}

          {!accounts.length ? <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد حسابات بنكية' : 'No bank accounts'}</p> : null}
        </section>
      )}
    </div>
  )
}
