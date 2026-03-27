'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { registerSchema } from '@/lib/validation'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'

type FormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterFallback() {
  return (
    <div className="card-pro mx-auto max-w-xl p-8">
      <div className="h-6 w-40 rounded-lg bg-white/10 animate-pulse" />
      <div className="mt-3 h-4 w-64 rounded-lg bg-white/10 animate-pulse" />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="h-10 rounded-xl bg-white/10 animate-pulse" />
        ))}
      </div>
      <div className="mt-5 h-10 rounded-xl bg-white/10 animate-pulse" />
    </div>
  )
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, language } = useUi()
  const [isLoading, setIsLoading] = useState(false)

  const initialRole = useMemo(() => {
    const role = searchParams.get('role')
    return role === 'SUPPLIER' ? 'SUPPLIER' : 'TRADER'
  }, [searchParams])

  const copy = useMemo(
    () => ({
      accountType: language === 'ar'
        ? 'نوع الحساب'
        : 'Account type',
      trader: language === 'ar' ? 'تاجر' : 'Trader',
      supplier: language === 'ar' ? 'مورد' : 'Supplier',
      fullName: language === 'ar' ? 'الاسم الكامل' : 'Full name',
      phone: language === 'ar'
        ? 'رقم الهاتف (إلزامي للتحقق)'
        : 'Phone number (required for verification)',
      email: language === 'ar' ? 'البريد الإلكتروني' : 'Email',
      company: language === 'ar'
        ? 'اسم الشركة / المتجر (إلزامي للتحقق)'
        : 'Company / store name (required for verification)',
      commercial: language === 'ar'
        ? 'السجل التجاري / الرقم الضريبي (إلزامي)'
        : 'Commercial register / tax ID (required)',
      tax: language === 'ar'
        ? 'رقم السجل الضريبي (إلزامي)'
        : 'Tax number (required)',
      identity: language === 'ar'
        ? 'صورة الهوية / السجل التجاري (إلزامي للموافقة)'
        : 'ID or commercial register (required for approval)',
      terms: language === 'ar'
        ? 'أوافق على شروط الخدمة والخصوصية، وأفهم أن الحساب يتطلب موافقة التحقق'
        : 'I agree to the terms and privacy policy and understand the account requires verification approval.',
      password: language === 'ar' ? 'كلمة المرور' : 'Password',
      confirmPassword: language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password',
      success: language === 'ar'
        ? 'تم إرسال طلب التسجيل. سيصلك بريد عند الموافقة.'
        : 'Registration submitted. You will receive an email once approved.',
      failed: language === 'ar' ? 'فشل' : 'Failed',
    }),
    [language],
  )

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: initialRole,
      termsAccepted: false,
    },
  })

  useEffect(() => {
    setValue('role', initialRole)
  }, [initialRole, setValue])

  const onSubmit = async (payload: FormValues) => {
    const requestBody: FormValues = {
      email: payload.email,
      password: payload.password,
      confirmPassword: payload.confirmPassword,
      name: payload.name,
      role: payload.role,
      phone: payload.phone,
      companyName: payload.companyName,
      commercialRegister: payload.commercialRegister,
      taxNumber: payload.taxNumber,
      termsAccepted: payload.termsAccepted,
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error ?? 'Registration failed')
      }

      toast.success(copy.success)
      router.push('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.failed)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card-pro mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold text-app">{t('register.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('register.subtitle')}</p>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">{copy.accountType}</label>
          <select {...register('role')} className="input-pro mt-1">
            <option value="TRADER">{copy.trader}</option>
            <option value="SUPPLIER">{copy.supplier}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-app">{copy.fullName}</label>
          <input {...register('name')} className="input-pro mt-1" />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-app">{copy.phone}</label>
          <input {...register('phone')} className="input-pro mt-1" dir="ltr" />
          {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">{copy.email}</label>
          <input {...register('email')} type="email" className="input-pro mt-1" dir="ltr" />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">{copy.company}</label>
          <input {...register('companyName')} className="input-pro mt-1" />
          {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">{copy.commercial}</label>
          <input {...register('commercialRegister')} className="input-pro mt-1" />
          {errors.commercialRegister && <p className="mt-1 text-sm text-red-500">{errors.commercialRegister.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">{copy.tax}</label>
          <input {...register('taxNumber')} className="input-pro mt-1" dir="ltr" />
          {errors.taxNumber && <p className="mt-1 text-sm text-red-500">{errors.taxNumber.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">{copy.identity}</label>
          <input type="file" accept="image/*,.pdf" className="input-pro mt-1 file-input" />
          {/* File validation handled server-side */}
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('termsAccepted')} />
            {copy.terms}
          </label>
          {errors.termsAccepted && <p className="mt-1 text-sm text-red-500">{errors.termsAccepted.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-app">{copy.password}</label>
          <input {...register('password')} type="password" className="input-pro mt-1" dir="ltr" />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-app">{copy.confirmPassword}</label>
          <input {...register('confirmPassword')} type="password" className="input-pro mt-1" dir="ltr" />
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary md:col-span-2 w-full disabled:opacity-60">
          {isLoading ? t('register.submitting') : t('register.submit')}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        {t('register.haveAccount')}{' '}
        <Link href="/login" className="font-semibold text-blue-500 hover:underline">
          {t('nav.login')}
        </Link>
      </p>
    </div>
  )
}
