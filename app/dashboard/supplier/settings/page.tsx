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

type KycDocument = {
  id: string
  type: 'ID_DOCUMENT' | 'BUSINESS_REGISTRATION' | 'PHONE_PROOF' | 'ADDRESS_PROOF'
  fileUrl: string
}

type KycPayload = {
  id: string
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
  phoneVerified: boolean
  addressVerified: boolean
  documents: KycDocument[]
  rejectionReason: string | null
}

type SettingsTab = 'profile' | 'shipping' | 'banking' | 'verification'

export default function SupplierSettingsPage() {
  const { language } = useUi()
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [kyc, setKyc] = useState<KycPayload | null>(null)
  const [kycDraft, setKycDraft] = useState<{
    phoneVerified: boolean
    addressVerified: boolean
    documents: Array<{ type: KycDocument['type']; fileUrl: string }>
  }>({
    phoneVerified: false,
    addressVerified: false,
    documents: [],
  })
  const [uploadingType, setUploadingType] = useState<KycDocument['type'] | null>(null)
  const [submittingKyc, setSubmittingKyc] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [walletRes, kycRes] = await Promise.all([
        fetch('/api/supplier/wallet', { cache: 'no-store' }),
        fetch('/api/supplier/kyc', { cache: 'no-store' }),
      ])
      const [walletJson, kycJson] = await Promise.all([walletRes.json(), kycRes.json()])
      if (walletRes.ok && walletJson.success) setAccounts(walletJson.data?.bankAccounts ?? [])
      if (kycRes.ok && kycJson.success) {
        setKyc(kycJson.data ?? null)
        setKycDraft({
          phoneVerified: kycJson.data?.phoneVerified ?? false,
          addressVerified: kycJson.data?.addressVerified ?? false,
          documents:
            kycJson.data?.documents?.map((item: KycDocument) => ({
              type: item.type,
              fileUrl: item.fileUrl,
            })) ?? [],
        })
      }
    }
    void load()
  }, [])

  const uploadVerificationFile = async (type: KycDocument['type'], file: File) => {
    setUploadingType(type)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/uploads/verification', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed upload')
      setKycDraft((prev) => ({
        ...prev,
        documents: [...prev.documents.filter((doc) => doc.type !== type), { type, fileUrl: result.data.url }],
      }))
      toast.success(language === 'ar' ? 'تم رفع الملف' : 'File uploaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل رفع الملف' : 'Upload failed')
    } finally {
      setUploadingType(null)
    }
  }

  const submitKyc = async () => {
    setSubmittingKyc(true)
    try {
      const response = await fetch('/api/supplier/kyc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify(kycDraft),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to submit KYC')
      setKyc(result.data)
      toast.success(language === 'ar' ? 'تم إرسال ملف التوثيق' : 'KYC submitted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل إرسال التوثيق' : 'Failed to submit KYC')
    } finally {
      setSubmittingKyc(false)
    }
  }

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
              { key: 'verification', ar: 'توثيق المورد (KYC)', en: 'Supplier verification (KYC)' },
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

      {tab === 'verification' && (
        <section className="card-pro rounded-xl p-4 space-y-4">
          <div className="rounded-lg border border-app p-3 text-sm">
            <p className="font-semibold text-app">{language === 'ar' ? 'حالة التوثيق' : 'Verification status'}: {kyc?.status || 'PENDING'}</p>
            {kyc?.status === 'APPROVED' ? (
              <p className="mt-1 text-emerald-600">{language === 'ar' ? 'مبروك، أنت مورد موثّق' : 'You are now a verified supplier'}</p>
            ) : null}
            {kyc?.status === 'REJECTED' ? (
              <p className="mt-1 text-red-600">{language === 'ar' ? `سبب الرفض: ${kyc.rejectionReason || '-'}` : `Rejection reason: ${kyc.rejectionReason || '-'}`}</p>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={kycDraft.phoneVerified} onChange={(e) => setKycDraft((prev) => ({ ...prev, phoneVerified: e.target.checked }))} />
              {language === 'ar' ? 'تم التحقق من الهاتف' : 'Phone verified'}
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={kycDraft.addressVerified} onChange={(e) => setKycDraft((prev) => ({ ...prev, addressVerified: e.target.checked }))} />
              {language === 'ar' ? 'تم التحقق من العنوان' : 'Address verified'}
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <UploadField
              language={language}
              labelAr="هوية شخصية"
              labelEn="ID document"
              type="ID_DOCUMENT"
              uploadingType={uploadingType}
              onUpload={uploadVerificationFile}
              currentUrl={kycDraft.documents.find((doc) => doc.type === 'ID_DOCUMENT')?.fileUrl}
            />
            <UploadField
              language={language}
              labelAr="سجل تجاري (اختياري)"
              labelEn="Business registration (optional)"
              type="BUSINESS_REGISTRATION"
              uploadingType={uploadingType}
              onUpload={uploadVerificationFile}
              currentUrl={kycDraft.documents.find((doc) => doc.type === 'BUSINESS_REGISTRATION')?.fileUrl}
            />
            <UploadField
              language={language}
              labelAr="إثبات الهاتف"
              labelEn="Phone proof"
              type="PHONE_PROOF"
              uploadingType={uploadingType}
              onUpload={uploadVerificationFile}
              currentUrl={kycDraft.documents.find((doc) => doc.type === 'PHONE_PROOF')?.fileUrl}
            />
            <UploadField
              language={language}
              labelAr="إثبات العنوان"
              labelEn="Address proof"
              type="ADDRESS_PROOF"
              uploadingType={uploadingType}
              onUpload={uploadVerificationFile}
              currentUrl={kycDraft.documents.find((doc) => doc.type === 'ADDRESS_PROOF')?.fileUrl}
            />
          </div>

          <button className="btn-primary !rounded-lg !px-4 !py-2 disabled:opacity-60" disabled={submittingKyc} onClick={submitKyc}>
            {submittingKyc ? (language === 'ar' ? 'جارٍ الإرسال...' : 'Submitting...') : language === 'ar' ? 'إرسال ملف التوثيق' : 'Submit KYC'}
          </button>
        </section>
      )}
    </div>
  )
}

function UploadField({
  language,
  labelAr,
  labelEn,
  type,
  uploadingType,
  onUpload,
  currentUrl,
}: {
  language: 'ar' | 'en'
  labelAr: string
  labelEn: string
  type: KycDocument['type']
  uploadingType: KycDocument['type'] | null
  onUpload: (type: KycDocument['type'], file: File) => Promise<void>
  currentUrl?: string
}) {
  return (
    <div className="space-y-2 rounded-lg border border-app p-3">
      <p className="text-sm font-medium text-app">{language === 'ar' ? labelAr : labelEn}</p>
      <input
        type="file"
        className="input-pro"
        disabled={uploadingType === type}
        onChange={async (e) => {
          const input = e.currentTarget
          const file = input.files?.[0]
          if (!file) return
          await onUpload(type, file)
          input.value = ''
        }}
      />
      {currentUrl ? (
        <a className="text-xs text-[var(--app-primary)] underline" href={currentUrl} target="_blank" rel="noreferrer">
          {language === 'ar' ? 'عرض الملف المرفوع' : 'View uploaded file'}
        </a>
      ) : (
        <p className="text-xs text-muted">{language === 'ar' ? 'لم يتم الرفع بعد' : 'Not uploaded yet'}</p>
      )}
    </div>
  )
}
