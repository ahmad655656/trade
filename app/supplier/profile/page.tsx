'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import SupplierPageHeader from '@/components/supplier/SupplierPageHeader'
import { useUi } from '@/components/providers/UiProvider'
import { CloudImage } from '@/components/common/CloudImage'

type SupplierProfile = {
  id: string
  companyName: string
  description: string | null
  businessType: string | null
  commercialRegister: string | null
  taxNumber: string | null
  logo: string | null
  coverImage: string | null
  user: {
    name: string
    email: string
    phone: string | null
  }
}

const businessTypes = [
  { value: 'RETAIL', ar: 'تجزئة', en: 'Retail' },
  { value: 'WHOLESALE', ar: 'جملة', en: 'Wholesale' },
  { value: 'MANUFACTURER', ar: 'مصنّع', en: 'Manufacturer' },
  { value: 'DISTRIBUTOR', ar: 'موزّع', en: 'Distributor' },
  { value: 'SERVICE_PROVIDER', ar: 'مزود خدمة', en: 'Service provider' },
]

export default function SupplierProfilePage() {
  const { language } = useUi()
  const [form, setForm] = useState({
    companyName: '',
    description: '',
    businessType: '',
    commercialRegister: '',
    taxNumber: '',
    logo: '',
    coverImage: '',
    contactName: '',
    email: '',
    phone: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/supplier/profile', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.success) {
        const data = result.data as SupplierProfile
        setForm({
          companyName: data.companyName ?? '',
          description: data.description ?? '',
          businessType: data.businessType ?? '',
          commercialRegister: data.commercialRegister ?? '',
          taxNumber: data.taxNumber ?? '',
          logo: data.logo ?? '',
          coverImage: data.coverImage ?? '',
          contactName: data.user.name ?? '',
          email: data.user.email ?? '',
          phone: data.user.phone ?? '',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      throw new Error(language === 'ar' ? 'يرجى اختيار ملف صورة فقط' : 'Please choose an image file')
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(language === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 10MB' : 'Image size must be 10MB or less')
    }

    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch('/api/uploads/product-image', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error || (language === 'ar' ? 'فشل رفع الصورة' : 'Image upload failed'))
    }

    return result.data.url as string
  }

  const handleUpload = async (file: File, field: 'logo' | 'coverImage') => {
    const setUploading = field === 'logo' ? setUploadingLogo : setUploadingCover
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm((prev) => ({ ...prev, [field]: url }))
      toast.success(language === 'ar' ? 'تم رفع الصورة' : 'Image uploaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل رفع الصورة' : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const saveProfile = async () => {
    if (!form.companyName.trim()) {
      toast.error(language === 'ar' ? 'اسم المتجر مطلوب' : 'Store name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        companyName: form.companyName.trim(),
        description: form.description.trim() || null,
        businessType: form.businessType || null,
        commercialRegister: form.commercialRegister.trim() || null,
        taxNumber: form.taxNumber.trim() || null,
        logo: form.logo.trim() || null,
        coverImage: form.coverImage.trim() || null,
        name: form.contactName.trim() || null,
        phone: form.phone.trim() || null,
      }

      const response = await fetch('/api/supplier/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || (language === 'ar' ? 'فشل حفظ البيانات' : 'Failed to save profile'))
      }

      toast.success(language === 'ar' ? 'تم حفظ الملف التجاري' : 'Profile saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل حفظ البيانات' : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <SupplierPageHeader
        titleAr="الملف التجاري"
        titleEn="Business profile"
        subtitleAr="حدّث بيانات متجرك ليظهر بشكل احترافي للتجار."
        subtitleEn="Update your store details to look professional to traders."
        actions={
          <button className="btn-secondary !rounded-lg !px-3 !py-2 text-sm" onClick={load}>
            {language === 'ar' ? 'تحديث البيانات' : 'Refresh data'}
          </button>
        }
      />

      {loading ? (
        <div className="card-pro rounded-xl p-4 text-sm text-muted">{language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : (
        <div className="space-y-4">
          <section className="card-pro rounded-xl p-4">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'بيانات المتجر' : 'Store details'}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-muted">{language === 'ar' ? 'اسم المتجر' : 'Store name'}</label>
                <input
                  className="input-pro mt-2"
                  value={form.companyName}
                  onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-muted">{language === 'ar' ? 'نوع النشاط' : 'Business type'}</label>
                <select
                  className="input-pro mt-2"
                  value={form.businessType}
                  onChange={(e) => setForm((prev) => ({ ...prev, businessType: e.target.value }))}
                >
                  <option value="">{language === 'ar' ? 'اختر نوع النشاط' : 'Select type'}</option>
                  {businessTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {language === 'ar' ? type.ar : type.en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-muted">{language === 'ar' ? 'وصف المتجر' : 'Store description'}</label>
                <textarea
                  className="input-pro mt-2 min-h-[120px]"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-muted">{language === 'ar' ? 'السجل التجاري' : 'Commercial register'}</label>
                <input
                  className="input-pro mt-2"
                  value={form.commercialRegister}
                  onChange={(e) => setForm((prev) => ({ ...prev, commercialRegister: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-muted">{language === 'ar' ? 'الرقم الضريبي' : 'Tax number'}</label>
                <input
                  className="input-pro mt-2"
                  value={form.taxNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, taxNumber: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <section className="card-pro rounded-xl p-4">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'بيانات التواصل' : 'Contact details'}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-muted">{language === 'ar' ? 'اسم المسؤول' : 'Contact name'}</label>
                <input
                  className="input-pro mt-2"
                  value={form.contactName}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-muted">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                <input
                  className="input-pro mt-2"
                  value={form.email}
                  disabled
                />
              </div>
              <div>
                <label className="text-sm text-muted">{language === 'ar' ? 'رقم الهاتف' : 'Phone number'}</label>
                <input
                  className="input-pro mt-2"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <section className="card-pro rounded-xl p-4">
            <h2 className="text-lg font-semibold text-app">{language === 'ar' ? 'الهوية البصرية' : 'Branding'}</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm text-muted">{language === 'ar' ? 'شعار المتجر' : 'Store logo'}</p>
                <CloudImage src={form.logo} alt="logo" width={300} height={200} className="h-32 w-32 rounded-xl object-cover" />
                <input
                  type="file"
                  accept="image/*"
                  className="input-pro"
                  disabled={uploadingLogo}
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0]
                    e.currentTarget.value = ''
                    if (file) void handleUpload(file, 'logo')
                  }}
                />
                <input
                  className="input-pro"
                  placeholder={language === 'ar' ? 'رابط الشعار (اختياري)' : 'Logo URL (optional)'}
                  value={form.logo}
                  onChange={(e) => setForm((prev) => ({ ...prev, logo: e.target.value }))}
                />
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted">{language === 'ar' ? 'صورة الغلاف' : 'Cover image'}</p>
                <CloudImage src={form.coverImage} alt="cover" width={520} height={240} className="h-32 w-full rounded-xl object-cover" />
                <input
                  type="file"
                  accept="image/*"
                  className="input-pro"
                  disabled={uploadingCover}
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0]
                    e.currentTarget.value = ''
                    if (file) void handleUpload(file, 'coverImage')
                  }}
                />
                <input
                  className="input-pro"
                  placeholder={language === 'ar' ? 'رابط الغلاف (اختياري)' : 'Cover URL (optional)'}
                  value={form.coverImage}
                  onChange={(e) => setForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              className="btn-primary !rounded-lg !px-4 !py-2 text-sm disabled:opacity-60"
              onClick={saveProfile}
              disabled={saving || uploadingLogo || uploadingCover}
            >
              {saving
                ? language === 'ar'
                  ? 'جارٍ الحفظ...' : 'Saving...'
                : language === 'ar'
                  ? 'حفظ الملف'
                  : 'Save profile'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
