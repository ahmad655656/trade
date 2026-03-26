'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { registerSchema } from '@/lib/validation'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'

type FormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const { t, language } = useUi()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'TRADER',
      termsAccepted: false,
    },
  })

  const selectedRole = watch('role')

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

      toast.success(
        language === 'ar'
          ? 'تم إرسال طلب التسجيل. سيصلك بريد عند الموافقة.'
          : 'Registration submitted. You will receive an email once approved.',
      )
      router.push('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل' : 'Failed')
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
          <label className="block text-sm font-medium text-app">نوع الحساب</label>
          <select {...register('role')} className="input-pro mt-1">
            <option value="TRADER">تاجر</option>
            <option value="SUPPLIER">مورد</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-app">الاسم الكامل</label>
          <input {...register('name')} className="input-pro mt-1" />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-app">رقم الهاتف (إلزامي للتحقق)</label>
          <input {...register('phone')} className="input-pro mt-1" dir="ltr" />
          {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">البريد الإلكتروني</label>
          <input {...register('email')} type="email" className="input-pro mt-1" dir="ltr" />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">اسم الشركة / المتجر (إلزامي للتحقق)</label>
          <input {...register('companyName')} className="input-pro mt-1" />
          {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">السجل التجاري / الرقم الضريبي (إلزامي)</label>
          <input {...register('commercialRegister')} className="input-pro mt-1" />
          {errors.commercialRegister && <p className="mt-1 text-sm text-red-500">{errors.commercialRegister.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">رقم السجل الضريبي (إلزامي)</label>
          <input {...register('taxNumber')} className="input-pro mt-1" dir="ltr" />
          {errors.taxNumber && <p className="mt-1 text-sm text-red-500">{errors.taxNumber.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">صورة الهوية / السجل التجاري (إلزامي للموافقة)</label>
          <input type="file" accept="image/*,.pdf" className="input-pro mt-1 file-input" />
          {/* File validation handled server-side */}
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('termsAccepted')} />
            أوافق على شروط الخدمة والخصوصية، وأفهم أن الحساب يتطلب موافقة التحقق
          </label>
          {errors.termsAccepted && <p className="mt-1 text-sm text-red-500">{errors.termsAccepted.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-app">كلمة المرور</label>
          <input {...register('password')} type="password" className="input-pro mt-1" dir="ltr" />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-app">تأكيد كلمة المرور</label>
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
