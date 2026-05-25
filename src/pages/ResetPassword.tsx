import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { resetPassword } from '@/api/authApi'
import { getApiErrorMessage } from '@/api/apiErrors'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== passwordConfirmation) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      await resetPassword({ token, email, password, password_confirmation: passwordConfirmation })
      navigate('/login?reason=reset_success', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="bg-slate-50 pt-20">
        <section className="px-4 py-32 text-center">
          <p className="text-lg font-black text-deepBlue">رابط إعادة التعيين غير صالح أو منتهي الصلاحية.</p>
          <Link
            to="/forgot-password"
            className="mt-5 block font-black text-customBlue hover:text-customOrange"
          >
            طلب رابط جديد
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 pt-20">
      <PageHeader
        title="إعادة تعيين كلمة المرور"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'تسجيل الدخول', href: '/login' },
          { label: 'إعادة تعيين كلمة المرور' },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-md rounded-2xl bg-white p-8 text-right shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <h1 className="text-2xl font-black text-deepBlue">إعادة تعيين كلمة المرور</h1>
          <span className="mt-3 block h-1 w-16 rounded-full bg-customOrange" />

          {error && (
            <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-5" noValidate>
            <label className="grid gap-2 text-sm font-black text-deepBlue">
              كلمة المرور الجديدة
              <span className="relative block">
                <LockKeyhole
                  size={20}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </span>
            </label>

            <label className="grid gap-2 text-sm font-black text-deepBlue">
              تأكيد كلمة المرور
              <span className="relative block">
                <LockKeyhole
                  size={20}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </span>
            </label>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={!isLoading ? { scale: 1.02 } : undefined}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-customOrange font-extrabold text-white shadow-lg shadow-orange-100 transition disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  جارٍ التغيير...
                </>
              ) : (
                'تعيين كلمة المرور'
              )}
            </motion.button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1 text-sm font-black text-slate-500 hover:text-customBlue"
            >
              <ArrowRight size={14} />
              العودة لتسجيل الدخول
            </Link>
          </form>
        </motion.div>
      </section>
    </div>
  )
}
