'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'

const schema = (language: 'ar' | 'en') =>
  z
    .object({
      name: z
        .string()
        .min(2, language === 'ar' ? 'الاسم يجب أن يكون حرفين على الأقل' : 'Name must be at least 2 characters'),
      email: z.string().email(language === 'ar' ? 'أدخل بريدًا إلكترونيًا صحيحًا' : 'Enter a valid email'),
      phone: z.string().optional(),
      role: z.enum(['TRADER', 'SUPPLIER']),
      companyName: z.string().optional(),
      password: z
        .string()
        .min(8, language === 'ar' ? 'الحد الأدنى 8 أحرف' : 'Minimum 8 characters')
        .regex(/[A-Z]/, language === 'ar' ? 'يجب إدخال حرف كبير واحد على الأقل' : 'Include at least one uppercase letter')
        .regex(/[a-z]/, language === 'ar' ? 'يجب إدخال حرف صغير واحد على الأقل' : 'Include at least one lowercase letter')
        .regex(/[0-9]/, language === 'ar' ? 'يجب إدخال رقم واحد على الأقل' : 'Include at least one number')
        .regex(/[^A-Za-z0-9]/, language === 'ar' ? 'يجب إدخال رمز خاص واحد على الأقل' : 'Include at least one special character'),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: language === 'ar' ? 'تأكيد كلمة المرور غير مطابق' : 'Password confirmation does not match',
      path: ['confirmPassword'],
    })

type FormValues = z.infer<ReturnType<typeof schema>>

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
    resolver: zodResolver(schema(language)),
    defaultValues: {
      role: 'TRADER',
    },
  })

  const selectedRole = watch('role')

  const onSubmit = async (payload: FormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error ?? 'Registration failed')
      }

      toast.success(language === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully')
      if (result.data.user.role === 'SUPPLIER') router.push('/dashboard/supplier')
      else router.push('/dashboard/trader')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل إنشاء الحساب' : 'Registration failed')
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
          <label className="block text-sm font-medium text-app">{t('register.accountType')}</label>
          <select {...register('role')} className="input-pro mt-1">
            <option value="TRADER">{t('register.trader')}</option>
            <option value="SUPPLIER">{t('register.supplier')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-app">{t('register.name')}</label>
          <input {...register('name')} className="input-pro mt-1" />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-app">{t('register.phone')}</label>
          <input {...register('phone')} className="input-pro mt-1" dir="ltr" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">{t('register.email')}</label>
          <input {...register('email')} type="email" className="input-pro mt-1" dir="ltr" />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
        </div>

        {selectedRole === 'SUPPLIER' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-app">{t('register.company')}</label>
            <input {...register('companyName')} className="input-pro mt-1" />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-app">{t('register.password')}</label>
          <input {...register('password')} type="password" className="input-pro mt-1" dir="ltr" />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-app">{t('register.confirmPassword')}</label>
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

