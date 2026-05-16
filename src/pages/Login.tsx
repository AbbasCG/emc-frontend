import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, LockKeyhole, LogIn, Mail } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/api/apiErrors'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../contexts/AuthContext'
import { getPostLoginRedirect } from '@/utils/dashboardAccess'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect to the page the user originally tried to visit, or dashboard
  const [searchParams, setSearchParams] = useSearchParams()

  function safeInternalPath(raw: string | null | undefined): string | null {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
    return raw
  }

  const stateFrom = (location.state as { from?: string } | null)?.from
  const from =
    safeInternalPath(searchParams.get('next')) ?? safeInternalPath(stateFrom) ?? '/dashboard'

  useEffect(() => {
    if (searchParams.get('reason') !== 'session') return
    toast.warning('انتهت الجلسة أو انقطع الاتصال. سجّل دخولك مجددًا.')
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('reason')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const payload = await login(email, password)
      navigate(getPostLoginRedirect(payload.user, from), { replace: true })
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-slate-50 pt-20">
      <PageHeader
        title="تسجيل الدخول"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'تسجيل الدخول' },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100 lg:grid-cols-[0.9fr_1fr]"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          {/* ── Left panel — decorative ── */}
          <div className="relative min-h-80 overflow-hidden bg-deepBlue lg:min-h-[560px]">
            <img
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85"
              alt=""
              className="h-full w-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-deepBlue/45" />
            <div className="absolute bottom-8 right-8 max-w-sm text-right text-white">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
                <LogIn size={17} />
                EMC للاستشارات والتدريب
              </span>
              <h2 className="text-3xl font-black leading-tight">مرحباً بعودتك</h2>
              <p className="mt-3 leading-8 text-slate-100">
                تابع رحلتك التعليمية وادخل إلى حسابك للوصول إلى دوراتك وطلبات التسجيل.
              </p>
            </div>
          </div>

          {/* ── Right panel — form ── */}
          <div className="p-6 text-right sm:p-10">
            <h1 className="text-3xl font-black text-deepBlue">تسجيل الدخول</h1>
            <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />

            {/* Error alert */}
            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-700 ring-1 ring-red-100">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 grid gap-5" noValidate>
              {/* Email */}
              <label htmlFor="login-email" className="grid gap-2 text-sm font-black text-deepBlue">
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
                    id="login-email"
                    aria-invalid={error ? true : undefined}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="emc-focus-ring h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </span>
              </label>

              {/* Password */}
              <label htmlFor="login-password" className="grid gap-2 text-sm font-black text-deepBlue">
                كلمة المرور
                <span className="relative block">
                  <LockKeyhole
                    size={20}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    id="login-password"
                    aria-invalid={error ? true : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="emc-focus-ring h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </span>
              </label>

              <button
                type="button"
                disabled
                title="قريبًا عبر الدعم أو لوحة الحساب"
                className="cursor-not-allowed text-right text-sm font-black text-slate-400"
              >
                نسيت كلمة المرور؟
              </button>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
                whileHover={!isLoading ? { scale: 1.03 } : undefined}
                className="emc-focus-ring inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-customOrange px-7 font-extrabold text-white shadow-lg shadow-orange-100 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    جارٍ تسجيل الدخول...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    تسجيل الدخول
                  </>
                )}
              </motion.button>
            </form>

            <p className="mt-7 text-center text-sm font-bold text-slate-500">
              ليس لديك حساب؟{' '}
              <Link to="/signup" className="text-customBlue transition hover:text-customOrange">
                أنشئ حساباً
              </Link>
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
