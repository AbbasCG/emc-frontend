import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, CheckCircle2, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import PublicSeo from '@/components/public/PublicSeo'
import { forgotPassword } from '@/api/authApi'
import { getApiErrorMessage } from '@/api/apiErrors'

export default function ForgotPassword() {
  const { t } = useTranslation()
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
    <div className="bg-paper pt-20">
      <PublicSeo
        title="استعادة كلمة المرور"
        description="أدخل بريدك الإلكتروني المسجّل في مركز ماستر التعليمي لنرسل لك رابط إعادة تعيين كلمة المرور واستعادة الوصول إلى حسابك بأمان."
        path="/forgot-password"
        noIndex
      />
      <PageHeader
        title={t('auth.forgot.title')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('auth.login.breadcrumbCurrent'), href: '/login' },
          { label: t('auth.forgot.breadcrumbCurrent') },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-md rounded-3xl bg-white p-8 text-right shadow-emc-lg ring-1 ring-line sm:p-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {sent ? (
            <div className="py-4 text-center">
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100">
                <CheckCircle2 size={46} />
              </span>
              <h2 className="emc-title-arc mt-6 inline-block font-display text-2xl font-black tracking-tight text-deepBlue">{t('auth.forgot.success.title')}</h2>
              <p className="mt-4 text-sm font-semibold leading-8 text-slate-600">
                {t('auth.forgot.success.body')}
              </p>
              <Link
                to="/login"
                className="mt-7 inline-flex items-center gap-2 text-sm font-black text-customBlue transition hover:text-accent-700"
              >
                <ArrowRight size={15} />
                {t('auth.forgot.backToLogin')}
              </Link>
            </div>
          ) : (
            <>
              <span className="emc-eyebrow-accent mb-4">
                <Mail size={15} />
                {t('auth.forgot.eyebrow')}
              </span>
              <h1 className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue">{t('auth.forgot.heading')}</h1>
              <p className="mt-4 text-sm font-semibold leading-8 text-slate-500">
                {t('auth.forgot.intro')}
              </p>

              {error && (
                <div className="mt-5 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-700 ring-1 ring-red-100">
                  <AlertCircle size={20} className="mt-0.5 shrink-0" />
                  <p className="text-sm font-bold">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 grid gap-5" noValidate>
                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  {t('auth.forgot.form.email')}
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
                      {t('auth.forgot.form.submitting')}
                    </>
                  ) : (
                    t('auth.forgot.form.submit')
                  )}
                </motion.button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1 text-sm font-black text-slate-500 transition hover:text-customBlue"
                >
                  <ArrowRight size={14} />
                  {t('auth.forgot.backToLogin')}
                </Link>
              </form>
            </>
          )}
        </motion.div>
      </section>
    </div>
  )
}
