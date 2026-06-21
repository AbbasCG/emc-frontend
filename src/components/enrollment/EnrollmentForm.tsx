import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react'
import toast from '@/lib/toast'
import { submitCourseRegistration } from '@/api/registrationsApi'
import { fetchProfileUser, updateProfile } from '@/api/profileApi'
import { notifyStudentScopeRefresh } from '@/api/studentApi'
import { notifyNotificationsRefresh } from '@/api/notificationsApi'
import { useAuth } from '@/contexts/AuthContext'
import CountrySelector, { type Country, COUNTRIES } from '@/components/ui/CountrySelector'
import { countryFromPhone } from '@/lib/countryFromPhone'
import PaymentProviderSelector from '@/components/payments/PaymentProviderSelector'
import type { Course } from '@/types'
import type { PublicItemType } from '@/utils/publicCourseDisplay'
import { formatPrice } from '@/utils/course'
import {
  buildPublicLoginHref,
  isStudentUser,
  PUBLIC_ENROLL_STUDENT_ONLY_MSG,
} from '@/utils/publicEnrollAuth'

type PaymentProvider = 'stripe' | 'paypal' | 'fake'

type FieldErrors = Partial<
  Record<'full_name' | 'email' | 'phone' | 'city' | 'gender' | 'notes' | 'payment_provider' | 'country_code', string>
>

function normalizeLaravelErrors(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v)) out[k] = v.map(String)
    else if (v != null && v !== '') out[k] = [String(v)]
  }
  return out
}

function registrationLooksDuplicate(
  data: { message?: string; errors?: Record<string, string | string[]> } | undefined,
): boolean {
  if (!data) return false
  const msg = String(data.message ?? '').toLowerCase()
  if (msg.includes('already') || msg.includes('duplicate') || msg.includes('registered')) return true
  if (/مسجل|مكرر|بالفعل/u.test(String(data.message ?? ''))) return true
  const errs = data.errors
  if (!errs) return false
  const flat = Object.values(errs)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .map((x) => String(x).toLowerCase())
    .join(' ')
  return flat.includes('already') || flat.includes('duplicate') || flat.includes('registered')
}

const inputCls = (err?: string) =>
  `h-14 w-full rounded-xl border bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${err ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-customBlue'}`

type Props = {
  course: Course
  itemType?: PublicItemType
  onSuccess?: () => void
}

