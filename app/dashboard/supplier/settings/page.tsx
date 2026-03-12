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

type BusinessType = 'RETAIL' | 'WHOLESALE' | 'MANUFACTURER' | 'DISTRIBUTOR' | 'SERVICE_PROVIDER'

type SupplierProfile = {
  companyName: string
  description: string | null
  businessType: BusinessType | null
  commercialRegister: string | null
  taxNumber: string | null
  user: {
    name: string
    email: string
    phone: string | null
  }
}

type ShippingMethod = {
  id: string
  name: string
  description: string | null
  fee: number
  estimatedDays: number | null
  isActive: boolean
}

type SettingsTab = 'profile' | 'shipping' | 'banking' | 'verification'

export default function SupplierSettingsPage() {
  const { language } = useUi()
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [profileDraft, setProfileDraft] = useState({
    companyName: '',
    description: '',
    businessType: '' as BusinessType | '',
    commercialRegister: '',
    taxNumber: '',
    contactName: '',
    phone: '',
    email: '',
  })
  const [profileSaving, setProfileSaving] = useState(false)

  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [shippingDrafts, setShippingDrafts] = useState<Record<string, Partial<ShippingMethod>>>({})
  const [newMethod, setNewMethod] = useState({
    name: '',
    description: '',
    fee: '',
    estimatedDays: '',
    isActive: true,
  })
  const [shippingLoading, setShippingLoading] = useState(false)
  const [savingMethodId, setSavingMethodId] = useState<string | null>(null)
  const [creatingMethod, setCreatingMethod] = useState(false)
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null)
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
      setShippingLoading(true)
      try {
        const [walletRes, kycRes, profileRes, shippingRes] = await Promise.all([
          fetch('/api/supplier/wallet', { cache: 'no-store' }),
          fetch('/api/supplier/kyc', { cache: 'no-store' }),
          fetch('/api/supplier/profile', { cache: 'no-store' }),
          fetch('/api/supplier/shipping-methods', { cache: 'no-store' }),
        ])

        const [walletJson, kycJson, profileJson, shippingJson] = await Promise.all([
          walletRes.json(),
          kycRes.json(),
          profileRes.json(),
          shippingRes.json(),
        ])

        if (walletRes.ok && walletJson.success) setAccounts(walletJson.data?.bankAccounts ?? [])

        if (profileRes.ok && profileJson.success) {
          const nextProfile = profileJson.data as SupplierProfile
          setProfileDraft({
            companyName: nextProfile.companyName ?? '',
            description: nextProfile.description ?? '',
            businessType: nextProfile.businessType ?? '',
            commercialRegister: nextProfile.commercialRegister ?? '',
            taxNumber: nextProfile.taxNumber ?? '',
            contactName: nextProfile.user?.name ?? '',
            phone: nextProfile.user?.phone ?? '',
            email: nextProfile.user?.email ?? '',
          })
        } else if (!profileRes.ok) {
          toast.error(language === 'ar' ? 'فشل تحميل ملف المتجر' : 'Failed to load profile')
        }

        if (shippingRes.ok && shippingJson.success) {
          setShippingMethods(shippingJson.data ?? [])
        } else if (!shippingRes.ok) {
          toast.error(language === 'ar' ? 'فشل تحميل طرق الشحن' : 'Failed to load shipping methods')
        }

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
      } catch (error) {
        toast.error(language === 'ar' ? 'فشل تحميل الإعدادات' : 'Failed to load settings')
      } finally {
        setShippingLoading(false)
      }
    }
    void load()
  }, [language])

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

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileDraft.companyName.trim()) {
      toast.error(language === 'ar' ? 'اسم المتجر مطلوب' : 'Store name is required')
      return
    }

    setProfileSaving(true)
    try {
      const response = await fetch('/api/supplier/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: profileDraft.companyName,
          description: profileDraft.description || null,
          businessType: profileDraft.businessType || null,
          commercialRegister: profileDraft.commercialRegister || null,
          taxNumber: profileDraft.taxNumber || null,
          name: profileDraft.contactName,
          phone: profileDraft.phone || null,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to save profile')
      const nextProfile = result.data as SupplierProfile
      setProfileDraft({
        companyName: nextProfile.companyName ?? '',
        description: nextProfile.description ?? '',
        businessType: nextProfile.businessType ?? '',
        commercialRegister: nextProfile.commercialRegister ?? '',
        taxNumber: nextProfile.taxNumber ?? '',
        contactName: nextProfile.user?.name ?? '',
        phone: nextProfile.user?.phone ?? '',
        email: nextProfile.user?.email ?? '',
      })
      toast.success(language === 'ar' ? 'تم حفظ ملف المتجر' : 'Store profile saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل حفظ ملف المتجر' : 'Failed to save profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const updateShippingDraft = (id: string, updates: Partial<ShippingMethod>) => {
    setShippingDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...updates } }))
  }

  const saveShippingMethod = async (method: ShippingMethod) => {
    const draft = shippingDrafts[method.id] ?? {}
    const name = (draft.name ?? method.name).trim()
    if (!name) {
      toast.error(language === 'ar' ? 'اسم طريقة الشحن مطلوب' : 'Shipping method name is required')
      return
    }

    const feeValue = Number(draft.fee ?? method.fee)
    if (Number.isNaN(feeValue)) {
      toast.error(language === 'ar' ? 'أدخل قيمة صحيحة للتكلفة' : 'Enter a valid fee')
      return
    }

    const estimatedRaw = draft.estimatedDays ?? method.estimatedDays ?? null
    const estimatedValue = estimatedRaw === null ? null : Number(estimatedRaw)
    if (estimatedValue !== null && Number.isNaN(estimatedValue)) {
      toast.error(language === 'ar' ? 'أدخل عدد أيام صحيح' : 'Enter valid estimated days')
      return
    }

    setSavingMethodId(method.id)
    try {
      const response = await fetch(`/api/supplier/shipping-methods/${method.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: draft.description ?? method.description ?? null,
          fee: feeValue,
          estimatedDays: estimatedValue,
          isActive: draft.isActive ?? method.isActive,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to update shipping method')
      setShippingMethods(result.data ?? [])
      setShippingDrafts((prev) => {
        const next = { ...prev }
        delete next[method.id]
        return next
      })
      toast.success(language === 'ar' ? 'تم تحديث طريقة الشحن' : 'Shipping method updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تحديث طريقة الشحن' : 'Failed to update shipping method')
    } finally {
      setSavingMethodId(null)
    }
  }

  const createShippingMethod = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newMethod.name.trim()
    if (!name) {
      toast.error(language === 'ar' ? 'اسم طريقة الشحن مطلوب' : 'Shipping method name is required')
      return
    }

    const feeValue = Number(newMethod.fee || 0)
    if (Number.isNaN(feeValue)) {
      toast.error(language === 'ar' ? 'أدخل قيمة صحيحة للتكلفة' : 'Enter a valid fee')
      return
    }

    const estimatedValue = newMethod.estimatedDays ? Number(newMethod.estimatedDays) : null
    if (estimatedValue !== null && Number.isNaN(estimatedValue)) {
      toast.error(language === 'ar' ? 'أدخل عدد أيام صحيح' : 'Enter valid estimated days')
      return
    }

    setCreatingMethod(true)
    try {
      const response = await fetch('/api/supplier/shipping-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: newMethod.description || null,
          fee: feeValue,
          estimatedDays: estimatedValue,
          isActive: newMethod.isActive,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to create shipping method')
      setShippingMethods(result.data ?? [])
      setNewMethod({ name: '', description: '', fee: '', estimatedDays: '', isActive: true })
      toast.success(language === 'ar' ? 'تمت إضافة طريقة الشحن' : 'Shipping method added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل إضافة طريقة الشحن' : 'Failed to add shipping method')
    } finally {
      setCreatingMethod(false)
    }
  }

  const deleteShippingMethod = async (id: string) => {
    const ok = window.confirm(language === 'ar' ? 'حذف طريقة الشحن؟' : 'Delete this shipping method?')
    if (!ok) return

    setDeletingMethodId(id)
    try {
      const response = await fetch(`/api/supplier/shipping-methods/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to delete shipping method')
      setShippingMethods(result.data ?? [])
      setShippingDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast.success(language === 'ar' ? 'تم حذف طريقة الشحن' : 'Shipping method deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل حذف طريقة الشحن' : 'Failed to delete shipping method')
    } finally {
      setDeletingMethodId(null)
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
          <form className="grid gap-4 md:grid-cols-2" onSubmit={saveProfile}>
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-app">{language === 'ar' ? 'اسم المتجر' : 'Store name'}</label>
              <input
                className="input-pro"
                value={profileDraft.companyName}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, companyName: e.target.value }))}
                placeholder={language === 'ar' ? 'اسم المتجر' : 'Store name'}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-app">{language === 'ar' ? 'نوع النشاط' : 'Business type'}</label>
              <select
                className="input-pro"
                value={profileDraft.businessType}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, businessType: e.target.value as BusinessType | '' }))}
              >
                <option value="">{language === 'ar' ? 'اختر النوع' : 'Select type'}</option>
                <option value="RETAIL">{language === 'ar' ? 'تجزئة' : 'Retail'}</option>
                <option value="WHOLESALE">{language === 'ar' ? 'جملة' : 'Wholesale'}</option>
                <option value="MANUFACTURER">{language === 'ar' ? 'مصنع' : 'Manufacturer'}</option>
                <option value="DISTRIBUTOR">{language === 'ar' ? 'موزّع' : 'Distributor'}</option>
                <option value="SERVICE_PROVIDER">{language === 'ar' ? 'خدمات' : 'Service provider'}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-app">{language === 'ar' ? 'رقم السجل التجاري' : 'Commercial register'}</label>
              <input
                className="input-pro"
                value={profileDraft.commercialRegister}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, commercialRegister: e.target.value }))}
                placeholder={language === 'ar' ? 'مثال: 123456' : 'e.g. 123456'}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-app">{language === 'ar' ? 'الرقم الضريبي' : 'Tax number'}</label>
              <input
                className="input-pro"
                value={profileDraft.taxNumber}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, taxNumber: e.target.value }))}
                placeholder={language === 'ar' ? 'رقم ضريبي' : 'Tax number'}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-app">{language === 'ar' ? 'وصف المتجر' : 'Store description'}</label>
              <textarea
                className="input-pro min-h-24"
                value={profileDraft.description}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={language === 'ar' ? 'اكتب وصفًا واضحًا عن نشاط المتجر' : 'Write a clear store description'}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-app">{language === 'ar' ? 'اسم المسؤول' : 'Contact name'}</label>
              <input
                className="input-pro"
                value={profileDraft.contactName}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, contactName: e.target.value }))}
                placeholder={language === 'ar' ? 'اسم المسؤول' : 'Contact name'}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-app">{language === 'ar' ? 'الهاتف' : 'Phone'}</label>
              <input
                className="input-pro"
                value={profileDraft.phone}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder={language === 'ar' ? 'رقم الهاتف' : 'Phone number'}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-app">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
              <input className="input-pro opacity-70" value={profileDraft.email} disabled />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-2">
              <button className="btn-primary !rounded-lg !px-4 !py-2 w-fit disabled:opacity-60" type="submit" disabled={profileSaving}>
                {profileSaving ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : language === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </form>
        </section>
      )}

      {tab === 'shipping' && (
        <section className="card-pro rounded-xl p-4 space-y-4">
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={createShippingMethod}>
            <input
              className="input-pro"
              placeholder={language === 'ar' ? 'اسم طريقة الشحن' : 'Method name'}
              value={newMethod.name}
              onChange={(e) => setNewMethod((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="input-pro"
              placeholder={language === 'ar' ? 'الوصف (اختياري)' : 'Description (optional)'}
              value={newMethod.description}
              onChange={(e) => setNewMethod((prev) => ({ ...prev, description: e.target.value }))}
            />
            <input
              className="input-pro"
              type="number"
              min={0}
              step="0.01"
              placeholder={language === 'ar' ? 'التكلفة' : 'Fee'}
              value={newMethod.fee}
              onChange={(e) => setNewMethod((prev) => ({ ...prev, fee: e.target.value }))}
            />
            <input
              className="input-pro"
              type="number"
              min={0}
              placeholder={language === 'ar' ? 'مدة التوصيل (أيام)' : 'Estimated days'}
              value={newMethod.estimatedDays}
              onChange={(e) => setNewMethod((prev) => ({ ...prev, estimatedDays: e.target.value }))}
            />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={newMethod.isActive}
                  onChange={(e) => setNewMethod((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                {language === 'ar' ? 'مفعلة' : 'Active'}
              </label>
              <button className="btn-primary !rounded-lg !px-4 !py-2 text-sm disabled:opacity-60" type="submit" disabled={creatingMethod}>
                {creatingMethod ? (language === 'ar' ? 'جارٍ الإضافة...' : 'Adding...') : language === 'ar' ? 'إضافة' : 'Add'}
              </button>
            </div>
          </form>

          {shippingLoading ? (
            <p className="text-sm text-muted">{language === 'ar' ? 'جارٍ تحميل طرق الشحن...' : 'Loading shipping methods...'}</p>
          ) : shippingMethods.length === 0 ? (
            <p className="text-sm text-muted">{language === 'ar' ? 'لا توجد طرق شحن بعد.' : 'No shipping methods yet.'}</p>
          ) : (
            <div className="space-y-3">
              {shippingMethods.map((method) => {
                const draft = shippingDrafts[method.id] ?? {}
                const feeValue = draft.fee ?? method.fee
                const daysValue = draft.estimatedDays ?? method.estimatedDays ?? ''
                return (
                  <div key={method.id} className="rounded-lg border border-app p-3 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <input
                        className="input-pro"
                        value={draft.name ?? method.name}
                        onChange={(e) => updateShippingDraft(method.id, { name: e.target.value })}
                      />
                      <input
                        className="input-pro"
                        value={draft.description ?? method.description ?? ''}
                        onChange={(e) => updateShippingDraft(method.id, { description: e.target.value })}
                      />
                      <input
                        className="input-pro"
                        type="number"
                        min={0}
                        step="0.01"
                        value={feeValue}
                        onChange={(e) => updateShippingDraft(method.id, { fee: Number(e.target.value) })}
                      />
                      <input
                        className="input-pro"
                        type="number"
                        min={0}
                        value={daysValue}
                        onChange={(e) => updateShippingDraft(method.id, { estimatedDays: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                      <label className="flex items-center gap-2 text-sm text-muted">
                        <input
                          type="checkbox"
                          checked={draft.isActive ?? method.isActive}
                          onChange={(e) => updateShippingDraft(method.id, { isActive: e.target.checked })}
                        />
                        {language === 'ar' ? 'مفعلة' : 'Active'}
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn-secondary !rounded-md !px-3 !py-1.5 text-xs disabled:opacity-60"
                        onClick={() => saveShippingMethod(method)}
                        disabled={savingMethodId === method.id}
                      >
                        {savingMethodId === method.id ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : language === 'ar' ? 'حفظ' : 'Save'}
                      </button>
                      <button
                        className="btn-secondary !rounded-md !px-3 !py-1.5 text-xs disabled:opacity-60"
                        onClick={() => deleteShippingMethod(method.id)}
                        disabled={deletingMethodId === method.id}
                      >
                        {deletingMethodId === method.id ? (language === 'ar' ? 'جارٍ الحذف...' : 'Deleting...') : language === 'ar' ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
