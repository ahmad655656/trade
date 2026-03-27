'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { registerSchema } from '@/lib/validation'
import toast from 'react-hot-toast'
import { useUi } from '@/components/providers/UiProvider'

type FormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, language } = useUi()
  const [isLoading, setIsLoading] = useState(false)

  const initialRole = useMemo(() => {
    const role = searchParams.get('role')
    return role === 'SUPPLIER' ? 'SUPPLIER' : 'TRADER'
  }, [searchParams])

  const {
    register,
    watch,
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
          ? 'طھظ… ط¥ط±ط³ط§ظ„ ط·ظ„ط¨ ط§ظ„طھط³ط¬ظٹظ„. ط³ظٹطµظ„ظƒ ط¨ط±ظٹط¯ ط¹ظ†ط¯ ط§ظ„ظ…ظˆط§ظپظ‚ط©.'
          : 'Registration submitted. You will receive an email once approved.',
      )
      router.push('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'ظپط´ظ„' : 'Failed')
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
          <label className="block text-sm font-medium text-app">ظ†ظˆط¹ ط§ظ„ط­ط³ط§ط¨</label>
          <select {...register('role')} className="input-pro mt-1">
            <option value="TRADER">طھط§ط¬ط±</option>
            <option value="SUPPLIER">ظ…ظˆط±ط¯</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-app">ط§ظ„ط§ط³ظ… ط§ظ„ظƒط§ظ…ظ„</label>
          <input {...register('name')} className="input-pro mt-1" />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-app">ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ (ط¥ظ„ط²ط§ظ…ظٹ ظ„ظ„طھط­ظ‚ظ‚)</label>
          <input {...register('phone')} className="input-pro mt-1" dir="ltr" />
          {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ</label>
          <input {...register('email')} type="email" className="input-pro mt-1" dir="ltr" />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">ط§ط³ظ… ط§ظ„ط´ط±ظƒط© / ط§ظ„ظ…طھط¬ط± (ط¥ظ„ط²ط§ظ…ظٹ ظ„ظ„طھط­ظ‚ظ‚)</label>
          <input {...register('companyName')} className="input-pro mt-1" />
          {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">ط§ظ„ط³ط¬ظ„ ط§ظ„طھط¬ط§ط±ظٹ / ط§ظ„ط±ظ‚ظ… ط§ظ„ط¶ط±ظٹط¨ظٹ (ط¥ظ„ط²ط§ظ…ظٹ)</label>
          <input {...register('commercialRegister')} className="input-pro mt-1" />
          {errors.commercialRegister && <p className="mt-1 text-sm text-red-500">{errors.commercialRegister.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">ط±ظ‚ظ… ط§ظ„ط³ط¬ظ„ ط§ظ„ط¶ط±ظٹط¨ظٹ (ط¥ظ„ط²ط§ظ…ظٹ)</label>
          <input {...register('taxNumber')} className="input-pro mt-1" dir="ltr" />
          {errors.taxNumber && <p className="mt-1 text-sm text-red-500">{errors.taxNumber.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-app">طµظˆط±ط© ط§ظ„ظ‡ظˆظٹط© / ط§ظ„ط³ط¬ظ„ ط§ظ„طھط¬ط§ط±ظٹ (ط¥ظ„ط²ط§ظ…ظٹ ظ„ظ„ظ…ظˆط§ظپظ‚ط©)</label>
          <input type="file" accept="image/*,.pdf" className="input-pro mt-1 file-input" />
          {/* File validation handled server-side */}
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('termsAccepted')} />
            ط£ظˆط§ظپظ‚ ط¹ظ„ظ‰ ط´ط±ظˆط· ط§ظ„ط®ط¯ظ…ط© ظˆط§ظ„ط®طµظˆطµظٹط©طŒ ظˆط£ظپظ‡ظ… ط£ظ† ط§ظ„ط­ط³ط§ط¨ ظٹطھط·ظ„ط¨ ظ…ظˆط§ظپظ‚ط© ط§ظ„طھط­ظ‚ظ‚
          </label>
          {errors.termsAccepted && <p className="mt-1 text-sm text-red-500">{errors.termsAccepted.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-app">ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±</label>
          <input {...register('password')} type="password" className="input-pro mt-1" dir="ltr" />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-app">طھط£ظƒظٹط¯ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±</label>
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

