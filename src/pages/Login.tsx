import { useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { motion } from 'framer-motion'
import { AlertCircle, Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import toast from '@/lib/toast'
import { getApiErrorMessage } from '@/api/apiErrors'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../contexts/AuthContext'
import { getPostLoginRedirect } from '@/utils/dashboardAccess'

function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect to the page the user originally tried to visit, or dashboard
  const [searchParams, setSearchParams] = useSearchParams()

  const stateFrom = (location.state as { from?: string } | null)?.from
  const from =
    safeInternalPath(searchParams.get('redirect')) ??
    safeInternalPath(searchParams.get('next')) ??
    safeInternalPath(stateFrom) ??
    '/dashboard'

  const signupHref =
    from !== '/dashboard' ?
      `/signup?redirect=${encodeURIComponent(from)}`
    : '/signup'

  useEffect(() => {
    const reason = searchParams.get('reason')
    if (!reason) return

    const MESSAGES: Record<string, { msg: string; kind: 'warning' | 'error' }> = {
      session:              { msg: t('auth.login.reasons.session'), kind: 'warning' },
      suspended:            { msg: t('auth.login.reasons.suspended'), kind: 'error' },
      impersonation_expired:{ msg: t('auth.login.reasons.impersonationExpired'), kind: 'warning' },
      reset_success:        { msg: t('auth.login.reasons.resetSuccess'), kind: 'warning' },
    }

    const entry = MESSAGES[reason]
    if (!entry) return
    if (entry.kind === 'error') toast.error(entry.msg)
    else toast.warning(entry.msg)

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('reason')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams, t])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        const msg = (err.response.data as { message?: string } | undefined)?.message ?? ''
        if (msg === 'Account is suspended.' || msg.toLowerCase().includes('suspended')) {
          setError(t('auth.login.reasons.suspended'))
          return
        }
      }
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-paper pt-20">
      <PageHeader
        title={t('auth.login.title')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('auth.login.breadcrumbCurrent') },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-emc-lg ring-1 ring-line lg:grid-cols-[0.9fr_1fr]"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          {/* ── Left panel — decorative ── */}
          <div className="relative min-h-80 overflow-hidden bg-deepBlue lg:min-h-[560px]">
            <img
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85"
              alt=""
              className="h-full w-full object-cover opacity-80"
            />
            <div className="emc-dawn absolute inset-0 opacity-90 mix-blend-multiply" />
            <div className="emc-dawn-field absolute inset-0 opacity-70" />
            <div className="absolute bottom-8 right-8 max-w-sm text-right text-white">
              <span className="emc-eyebrow mb-4 border-white/25 bg-white/10 text-ice">
                <LogIn size={15} />
                {t('auth.login.side.eyebrow')}
              </span>
              <h2 className="font-display text-3xl font-black leading-tight tracking-tight">{t('auth.login.side.title')}</h2>
              <p className="mt-3 leading-8 text-ice/90">
                {t('auth.login.side.body')}
              </p>
            </div>
          </div>

          {/* ── Right panel — form ── */}
          <div className="p-6 text-right sm:p-10">
            <h1 className="emc-title-arc font-display text-3xl font-black tracking-tight text-deepBlue">{t('auth.login.title')}</h1>

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
                {t('auth.login.form.email')}
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
                {t('auth.login.form.password')}
                <span className="relative block">
                  <LockKeyhole
                    size={20}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    id="login-password"
                    aria-invalid={error ? true : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="emc-focus-ring h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-12 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? t('auth.login.form.hidePassword') : t('auth.login.form.showPassword')}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-deepBlue"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                  </button>
                </span>
              </label>

              <Link
                to="/forgot-password"
                className="text-right text-sm font-black text-customBlue hover:text-accent-700"
              >
                {t('auth.login.form.forgot')}
              </Link>

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
                    {t('auth.login.form.submitting')}
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    {t('auth.login.form.submit')}
                  </>
                )}
              </motion.button>
            </form>

            <p className="mt-7 text-center text-sm font-bold text-slate-500">
              {t('auth.login.noAccount')}{' '}
              <Link to={signupHref} className="text-customBlue transition hover:text-accent-700">
                {t('auth.login.signupLink')}
              </Link>
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
