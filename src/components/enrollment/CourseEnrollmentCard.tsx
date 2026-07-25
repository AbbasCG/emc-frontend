import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BadgeCheck, CheckCircle2, Loader2, UserRound } from 'lucide-react'
import toast from '@/lib/toast'
import { fetchProfileUser, updateProfile } from '@/api/profileApi'
import { submitCourseRegistration } from '@/api/registrationsApi'
import { notifyStudentScopeRefresh } from '@/api/studentApi'
import { notifyNotificationsRefresh } from '@/api/notificationsApi'
import CourseEnrollmentFieldsModal, {
  type EnrollmentFieldValues,
} from '@/components/enrollment/CourseEnrollmentFieldsModal'
import { useAuth } from '@/contexts/AuthContext'
import type { Course } from '@/types'
import type { PublicItemType } from '@/utils/publicCourseDisplay'
import { enrollActionLabel } from '@/utils/enrollmentRedirect'
import { buildPublicLoginHref, isStudentUser, PUBLIC_ENROLL_STUDENT_ONLY_MSG } from '@/utils/publicEnrollAuth'
import { endedCourseBlocksEnrollment, ENDED_COURSE_DETAIL_MESSAGE, resolveCourseIsEnded } from '@/utils/courseEnded'
import { formatPrice } from '@/utils/course'
import { COUNTRIES, type Country } from '@/components/ui/CountrySelector'

type MissingField = 'phone' | 'city' | 'gender'

type ProfileSnapshot = {
  fullName: string
  email: string
  phone: string
  city: string
  gender: string
  country?: Country | null
}

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
  return false
}

function parsePhoneCountry(phoneRaw: string): { country: Country | null; local: string } {
  const phone = phoneRaw.trim()
  if (!phone) return { country: null, local: '' }
  for (const co of COUNTRIES) {
    if (phone.startsWith(co.dialCode)) {
      return { country: co, local: phone.slice(co.dialCode.length).trim() }
    }
  }
  return { country: null, local: phone }
}

function missingFields(profile: ProfileSnapshot): MissingField[] {
  const out: MissingField[] = []
  if (!profile.phone.trim()) out.push('phone')
  if (!profile.city.trim()) out.push('city')
  if (!profile.gender.trim()) out.push('gender')
  return out
}

type Props = {
  course: Course
  itemType: PublicItemType
  isFree: boolean
  priceLabel: string
  originalPriceLabel?: string | null
  discountPercent?: number | null
  registrationOpen: boolean
  seatsFull: boolean
  alreadyEnrolled: boolean
  compact?: boolean
}

