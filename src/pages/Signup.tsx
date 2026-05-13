import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, LockKeyhole, Mail, UserPlus, UserRound } from 'lucide-react'
import { getApiErrorMessage } from '@/api/apiErrors'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../contexts/AuthContext'

export default function Signup() {
  const { registerAccount } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await registerAccount({ name, email, password, password_confirmation: passwordConfirmation })
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-slate-50 pt-20">
      <PageHeader
        title="إنشاء حساب"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'تسجيل جديد' },
        ]}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100 lg:grid-cols-[1fr_0.95fr]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative hidden min-h-[420px] bg-deepBlue lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(38,145,194,0.35),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(236,148,60,0.25),transparent_40%)]" />
            <div className="relative flex h-full flex-col justify-end p-10 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-customOrange">EMC OS</p>
              <h2 className="mt-3 text-3xl font-black leading-tight">انضم إلى منظومة EMC الرقمية</h2>
              <p className="mt-4 max-w-md text-sm leading-8 text-white/75">
                حساب واحد للوصول إلى لوحة الطالب، التسجيل في البرامج، ومتابعة نشاطك التعليمي.
              </p>
            </div>
          </div>

          <div className="p-6 text-right sm:p-10">
            <h1 className="text-3xl font-black text-deepBlue">إنشاء حساب جديد</h1>
            <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />

            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-700 ring-1 ring-red-100">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                الاسم الكامل
                <span className="relative block">
                  <UserRound
                    size={20}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </span>
              </label>

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

              <label className="grid gap-2 text-sm font-black text-deepBlue">
                كلمة المرور
                <span className="relative block">
                  <LockKeyhole
                    size={20}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
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
                    minLength={8}
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
                className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-customOrange px-7 font-extrabold text-white shadow-lg shadow-orange-100 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <UserPlus size={20} />
                )}
                {isLoading ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
              </motion.button>
            </form>

            <p className="mt-8 text-center text-sm font-bold text-slate-500">
              لديك حساب بالفعل؟{' '}
              <Link to="/login" className="text-customBlue transition hover:text-customOrange">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
