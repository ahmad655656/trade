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
  z.object({
    email: z.string().email(language === 'ar' ? 'أدخل بريدًا إلكترونيًا صحيحًا' : 'Enter a valid email'),
    password: z.string().min(1, language === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required'),
  })

type FormValues = z.infer<ReturnType<typeof schema>>

export default function LoginPage() {
  const router = useRouter()
  const { t, language } = useUi()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema(language)),
  })

  const onSubmit = async (payload: FormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
// Removed verification error handling - all accounts auto-active

        throw new Error(result.error ?? 'Login failed')
      }

      toast.success(language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login successful')

      const role = result.data.user.role
      if (role === 'ADMIN') router.push('/dashboard/admin')
      else if (role === 'SUPPLIER') router.push('/supplier')
      else router.push('/trader')

      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card-pro mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold text-app">{t('login.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('login.subtitle')}</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm font-medium text-app">{t('login.email')}</label>
          <input {...register('email')} type="email" className="input-pro mt-1" dir="ltr" />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-app">{t('login.password')}</label>
          <input {...register('password')} type="password" className="input-pro mt-1" dir="ltr" />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full disabled:opacity-60">
          {isLoading ? t('login.submitting') : t('login.submit')}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        {t('login.noAccount')}{' '}
        <Link href="/register" className="font-semibold text-blue-500 hover:underline">
          {t('login.create')}
        </Link>
      </p>
    </div>
  )
}
