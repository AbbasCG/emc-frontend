import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, LockKeyhole, LogIn, Mail } from 'lucide-react'
import PageHeader from '../components/PageHeader'

export default function Login() {
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('تم تسجيل الدخول بنجاح.')
  }

  return (
    <main className="bg-slate-50 pt-20">
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

          <div className="p-6 text-right sm:p-10">
            <h1 className="text-3xl font-black text-deepBlue">تسجيل الدخول</h1>
            <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />

            {message && (
              <div className="mt-6 flex items-start gap-3 rounded-xl bg-sky-50 p-4 text-customBlue ring-1 ring-sky-100">
                <CheckCircle2 size={22} className="mt-1 shrink-0" />
                <p className="font-bold">{message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
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
                    className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </span>
              </label>

              <Link to="#" className="text-sm font-black text-customBlue transition hover:text-customOrange">
                نسيت كلمة المرور؟
              </Link>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.03 }}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-customOrange px-7 font-extrabold text-white shadow-lg shadow-orange-100"
              >
                <LogIn size={20} />
                تسجيل الدخول
              </motion.button>
            </form>

            <p className="mt-7 text-center text-sm font-bold text-slate-500">
              ليس لديك حساب؟{' '}
              <Link to="/courses" className="text-customBlue transition hover:text-customOrange">
                سجل الآن
              </Link>
            </p>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
