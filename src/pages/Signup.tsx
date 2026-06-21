import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, ChevronDown, LockKeyhole, Mail, MapPin, Phone, UserPlus, UserRound } from 'lucide-react'
import { getApiErrorMessage, getLaravelFieldErrors } from '@/api/apiErrors'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../contexts/AuthContext'
import { safeEnrollmentRedirect } from '@/utils/enrollmentRedirect'
import CountrySelector, { type Country } from '../components/ui/CountrySelector'

export default function Signup() {
  const { registerAccount } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = safeEnrollmentRedirect(searchParams.get('redirect'))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [localPhone, setLocalPhone] = useState('')
  const [city, setCity] = useState('')
  const [gender, setGender] = useState('')
  const [howHeard, setHowHeard] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function clearField(key: string) {
    setFieldErrors((p) => ({ ...p, [key]: '' }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'الاسم الكامل مطلوب'
    if (!email.trim()) newErrors.email = 'البريد الإلكتروني مطلوب'
    if (!password) newErrors.password = 'كلمة المرور مطلوبة'
    if (!passwordConfirmation) newErrors.password_confirmation = 'تأكيد كلمة المرور مطلوب'
    if (!selectedCountry) newErrors.country_code = 'يرجى اختيار الدولة'
    if (!localPhone.trim()) newErrors.phone = 'رقم الجوال مطلوب'
    if (!city.trim()) newErrors.city = 'المدينة مطلوبة'
    if (!gender) newErrors.gender = 'الجنس مطلوب'

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors)
      return
    }

    setFieldErrors({})
    setIsLoading(true)

    try {
      const phone = `${selectedCountry!.dialCode}${localPhone.trim()}`
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
        country_code: selectedCountry!.code,
        phone_country_code: selectedCountry!.dialCode,
        phone,
        city: city.trim(),
        gender,
        ...(howHeard.trim() ? { how_did_you_hear_about_us: howHeard.trim() } : {}),
      }

      if (import.meta.env.DEV) {
        console.log('[DEV] REGISTER PAYLOAD', { ...payload, password: '***', password_confirmation: '***' })
      }

      await registerAccount(payload)
      navigate(redirectTo ?? '/dashboard', { replace: true })
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        console.log('[DEV] REGISTER ERROR', err)
      }
      const fields = getLaravelFieldErrors(err)
      if (Object.keys(fields).length > 0) {
        setFieldErrors(fields)
      } else {
        setError(getApiErrorMessage(err))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const inputCls = (field: string) =>
    `h-14 w-full rounded-xl border bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${fieldErrors[field] ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-customBlue'}`

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
              {/* الاسم الكامل */}
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                الاسم الكامل
                <span className="relative block">
                  <UserRound size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearField('name') }}
                    className={inputCls('name')}
                  />
                </span>
                {fieldErrors.name && <p className="text-xs font-semibold text-red-600">{fieldErrors.name}</p>}
              </label>

              {/* البريد الإلكتروني */}
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                البريد الإلكتروني
                <span className="relative block">
                  <Mail size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearField('email') }}
                    className={inputCls('email')}
                  />
                </span>
                {fieldErrors.email && <p className="text-xs font-semibold text-red-600">{fieldErrors.email}</p>}
              </label>

              {/* كلمة المرور */}
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                كلمة المرور
                <span className="relative block">
                  <LockKeyhole size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearField('password') }}
                    className={inputCls('password')}
                  />
                </span>
                {fieldErrors.password && <p className="text-xs font-semibold text-red-600">{fieldErrors.password}</p>}
              </label>

              {/* تأكيد كلمة المرور */}
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                تأكيد كلمة المرور
                <span className="relative block">
                  <LockKeyhole size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={passwordConfirmation}
                    onChange={(e) => { setPasswordConfirmation(e.target.value); clearField('password_confirmation') }}
                    className={inputCls('password_confirmation')}
                  />
                </span>
                {fieldErrors.password_confirmation && <p className="text-xs font-semibold text-red-600">{fieldErrors.password_confirmation}</p>}
              </label>

              {/* الدولة */}
              <div className="grid gap-2 text-sm font-black text-deepBlue">
                الدولة
                <CountrySelector
                  value={selectedCountry}
                  onChange={(c) => { setSelectedCountry(c); clearField('country_code') }}
                  error={fieldErrors.country_code}
                />
                {fieldErrors.country_code && <p className="text-xs font-semibold text-red-600">{fieldErrors.country_code}</p>}
              </div>

              {/* رقم الجوال */}
              <div className="grid gap-2 text-sm font-black text-deepBlue">
                رقم الجوال
                <div
                  dir="ltr"
                  className={`flex h-14 w-full overflow-hidden rounded-xl border bg-slate-50 transition focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100 ${fieldErrors.phone ? 'border-red-400' : 'border-slate-200 focus-within:border-customBlue'}`}
                >
                  <div className="flex shrink-0 items-center gap-1.5 border-r border-slate-200 bg-slate-100 px-3 text-sm font-bold text-deepBlue">
                    {selectedCountry ? (
                      <>
                        <span className="text-base leading-none">{selectedCountry.flag}</span>
                        <span>{selectedCountry.dialCode}</span>
                      </>
                    ) : (
                      <Phone size={18} className="text-slate-400" />
                    )}
                  </div>
                  <input
                    type="tel"
                    dir="ltr"
                    value={localPhone}
                    onChange={(e) => { setLocalPhone(e.target.value); clearField('phone') }}
                    placeholder="000 000 0000"
                    className="min-w-0 flex-1 bg-transparent px-4 text-left font-semibold text-deepBlue outline-none placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                {fieldErrors.phone && <p className="text-xs font-semibold text-red-600">{fieldErrors.phone}</p>}
              </div>

              {/* المدينة + الجنس */}
              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  المدينة
                  <span className="relative block">
                    <MapPin size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={city}
                      onChange={(e) => { setCity(e.target.value); clearField('city') }}
                      className={inputCls('city')}
                    />
                  </span>
                  {fieldErrors.city && <p className="text-xs font-semibold text-red-600">{fieldErrors.city}</p>}
                </label>

                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  الجنس
                  <span className="relative block">
                    <ChevronDown size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={gender}
                      onChange={(e) => { setGender(e.target.value); clearField('gender') }}
                      className={`h-14 w-full cursor-pointer appearance-none rounded-xl border bg-slate-50 px-4 pl-10 text-right font-semibold outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${fieldErrors.gender ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-customBlue'} ${gender ? 'text-deepBlue' : 'text-slate-400'}`}
                    >
                      <option value="" disabled>اختر الجنس</option>
                      <option value="male" className="text-deepBlue">ذكر</option>
                      <option value="female" className="text-deepBlue">أنثى</option>
                    </select>
                  </span>
                  {fieldErrors.gender && <p className="text-xs font-semibold text-red-600">{fieldErrors.gender}</p>}
                </label>
              </div>

              {/* كيف عرفت عنا؟ */}
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                كيف عرفت عنا؟ <span className="font-semibold text-slate-400">(اختياري)</span>
                <span className="relative block">
                  <ChevronDown size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={howHeard}
                    onChange={(e) => setHowHeard(e.target.value)}
                    className={`h-14 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pl-10 text-right font-semibold outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100 ${howHeard ? 'text-deepBlue' : 'text-slate-400'}`}
                  >
                    <option value="">اختر...</option>
                    <option value="صديق أو قريب">صديق أو قريب</option>
                    <option value="وسائل التواصل الاجتماعي">وسائل التواصل الاجتماعي</option>
                    <option value="إعلان">إعلان</option>
                    <option value="فعالية أو ورشة">فعالية أو ورشة</option>
                    <option value="بحث Google">بحث Google</option>
                    <option value="طالب سابق">طالب سابق</option>
                    <option value="شريك أو مؤسسة">شريك أو مؤسسة</option>
                    <option value="أخرى">أخرى</option>
                  </select>
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
              <Link
                to={
                  redirectTo ?
                    `/login?next=${encodeURIComponent(redirectTo)}`
                  : '/login'
                }
                className="text-customBlue transition hover:text-accent-700"
              >
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
