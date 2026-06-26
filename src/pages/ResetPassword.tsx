import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, LockKeyhole } from 'lucide-react'
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
      <div className="bg-paper pt-20">
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md rounded-3xl bg-white p-10 text-center shadow-emc-lg ring-1 ring-line">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100">
              <AlertCircle size={34} />
            </span>
            <p className="mt-6 text-lg font-black text-deepBlue">رابط إعادة التعيين غير صالح أو منتهي الصلاحية.</p>
            <Link
              to="/forgot-password"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-6 py-3 font-extrabold text-white shadow-emc-md transition duration-250 ease-emc hover:brightness-[1.03]"
            >
              طلب رابط جديد
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="bg-paper pt-20">
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
          className="mx-auto max-w-md rounded-3xl bg-white p-8 text-right shadow-emc-lg ring-1 ring-line sm:p-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="emc-wing emc-eyebrow-accent mb-4">
            <LockKeyhole size={15} />
            أمان الحساب
          </span>
          <h1 className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue">إعادة تعيين كلمة المرور</h1>

          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-700 ring-1 ring-red-100">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 grid gap-5" noValidate>
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
                  className="emc-focus-ring h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
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
                  className="emc-focus-ring h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </span>
            </label>

            <motion.button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              whileHover={!isLoading ? { scale: 1.02 } : undefined}
              className="emc-focus-ring inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-customOrange font-extrabold text-white shadow-emc-md transition duration-250 ease-emc hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-70"
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
              className="flex items-center justify-center gap-1 text-sm font-black text-slate-500 transition hover:text-customBlue"
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
