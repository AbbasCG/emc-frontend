import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { forgotPassword } from '@/api/authApi'
import { getApiErrorMessage } from '@/api/apiErrors'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-slate-50 pt-20">
      <PageHeader
        title="نسيت كلمة المرور"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'تسجيل الدخول', href: '/login' },
          { label: 'نسيت كلمة المرور' },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-md rounded-2xl bg-white p-8 text-right shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {sent ? (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto text-emerald-500" size={52} />
              <h2 className="mt-5 text-xl font-black text-deepBlue">تم إرسال الرابط</h2>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
                إذا كان البريد مرتبطاً بحساب، ستصلك رسالة تحتوي رابط إعادة التعيين خلال دقائق.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-2 text-sm font-black text-customBlue hover:text-customOrange"
              >
                <ArrowRight size={15} />
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-deepBlue">نسيت كلمة المرور؟</h1>
              <span className="mt-3 block h-1 w-16 rounded-full bg-customOrange" />
              <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-500">
                أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.
              </p>

              {error && (
                <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 grid gap-5" noValidate>
                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  البريد الإلكتروني
                  <span className="relative block">
                    <Mail
                      size={20}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      جارٍ الإرسال...
                    </>
                  ) : (
                    'إرسال رابط التعيين'
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
            </>
          )}
        </motion.div>
      </section>
    </div>
  )
}