export default function CourseEnrollmentCard({
  course,
  itemType,
  isFree,
  priceLabel,
  originalPriceLabel = null,
  discountPercent = null,
  registrationOpen,
  seatsFull,
  alreadyEnrolled,
  compact = false,
}: Props) {
  const { user, isAuthenticated, refreshUser } = useAuth()
  const shouldLoadProfile = isAuthenticated && Boolean(user)
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null)
  // Starts already loading when there is an identity to hydrate — the fetch effect
  // below never has to flip this flag synchronously.
  const [profileLoading, setProfileLoading] = useState(shouldLoadProfile)
  const [submitting, setSubmitting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [apiError, setApiError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'phone' | 'city' | 'gender' | 'notes' | 'registration_code', string>>>({})
  const [success, setSuccess] = useState(false)

  const enrollLabel = enrollActionLabel(itemType)
  const loginHref = buildPublicLoginHref(`/courses/${course.slug}`)
  const isStudent = isStudentUser(user?.role)
  const isEnded = resolveCourseIsEnded(course)
  const enrollmentBlockedByEnd = endedCourseBlocksEnrollment(course)
  const canEnroll = registrationOpen && !seatsFull && !alreadyEnrolled && !success && !enrollmentBlockedByEnd
  const whatsappUrl =
    course.whatsapp_community_url?.trim() ||
    (import.meta.env.VITE_WHATSAPP_COMMUNITY_URL as string | undefined)?.trim() ||
    ''

  // Re-arm the loading state during render when the signed-in identity changes, so the
  // card never paints the previous user's snapshot (react.dev "adjusting state").
  const [seenAuthenticated, setSeenAuthenticated] = useState(isAuthenticated)
  const [seenUser, setSeenUser] = useState(user)
  if (seenAuthenticated !== isAuthenticated || seenUser !== user) {
    setSeenAuthenticated(isAuthenticated)
    setSeenUser(user)
    setProfileLoading(shouldLoadProfile)
    if (!shouldLoadProfile) setProfile(null)
  }

  useEffect(() => {
    if (!isAuthenticated || !user) return
    let alive = true
    void (async () => {
      try {
        let fullName = user.name?.trim() && user.name !== '—' ? user.name.trim() : ''
        let email = user.email?.trim() && user.email !== '—' ? user.email.trim() : ''
        let phone = user.phone?.trim() ?? ''
        let city = user.city?.trim() ?? ''
        let gender = user.gender?.trim() ?? ''
        let countryCode = user.country?.trim().toUpperCase() ?? ''

        try {
          const p = await fetchProfileUser()
          if (p.name && p.name !== '—') fullName = p.name.trim()
          if (p.email && p.email !== '—') email = p.email.trim()
          if (p.phone) phone = String(p.phone).trim()
          if (p.city) city = String(p.city).trim()
          if (p.gender) gender = String(p.gender).trim()
          if (p.country) countryCode = String(p.country).trim().toUpperCase()
        } catch {
          /* session fallback */
        }

        if (!alive) return

        const { country, local } = parsePhoneCountry(phone)
        const resolvedCountry =
          country ?? (countryCode ? COUNTRIES.find((c) => c.code === countryCode) ?? null : null)
        const resolvedPhone =
          resolvedCountry && local ? `${resolvedCountry.dialCode}${local}` : phone

        setProfile({
          fullName,
          email,
          phone: resolvedPhone,
          city,
          gender,
          country: resolvedCountry,
        })
      } finally {
        if (alive) setProfileLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [isAuthenticated, user])

  const missing = useMemo((): MissingField[] => {
    if (profile) return missingFields(profile)
    return ['phone', 'city', 'gender']
  }, [profile])

  async function submitEnrollment(extra?: Partial<EnrollmentFieldValues>) {
    if (!profile || !canEnroll) return
    if (!isAuthenticated) return
    if (!isStudent) {
      toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)
      return
    }
    setApiError('')
    setFieldErrors({})

    const phone = extra?.phone?.trim() || profile.phone.trim()
    const city = extra?.city?.trim() || profile.city.trim()
    const gender = extra?.gender?.trim() || profile.gender.trim()
    const notes = extra?.notes?.trim() ?? ''

    if (!phone || !city || !gender) {
      setModalOpen(true)
      return
    }
    if (course.requires_registration_code && !extra?.registration_code?.trim()) {
      setModalOpen(true)
      return
    }

    setSubmitting(true)
    try {
      const result = await submitCourseRegistration({
        course_id: course.id,
        full_name: profile.fullName.trim() || '—',
        email: profile.email.trim(),
        phone,
        city,
        gender,
        notes,
        country: extra?.country ?? profile.country?.name,
        country_code: extra?.country_code ?? profile.country?.code,
        phone_country_code: extra?.phone_country_code ?? profile.country?.dialCode,
        ...(course.requires_registration_code && extra?.registration_code ?
          { registration_code: extra.registration_code.trim() }
        : {}),
        ...(course.is_paid && extra?.payment_provider ?
          { payment_provider: extra.payment_provider }
        : {}),
      })

      if (result.checkout_url) {
        notifyStudentScopeRefresh()
        notifyNotificationsRefresh()
        toast.success('تم تهيئة جلسة الدفع.')
        window.location.assign(result.checkout_url)
        return
      }

      try {
        await updateProfile({ name: profile.fullName, email: profile.email, phone, city })
        await refreshUser()
      } catch {
        /* non-blocking */
      }

      setSuccess(true)
      notifyStudentScopeRefresh()
      notifyNotificationsRefresh()
      toast.success('تم التسجيل في البرنامج بنجاح')
      setModalOpen(false)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const st = err.response?.status
        const raw = err.response?.data as
          | { message?: string; message_ar?: string; errors?: Record<string, string | string[]> }
          | undefined

        if (st === 409 || registrationLooksDuplicate(raw)) {
          const msg = 'أنت مسجل بالفعل في هذا البرنامج'
          setApiError(msg)
          toast.error(msg)
          return
        }

        // 402: backend says this course requires the /checkout endpoint
        if (st === 402) {
          const checkoutData = err.response?.data as { checkout_endpoint?: string } | undefined
          const endpoint = checkoutData?.checkout_endpoint
          if (endpoint) {
            import('@/api/checkoutApi').then(({ initiateCheckout }) => {
              initiateCheckout(course.id)
                .then(({ checkout_url }) => { window.location.assign(checkout_url) })
                .catch(() => { toast.error('تعذّر بدء الدفع. حاول مرة أخرى.') })
            })
            return
          }
        }

        if (st === 422 && typeof raw?.message_ar === 'string' && raw.message_ar.trim() !== '') {
          setApiError(raw.message_ar)
          toast.error(raw.message_ar)
          return
        }

        if (st === 422 && raw?.errors) {
          const normalized = normalizeLaravelErrors(raw.errors)
          const fe: typeof fieldErrors = {}
          for (const [k, msgs] of Object.entries(normalized)) {
            if (k === 'phone' || k === 'city' || k === 'gender' || k === 'notes' || k === 'registration_code') fe[k] = msgs[0]
          }
          setFieldErrors(fe)
          setApiError(typeof raw.message === 'string' ? raw.message : 'يرجى تصحيح الحقول.')
          setModalOpen(true)
          return
        }

        setApiError(typeof raw?.message === 'string' ? raw.message : 'تعذّر إتمام التسجيل.')
        return
      }
      setApiError('تعذّر إتمام التسجيل. حاول مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  function handlePrimaryClick() {
    if (!isAuthenticated) return
    if (!isStudent) {
      toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)
      return
    }
    if (missing.length === 0 && !course.is_paid && !course.requires_registration_code) {
      void submitEnrollment()
      return
    }
    setModalOpen(true)
  }

  return (
    <>
      <div className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/95 shadow-emc-md backdrop-blur-md ring-1 ring-deepBlue/5">
        <div className="border-b border-deepBlue/[0.06] bg-gradient-to-l from-brand-50 via-white to-brand-50/40 px-5 py-4 text-right sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-black tracking-tight text-deepBlue">الالتحاق</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1 ${
                isEnded ?
                  'bg-[#0C2A4B]/10 text-[#0C2A4B] ring-[#0C2A4B]/15'
                : registrationOpen && !seatsFull ?
                  'bg-emerald-50 text-emerald-800 ring-emerald-100'
                : 'bg-orange-50 text-orange-800 ring-orange-100'
              }`}
            >
              {isEnded ? 'انتهت' : registrationOpen && !seatsFull ? 'متاح للتسجيل' : seatsFull ? 'مكتمل' : 'مغلق'}
            </span>
          </div>
          {!compact && (
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{course.title}</p>
          )}
        </div>

        <div className="space-y-2.5 border-b border-[#0C2A4B]/6 px-5 py-3.5 text-right sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-slate-400">الرسوم</span>
            <div className="text-left">
              {originalPriceLabel && !isFree ?
                <span className="block text-[10px] font-bold text-slate-400 line-through tabular-nums">
                  {originalPriceLabel}
                </span>
              : null}
              <span className={`text-lg font-black tabular-nums ${isFree ? 'text-[#0077B6]' : 'text-accent-700'}`}>
                {isFree ? 'مجانية' : priceLabel}
              </span>
            </div>
          </div>
          {discountPercent != null && discountPercent > 0 && !isFree ?
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black text-slate-400">الخصم</span>
              <span className="rounded-full bg-[#F28C00]/15 px-2.5 py-0.5 text-[10px] font-black tabular-nums text-accent-700">
                {String(discountPercent)}%
              </span>
            </div>
          : null}
        </div>

        <div className="p-4 sm:p-5">
          {isEnded && enrollmentBlockedByEnd ?
            <div className="rounded-xl border border-[#0C2A4B]/10 bg-slate-50 px-4 py-5 text-center text-sm font-bold leading-7 text-[#0C2A4B]/80">
              {ENDED_COURSE_DETAIL_MESSAGE}
            </div>
          : !registrationOpen || seatsFull ?
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm font-black text-deepBlue">
              {!registrationOpen ? 'التسجيل مغلق حالياً' : 'المقاعد مكتملة'}
            </div>
          : alreadyEnrolled || success ?
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
              <BadgeCheck className="mx-auto h-8 w-8 text-emerald-600" aria-hidden />
              <p className="mt-2 text-sm font-black text-emerald-900">
                {success ? 'تم التسجيل بنجاح' : 'أنت مسجّل بالفعل'}
              </p>
              <Link
                to="/dashboard/student/courses"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white"
              >
                عرض تسجيلي
              </Link>
              {success && whatsappUrl && (
                <div className="mt-4 border-t border-emerald-200 pt-4">
                  <p className="mb-3 text-xs font-semibold leading-6 text-emerald-800">
                    انضم إلى مجتمع الواتساب الخاص بالدورة لتبقى على اطلاع بجميع التحديثات والمعلومات.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-black text-white"
                  >
                    الانضمام إلى مجتمع الواتساب
                  </button>
                </div>
              )}
            </div>
          : !isAuthenticated ?
            <div className="space-y-4 text-right">
              <p className="text-sm font-semibold leading-7 text-slate-600">
                أنشئ حساباً أو سجّل دخولك للالتحاق بهذا البرنامج.
              </p>
              <Link
                to={loginHref}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-sm font-black text-white shadow-emc-md transition duration-250 ease-emc hover:brightness-[1.03]"
              >
                سجّل الدخول لإكمال التسجيل
              </Link>
            </div>
          : !isStudent ?
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-center text-sm font-bold text-amber-900">
              {PUBLIC_ENROLL_STUDENT_ONLY_MSG}
            </div>
          : profileLoading ?
            <div className="flex items-center justify-center gap-2 py-6 text-sm font-semibold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-customBlue" />
              جارٍ تحميل بياناتك…
            </div>
          : <>
              {profile && (
                <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/90 px-4 py-3 text-right">
                  <div className="flex items-center gap-2 text-sm font-black text-deepBlue">
                    <UserRound className="h-4 w-4 text-customBlue" aria-hidden />
                    {profile.fullName || 'حسابك'}
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500" dir="ltr">
                    {profile.email}
                  </p>
                  {profile.phone && (
                    <p className="mt-0.5 text-xs font-semibold text-slate-500" dir="ltr">
                      {profile.phone}
                    </p>
                  )}
                </div>
              )}

              {apiError && !modalOpen && (
                <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
                  {apiError}
                </p>
              )}

              {course.type === 'paid' && (
                <p className="mb-3 text-center text-xs font-bold text-accent-700">
                  الرسوم: {formatPrice(course.price)}
                </p>
              )}

              <motion.button
                type="button"
                whileHover={!submitting ? { scale: 1.02 } : undefined}
                disabled={submitting}
                onClick={handlePrimaryClick}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-sm font-black text-white shadow-emc-md transition duration-250 ease-emc hover:brightness-[1.03] disabled:opacity-60"
              >
                {submitting ?
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ التسجيل…
                  </>
                : <>
                    <CheckCircle2 className="h-4 w-4" />
                    {enrollLabel}
                  </>
                }
              </motion.button>

              {missing.length > 0 && (
                <p className="mt-2 text-center text-[11px] font-semibold text-slate-500">
                  قد نطلب {missing.length === 1 ? 'حقلاً' : 'حقول'} إضافية قبل التأكيد.
                </p>
              )}
            </>
          }
        </div>
      </div>

      <CourseEnrollmentFieldsModal
        open={modalOpen}
        course={course}
        missing={missing}
        initial={{
          phone: profile?.phone,
          city: profile?.city,
          gender: profile?.gender,
          country_code: profile?.country?.code,
          phone_country_code: profile?.country?.dialCode,
        }}
        submitting={submitting}
        error={apiError}
        fieldErrors={fieldErrors}
        onClose={() => !submitting && setModalOpen(false)}
        onSubmit={(values) => void submitEnrollment(values)}
      />
    </>
  )
}