export default function EnrollmentForm({ course, onSuccess }: Props) {
  const navigate = useNavigate()
  const { user, isAuthenticated, refreshUser } = useAuth()
  const [showWhatsappSuccess, setShowWhatsappSuccess] = useState(false)
  const whatsappUrl = course.whatsapp_community_url?.trim() || ''

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [localPhone, setLocalPhone] = useState('')
  const [city, setCity] = useState('')
  const [gender, setGender] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('stripe')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const isPaid = course.type === 'paid'

  function clearField(key: keyof FieldErrors) {
    setFieldErrors((p) => ({ ...p, [key]: undefined }))
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

  // Prefill from auth profile
  useEffect(() => {
    if (!isAuthenticated || user == null) return
    let cancelled = false
    void (async () => {
      let nameSrc = user.name?.trim() && user.name !== '—' ? user.name.trim() : ''
      let emailSrc = user.email?.trim() && user.email !== '—' ? user.email.trim() : ''
      let phoneSrc = user.phone?.trim() ? user.phone.trim() : ''
      let citySrc = user.city?.trim() ? user.city.trim() : ''
      let countrySrc = user.country?.trim() ? user.country.trim() : ''
      let genderSrc = user.gender?.trim() ? user.gender.trim() : ''
      try {
        const profile = await fetchProfileUser()
        if (cancelled) return
        if (profile.name && profile.name !== '—') nameSrc = profile.name.trim()
        if (profile.email && profile.email !== '—') emailSrc = profile.email.trim()
        if (profile.phone) phoneSrc = phoneSrc || String(profile.phone).trim()
        if (profile.city) citySrc = citySrc || String(profile.city).trim()
        if (profile.country) countrySrc = countrySrc || String(profile.country).trim()
        if (profile.gender) genderSrc = genderSrc || String(profile.gender).trim()
      } catch {
        /* session fallback only */
      }
      if (cancelled) return
      setFullName((c) => (c.trim() !== '' ? c : nameSrc))
      setEmail((c) => (c.trim() !== '' ? c : emailSrc))
      setCity((c) => (c.trim() !== '' ? c : citySrc))
      setGender((c) => (c !== '' ? c : genderSrc))
      // Set country if we have a code that maps to one of our countries
      setSelectedCountry((cur) => {
        if (cur) return cur
        const upper = countrySrc.toUpperCase()
        return COUNTRIES.find((co) => co.code === upper || co.name === countrySrc) ?? null
      })
      // Extract local phone (strip dial code prefix if present)
      if (phoneSrc) {
        setLocalPhone((c) => {
          if (c.trim() !== '') return c
          // Check if phone starts with a dial code we know
          for (const co of COUNTRIES) {
            if (phoneSrc.startsWith(co.dialCode)) {
              setSelectedCountry((cur) => cur ?? co)
              return phoneSrc.slice(co.dialCode.length).trim()
            }
          }
          return phoneSrc
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApiError('')
    setFieldErrors({})

    if (!isAuthenticated) {
      navigate(buildPublicLoginHref(`/courses/${course.slug}`))
      return
    }
    if (!isStudentUser(user?.role)) {
      toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)
      return
    }

    const newErrors: FieldErrors = {}
    if (!fullName.trim()) newErrors.full_name = 'الاسم الكامل مطلوب'
    if (!email.trim()) newErrors.email = 'البريد الإلكتروني مطلوب'
    if (!selectedCountry) newErrors.country_code = 'يرجى اختيار الدولة'
    if (!localPhone.trim()) newErrors.phone = 'رقم الجوال مطلوب'
    if (!city.trim()) newErrors.city = 'المدينة مطلوبة'
    if (!gender) newErrors.gender = 'يرجى تحديد الجنس'
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors)
      setApiError('يرجى إكمال الحقول الإلزامية قبل الإرسال.')
      return
    }

    const phone = `${selectedCountry!.dialCode}${localPhone.trim()}`

    try {
      setIsSubmitting(true)

      const result = await submitCourseRegistration({
        course_id: course.id,
        full_name: fullName.trim(),
        email: email.trim(),
        phone,
        city: city.trim(),
        gender,
        notes: notes.trim(),
        country: selectedCountry!.name,
        country_code: selectedCountry!.code,
        phone_country_code: selectedCountry!.dialCode,
        ...(isPaid ? { payment_provider: paymentProvider } : {}),
      })

      if (result.checkout_url) {
        notifyStudentScopeRefresh()
        notifyNotificationsRefresh()
        toast.success('تم تهيئة جلسة الدفع — ستُكمَل العملية عند إتمام المعاملة.')
        window.location.assign(result.checkout_url)
        return
      }

      if (isAuthenticated) {
        try {
          await updateProfile({
            name: fullName.trim(),
            email: email.trim(),
            phone,
            city: city.trim(),
          })
          await refreshUser()
        } catch {
          /* non-blocking */
        }
      }

      toast.success('تم التسجيل بنجاح')
      notifyStudentScopeRefresh()
      notifyNotificationsRefresh()
      if (whatsappUrl) {
        setShowWhatsappSuccess(true)
        return
      }
      if (onSuccess) {
        onSuccess()
      } else {
        navigate('/thank-you')
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const st = err.response?.status
        const raw = err.response?.data as
          | { message?: string; message_ar?: string; errors?: Record<string, string | string[]> }
          | undefined

        if (st === 409 || registrationLooksDuplicate(raw)) {
          const msg = 'أنت مسجل بالفعل في هذه الدورة'
          setApiError(msg)
          toast.error(msg)
          return
        }

        if (st === 422 && typeof raw?.message_ar === 'string' && raw.message_ar.trim() !== '') {
          setApiError(raw.message_ar)
          toast.error(raw.message_ar)
          return
        }

        if (st === 422 && raw?.errors != null) {
          const normalized = normalizeLaravelErrors(raw.errors)
          const fe: FieldErrors = {}
          for (const [k, msgs] of Object.entries(normalized)) {
            fe[k as keyof FieldErrors] = msgs[0]
          }
          setFieldErrors(fe)
          setApiError(
            typeof raw?.message === 'string' && raw.message.trim() !== '' ?
              raw.message
            : 'يرجى تصحيح الحقول أدناه.',
          )
          return
        }

        const msg =
          typeof raw?.message === 'string' && raw.message.trim() !== '' ?
            raw.message
          : 'تعذر إرسال طلب التسجيل.'
        setApiError(msg)
        return
      }
      setApiError('تعذر إرسال طلب التسجيل. يرجى المحاولة مرة أخرى.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showWhatsappSuccess) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center" dir="rtl">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
        <h3 className="mt-4 text-xl font-black text-emerald-900">تم تسجيلك بنجاح</h3>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-7 text-emerald-800">
          انضم إلى مجتمع الواتساب الخاص بالدورة لتبقى على اطلاع بجميع التحديثات والمعلومات.
        </p>
        <button
          type="button"
          onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
          className="mt-6 inline-flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-black text-white shadow-md sm:w-auto"
        >
          الانضمام إلى مجتمع الواتساب
        </button>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              setShowWhatsappSuccess(false)
              if (onSuccess) onSuccess()
              else navigate('/thank-you')
            }}
            className="text-sm font-bold text-emerald-700 underline"
          >
            متابعة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Logged-out hint */}
      {!isAuthenticated && (
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-sky-50 p-4 text-sm font-bold text-customBlue ring-1 ring-sky-100">
          <Lock size={18} className="mt-0.5 shrink-0" />
          <span>سجّل الدخول لإكمال التسجيل — تُعبَّأ بياناتك تلقائياً بعد الدخول.</span>
        </div>
      )}

      {/* Price badge for paid */}
      {isPaid && (
        <div className="mb-5 rounded-xl bg-orange-50 px-4 py-3 ring-1 ring-orange-100">
          <span className="text-xs font-black text-slate-400">السعر</span>
          <strong className="mt-0.5 block text-xl font-black text-customOrange">{formatPrice(course.price)}</strong>
        </div>
      )}

      {apiError && (
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-orange-50 p-4 text-customOrange ring-1 ring-orange-100">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <p className="whitespace-pre-line text-sm font-bold leading-7">{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-5">
        {/* الاسم الكامل + البريد */}
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-deepBlue">
            الاسم الكامل
            <span className="relative block">
              <User size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={fullName}
                required
                onChange={(e) => { setFullName(e.target.value); clearField('full_name') }}
                className={inputCls(fieldErrors.full_name)}
              />
            </span>
            {fieldErrors.full_name && <span className="text-xs text-red-600">{fieldErrors.full_name}</span>}
          </label>

          <label className="grid gap-2 text-sm font-black text-deepBlue">
            البريد الإلكتروني
            <span className="relative block">
              <Mail size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                required
                onChange={(e) => { setEmail(e.target.value); clearField('email') }}
                className={inputCls(fieldErrors.email)}
              />
            </span>
            {fieldErrors.email && <span className="text-xs text-red-600">{fieldErrors.email}</span>}
          </label>
        </div>

        {/* الدولة */}
        <div className="grid gap-2 text-sm font-black text-deepBlue">
          الدولة
          <CountrySelector
            value={selectedCountry}
            onChange={(c) => { setSelectedCountry(c); clearField('country_code') }}
            error={fieldErrors.country_code}
          />
          {fieldErrors.country_code && <span className="text-xs text-red-600">{fieldErrors.country_code}</span>}
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
              onBlur={autofillCountryFromPhone}
              placeholder="000 000 0000"
              className="min-w-0 flex-1 bg-transparent px-4 text-left font-semibold text-deepBlue outline-none placeholder:font-normal placeholder:text-slate-400"
            />
          </div>
          {fieldErrors.phone && <span className="text-xs text-red-600">{fieldErrors.phone}</span>}
        </div>

        {/* المدينة + الجنس */}
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-deepBlue">
            المدينة
            <span className="relative block">
              <MapPin size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={city}
                required
                onChange={(e) => { setCity(e.target.value); clearField('city') }}
                className={inputCls(fieldErrors.city)}
              />
            </span>
            {fieldErrors.city && <span className="text-xs text-red-600">{fieldErrors.city}</span>}
          </label>

          <label className="grid gap-2 text-sm font-black text-deepBlue">
            الجنس
            <span className="relative block">
              <ChevronDown size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={gender}
                required
                onChange={(e) => { setGender(e.target.value); clearField('gender') }}
                className={`h-14 w-full cursor-pointer appearance-none rounded-xl border bg-slate-50 px-4 pl-10 text-right font-semibold outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${fieldErrors.gender ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-customBlue'} ${gender ? 'text-deepBlue' : 'text-slate-400'}`}
              >
                <option value="" disabled>اختر الجنس</option>
                <option value="male" className="text-deepBlue">ذكر</option>
                <option value="female" className="text-deepBlue">أنثى</option>
              </select>
            </span>
            {fieldErrors.gender && <span className="text-xs text-red-600">{fieldErrors.gender}</span>}
          </label>
        </div>

        {/* ملاحظات */}
        <label className="grid gap-2 text-sm font-black text-deepBlue">
          ملاحظات إضافية <span className="font-semibold text-slate-400">(اختياري)</span>
          <textarea
            value={notes}
            rows={4}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
          />
        </label>

        {/* طريقة الدفع */}
        {isPaid && (
          <div>
            <h3 className="text-sm font-black text-deepBlue">طريقة الدفع</h3>
            <div className="mt-3">
              <PaymentProviderSelector
                value={paymentProvider}
                onChange={(v) => setPaymentProvider(v as PaymentProvider)}
                disabled={isSubmitting}
              />
            </div>
            {fieldErrors.payment_provider && (
              <span className="mt-2 block text-xs text-red-600">{fieldErrors.payment_provider}</span>
            )}
          </div>
        )}

        <motion.button
          type="submit"
          whileHover={!isSubmitting ? { scale: 1.02 } : undefined}
          disabled={isSubmitting}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-customOrange font-extrabold text-white shadow-lg shadow-orange-100 transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
          {isSubmitting ? 'جاري الإرسال...' : 'إكمال التسجيل'}
        </motion.button>
      </form>
    </div>
  )
}
