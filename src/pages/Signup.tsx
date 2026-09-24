import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { motion } from 'framer-motion'
import { AlertCircle, ChevronDown, LockKeyhole, Mail, MapPin, UserPlus, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiErrorMessage, getLaravelFieldErrors } from '@/api/apiErrors'
import PageHeader from '../components/PageHeader'
import PublicSeo from '@/components/public/PublicSeo'
import { useAuth } from '../contexts/AuthContext'
import { safeEnrollmentRedirect } from '@/utils/enrollmentRedirect'
import CountrySelector, { type Country, COUNTRIES } from '../components/ui/CountrySelector'
import { countryFromPhone } from '@/lib/countryFromPhone'
import PhoneInput from '@/components/forms/PhoneInput'
import { buildE164Phone } from '@/components/forms/phoneUtils'

export default function Signup() {
  const { t } = useTranslation()
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

  function setFieldError(key: string, message: string) {
    setFieldErrors((p) => ({ ...p, [key]: message }))
  }

  // Auto-fill the country from the phone number on blur — only when no country
  // is selected yet. Keeps the Country field fully visible/selectable.
  function autofillCountryFromPhone() {
    if (selectedCountry) return
    const raw = localPhone.trim()
    if (!raw) return
    const candidate = raw.startsWith('+') ? raw : `+${raw}`
    const iso = countryFromPhone(candidate)
    if (!iso) return
    const match = COUNTRIES.find((c) => c.code === iso)
    if (match) {
      setSelectedCountry(match)
      clearField('country_code')
    }
  }

  // Instant per-field validation on blur, mirroring VolunteerApply's per-field display.
  function validateEmailField() {
    const value = email.trim()
    if (!value) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) setFieldError('email', t('auth.signup.validation.emailInvalid'))
  }

  function validatePasswordField() {
    if (!password) return
    if (password.length < 8) setFieldError('password', t('auth.signup.validation.passwordMin'))
  }

  function validatePasswordConfirmationField() {
    if (!passwordConfirmation) return
    if (passwordConfirmation !== password) setFieldError('password_confirmation', t('auth.signup.validation.passwordMismatch'))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = t('auth.signup.validation.nameRequired')
    if (!email.trim()) newErrors.email = t('auth.signup.validation.emailRequired')
    if (!password) newErrors.password = t('auth.signup.validation.passwordRequired')
    if (!passwordConfirmation) newErrors.password_confirmation = t('auth.signup.validation.passwordConfirmationRequired')
    if (!selectedCountry) newErrors.country_code = t('auth.signup.validation.countryRequired')
    if (!localPhone.trim()) newErrors.phone = t('auth.signup.validation.phoneRequired')
    if (!city.trim()) newErrors.city = t('auth.signup.validation.cityRequired')
    if (!gender) newErrors.gender = t('auth.signup.validation.genderRequired')

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors)
      return
    }

    setFieldErrors({})
    setIsLoading(true)

    try {
      const phone = buildE164Phone(selectedCountry, localPhone)
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
    `emc-focus-ring h-14 w-full rounded-xl border bg-paper2 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-brand-100 ${fieldErrors[field] ? 'border-red-400 focus:border-red-400' : 'border-line focus:border-customBlue'}`

  return (
    <div className="bg-paper pt-20">
      <PublicSeo
        title="إنشاء حساب جديد"
        description="أنشئ حسابك في مركز ماستر التعليمي خلال دقائق لتتمكن من التسجيل في الدورات والورش التدريبية ومتابعة تقدمك التعليمي بسهولة."
        path="/signup"
      />
      <PageHeader
        title={t('auth.signup.title')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('auth.signup.breadcrumbCurrent') },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-emc-lg ring-1 ring-line lg:grid-cols-[1fr_0.95fr]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="emc-dawn relative hidden min-h-[420px] overflow-hidden lg:block">
            <div className="emc-dawn-field absolute inset-0 opacity-70" />
            <div className="relative flex h-full flex-col justify-end p-10 text-white">
              <span className="emc-eyebrow mb-4 border-white/25 bg-white/10 text-ice">
                <UserPlus size={15} />
                {t('auth.signup.side.eyebrow')}
              </span>
              <h2 className="font-display text-3xl font-black leading-tight tracking-tight">{t('auth.signup.side.title')}</h2>
              <p className="mt-5 max-w-md text-sm leading-8 text-ice/90">
                {t('auth.signup.side.body')}
              </p>
            </div>
          </div>

          <div className="p-6 text-right sm:p-10">
            <h1 className="emc-title-arc font-display text-3xl font-black tracking-tight text-deepBlue">{t('auth.signup.heading')}</h1>

            {error && (
              <div className="mt-7 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-700 ring-1 ring-red-100">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-9 grid gap-6">
              {/* الاسم الكامل */}
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                {t('auth.signup.form.name')}
                <span className="relative block">
                  <UserRound size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-400" />
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
                {t('auth.signup.form.email')}
                <span className="relative block">
                  <Mail size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-400" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearField('email') }}
                    onBlur={validateEmailField}
                    className={inputCls('email')}
                  />
                </span>
                {fieldErrors.email && <p className="text-xs font-semibold text-red-600">{fieldErrors.email}</p>}
              </label>

              {/* كلمة المرور */}
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                {t('auth.signup.form.password')}
                <span className="relative block">
                  <LockKeyhole size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-400" />
                  <input
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearField('password') }}
                    onBlur={validatePasswordField}
                    className={inputCls('password')}
                  />
                </span>
                {fieldErrors.password && <p className="text-xs font-semibold text-red-600">{fieldErrors.password}</p>}
              </label>

              {/* تأكيد كلمة المرور */}
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                {t('auth.signup.form.passwordConfirmation')}
                <span className="relative block">
                  <LockKeyhole size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-400" />
                  <input
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={passwordConfirmation}
                    onChange={(e) => { setPasswordConfirmation(e.target.value); clearField('password_confirmation') }}
                    onBlur={validatePasswordConfirmationField}
                    className={inputCls('password_confirmation')}
                  />
                </span>
                {fieldErrors.password_confirmation && <p className="text-xs font-semibold text-red-600">{fieldErrors.password_confirmation}</p>}
              </label>

              {/* الدولة */}
              <div className="grid gap-2 text-sm font-black text-deepBlue">
                {t('auth.signup.form.country')}
                <CountrySelector
                  value={selectedCountry}
                  onChange={(c) => { setSelectedCountry(c); clearField('country_code') }}
                  error={fieldErrors.country_code}
                />
                {fieldErrors.country_code && <p className="text-xs font-semibold text-red-600">{fieldErrors.country_code}</p>}
              </div>

              {/* رقم الجوال */}
              <div className="grid gap-2 text-sm font-black text-deepBlue">
                {t('auth.signup.form.phone')}
                {/* onBlur on the wrapper (React focusout) keeps our country auto-fill
                    while the team's shared PhoneInput owns the field itself. */}
                <div onBlur={autofillCountryFromPhone}>
                  <PhoneInput
                    country={selectedCountry}
                    value={localPhone}
                    onChange={(v) => { setLocalPhone(v); clearField('phone') }}
                    error={fieldErrors.phone}
                    placeholder={t('auth.signup.form.phonePlaceholder')}
                  />
                </div>
                {fieldErrors.phone && <p className="text-xs font-semibold text-red-600">{fieldErrors.phone}</p>}
              </div>

              {/* المدينة + الجنس */}
              <div className="grid grid-cols-2 gap-5">
                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  {t('auth.signup.form.city')}
                  <span className="relative block">
                    <MapPin size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-400" />
                    <input
                      value={city}
                      onChange={(e) => { setCity(e.target.value); clearField('city') }}
                      className={inputCls('city')}
                    />
                  </span>
                  {fieldErrors.city && <p className="text-xs font-semibold text-red-600">{fieldErrors.city}</p>}
                </label>

                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  {t('auth.signup.form.gender')}
                  <span className="relative block">
                    <ChevronDown size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-400" />
                    <select
                      value={gender}
                      onChange={(e) => { setGender(e.target.value); clearField('gender') }}
                      className={`h-14 w-full cursor-pointer appearance-none rounded-xl border bg-paper2 px-4 pl-10 text-right font-semibold outline-none transition focus:bg-white focus:ring-4 focus:ring-brand-100 ${fieldErrors.gender ? 'border-red-400 focus:border-red-400' : 'border-line focus:border-customBlue'} ${gender ? 'text-deepBlue' : 'text-muted-400'}`}
                    >
                      <option value="" disabled>{t('auth.signup.form.genderPlaceholder')}</option>
                      <option value="male" className="text-deepBlue">{t('auth.signup.form.genderMale')}</option>
                      <option value="female" className="text-deepBlue">{t('auth.signup.form.genderFemale')}</option>
                    </select>
                  </span>
                  {fieldErrors.gender && <p className="text-xs font-semibold text-red-600">{fieldErrors.gender}</p>}
                </label>
              </div>

              {/* كيف عرفت عنا؟ */}
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                {t('auth.signup.form.howHeard')} <span className="font-semibold text-muted-400">{t('auth.signup.form.optional')}</span>
                <span className="relative block">
                  <ChevronDown size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-400" />
                  <select
                    value={howHeard}
                    onChange={(e) => setHowHeard(e.target.value)}
                    className={`h-14 w-full cursor-pointer appearance-none rounded-xl border border-line bg-paper2 px-4 pl-10 text-right font-semibold outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-brand-100 ${howHeard ? 'text-deepBlue' : 'text-muted-400'}`}
                  >
                    {/* NOTE: option VALUES stay as the Arabic literals they are the API
                        payload (how_did_you_hear_about_us); only the visible labels are translated. */}
                    <option value="">{t('auth.signup.form.howHeardPlaceholder')}</option>
                    <option value="صديق أو قريب">{t('auth.signup.howHeardOptions.friend')}</option>
                    <option value="وسائل التواصل الاجتماعي">{t('auth.signup.howHeardOptions.social')}</option>
                    <option value="إعلان">{t('auth.signup.howHeardOptions.ad')}</option>
                    <option value="فعالية أو ورشة">{t('auth.signup.howHeardOptions.event')}</option>
                    <option value="بحث Google">{t('auth.signup.howHeardOptions.google')}</option>
                    <option value="طالب سابق">{t('auth.signup.howHeardOptions.alumni')}</option>
                    <option value="شريك أو مؤسسة">{t('auth.signup.howHeardOptions.partner')}</option>
                    <option value="أخرى">{t('auth.signup.howHeardOptions.other')}</option>
                  </select>
                </span>
              </label>

              <motion.button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
                whileHover={!isLoading ? { scale: 1.02 } : undefined}
                className="emc-focus-ring inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-customOrange px-7 font-extrabold text-white shadow-emc-md transition duration-250 ease-emc hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <UserPlus size={20} />
                )}
                {isLoading ? t('auth.signup.form.submitting') : t('auth.signup.form.submit')}
              </motion.button>
            </form>

            <p className="mt-9 text-center text-sm font-bold text-muted-500">
              {t('auth.signup.haveAccount')}{' '}
              <Link
                to={
                  redirectTo ?
                    `/login?next=${encodeURIComponent(redirectTo)}`
                  : '/login'
                }
                className="text-customBlue transition hover:text-accent-700"
              >
                {t('auth.signup.loginLink')}
              </Link>
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
