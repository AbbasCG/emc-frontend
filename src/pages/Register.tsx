import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  UserPlus,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '../api/axios'
import { submitCourseRegistration, type CourseRegisterBody } from '../api/registrationsApi'
import { fetchProfileUser, updateProfile } from '@/api/profileApi'
import { notifyStudentScopeRefresh } from '@/api/studentApi'
import { notifyNotificationsRefresh } from '@/api/notificationsApi'
import { useAuth } from '@/contexts/AuthContext'
import PaymentProviderSelector from '../components/payments/PaymentProviderSelector'
import PageHeader from '../components/PageHeader'
import StateMessage from '../components/StateMessage'
import type { Course } from '../types'
import { formatPrice } from '../utils/course'
import { unwrapPublicCoursePayload } from '@/utils/publicCourseNormalize'

type PaymentProvider = 'stripe' | 'paypal' | 'fake'

type RegisterForm = {
  full_name: string
  phone: string
  email: string
  city: string
  gender: string
  notes: string
  payment_provider: PaymentProvider
}

type ValidationErrors = Partial<Record<keyof RegisterForm | 'course_id', string[]>>

function normalizeLaravelErrors(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v)) {
      out[k] = v.map((x) => String(x))
    } else if (v != null && v !== '') {
      out[k] = [String(v)]
    }
  }
  return out
}

const FIELD_LABEL_AR: Record<string, string> = {
  full_name: 'الاسم الكامل',
  email: 'البريد الإلكتروني',
  phone: 'رقم الجوال',
  city: 'المدينة',
  gender: 'الجنس',
  notes: 'الملاحظات',
  payment_provider: 'طريقة الدفع',
  course_id: 'الدورة',
  workshop_id: 'ورشة العمل',
  track_id: 'المسار',
  receipt: 'الإيصال',
}

function pickFieldErrors(
  normalized: Record<string, string[]>,
): ValidationErrors {
  const keys = new Set<string>([
    'full_name',
    'email',
    'phone',
    'city',
    'gender',
    'notes',
    'payment_provider',
    'course_id',
  ])
  const pick: ValidationErrors = {}
  for (const k of keys) {
    if (normalized[k]?.length) {
      pick[k as keyof RegisterForm | 'course_id'] = normalized[k]
    }
  }
  return pick
}

function formatValidationAlertMessage(errors: Record<string, string[]>, fallback: string): string {
  const lines: string[] = []
  for (const [key, msgs] of Object.entries(errors)) {
    const label = FIELD_LABEL_AR[key] ?? key
    for (const m of msgs) {
      lines.push(`${label}: ${m}`)
    }
  }
  return lines.length > 0 ? lines.join('\n') : fallback
}

function buildRegistrationBody(form: RegisterForm, paid: boolean): CourseRegisterBody {
  const body: CourseRegisterBody = {
    full_name: form.full_name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    city: form.city.trim(),
    gender: form.gender.trim(),
    notes: form.notes.trim(),
  }
  if (paid) {
    body.payment_provider = form.payment_provider
  }
  return body
}

const initialForm: RegisterForm = {
  full_name: '',
  phone: '',
  email: '',
  city: '',
  gender: '',
  notes: '',
  payment_provider: 'stripe',
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
  return (
    flat.includes('already') ||
    flat.includes('duplicate') ||
    flat.includes('registered') ||
    /مسجل|مكرر/u.test(
      Object.values(errs)
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .map((x) => String(x))
        .join(' '),
    )
  )
}

export default function Register() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, refreshUser } = useAuth()

  const [course, setCourse] = useState<Course | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')

  const [form, setForm] = useState<RegisterForm>(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    const controller = new AbortController()

    async function fetchData() {
      try {
        setIsLoading(true)
        setApiError('')

        if (slug) {
          const response = await api.get<Course | { data?: Course }>(`/courses/${encodeURIComponent(slug)}`, {
            signal: controller.signal,
            skipErrorToast: true,
          })

          const item =
            unwrapPublicCoursePayload(response.data) ??
            (typeof response.data === 'object' && response.data !== null && 'slug' in response.data ?
              (response.data as Course)
            : null)

          setCourse(item?.slug ? item : null)
          return
        }

        const response = await api.get<Course[] | { data?: Course[] }>('/courses', {
          signal: controller.signal,
        })

        const list = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
            ? response.data.data
            : []

        setCourses(Array.isArray(list) ? list : [])
      } catch (err) {
        if (axios.isCancel(err)) return
        setApiError('تعذر تحميل بيانات الدورات. يرجى المحاولة مرة أخرى.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    return () => controller.abort()
  }, [slug])

  useEffect(() => {
    if (!isAuthenticated || user == null) return
    let cancelled = false
    void (async () => {
      let nameSrc = typeof user.name === 'string' && user.name.trim() !== '' && user.name !== '—' ? user.name.trim() : ''
      let emailSrc =
        typeof user.email === 'string' && user.email.trim() !== '' && user.email !== '—' ? user.email.trim() : ''
      let phoneSrc =
        typeof user.phone === 'string' && user.phone.trim() !== '' ? user.phone.trim() : ''
      let citySrc = typeof user.city === 'string' && user.city.trim() !== '' ? user.city.trim() : ''
      try {
        const profile = await fetchProfileUser()
        if (cancelled) return
        if (profile.name && profile.name !== '—') nameSrc = profile.name.trim()
        if (profile.email && profile.email !== '—') emailSrc = profile.email.trim()
        if (profile.phone) phoneSrc = phoneSrc || String(profile.phone).trim()
        if (profile.city) citySrc = citySrc || String(profile.city).trim()
      } catch {
        /* session fallback only */
      }
      setForm((cur) => ({
        ...cur,
        full_name: cur.full_name.trim() !== '' ? cur.full_name : nameSrc,
        email: cur.email.trim() !== '' ? cur.email : emailSrc,
        phone: cur.phone.trim() !== '' ? cur.phone : phoneSrc,
        city: cur.city.trim() !== '' ? cur.city : citySrc,
      }))
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  function updateField(name: keyof RegisterForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
    setValidationErrors((current) => ({ ...current, [name]: undefined }))
  }

  function handleCourseChange(courseId: string) {
    setSelectedCourseId(courseId)
    setApiError('')

    const selectedCourse = courses.find((item) => String(item.id) === courseId)
    setCourse(selectedCourse ?? null)
    setValidationErrors((e) => ({ ...e, course_id: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApiError('')
    setValidationErrors({})

    if (!course) {
      setApiError('يرجى اختيار دورة قبل إكمال التسجيل.')
      return
    }

    const nextErrors: ValidationErrors = {}
    if (!form.phone.trim()) nextErrors.phone = ['رقم الجوال مطلوب']
    if (!form.city.trim()) nextErrors.city = ['المدينة مطلوبة']
    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors((prev) => ({ ...prev, ...nextErrors }))
      setApiError('يرجى إكمال الحقول الإلزامية قبل الإرسال.')
      return
    }

    try {
      setIsSubmitting(true)

      const paid = course.type === 'paid'
      const body = buildRegistrationBody(form, paid)
      const payloadForLog: Record<string, unknown> = {
        full_name: body.full_name,
        email: body.email,
        phone: body.phone,
        city: body.city,
        gender: body.gender,
        notes: body.notes,
      }
      if (paid && body.payment_provider) {
        payloadForLog.payment_provider = body.payment_provider
      }
      if (import.meta.env.DEV) {
        console.log('registration payload', {
          endpoint: 'POST /courses/{id}/register (course_id not in body)',
          course_id: course.id,
          body: payloadForLog,
        })
      }

      const result = await submitCourseRegistration({
        course_id: course.id,
        ...body,
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
            name: form.full_name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            city: form.city.trim(),
          })
          await refreshUser()
        } catch {
          /* لا نمنع مسار النجاح — الخادم قد لا يتيح PATCH كاملاً */
        }
      }

      toast.success('تم إرسال التسجيل بنجاح.')
      notifyStudentScopeRefresh()
      notifyNotificationsRefresh()
      navigate('/thank-you')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.log('registration error', err.response?.data)
        const st = err.response?.status
        const raw = err.response?.data as
          | { message?: string; errors?: Record<string, string | string[]> }
          | undefined
        const data = raw
        const nestedErrors =
          data && typeof data === 'object' && 'errors' in data && data.errors != null ?
            data.errors
          : undefined

        if (st === 409 || registrationLooksDuplicate(data)) {
          const msg = 'أنت مسجل بالفعل في هذه الدورة'
          setApiError(msg)
          toast.error(msg)
          return
        }

        if (st === 422 && nestedErrors !== undefined) {
          const normalized = normalizeLaravelErrors(nestedErrors)
          setValidationErrors(pickFieldErrors(normalized))
          const summary = formatValidationAlertMessage(
            normalized,
            typeof data?.message === 'string' && data.message.trim() !== '' ?
              data.message
            : 'يرجى تصحيح الحقول أدناه.',
          )
          setApiError(summary)
          return
        }

        const msg =
          typeof data?.message === 'string' && data.message.trim() !== '' ? data.message : 'تعذر إرسال طلب التسجيل.'
        setApiError(msg)
        return
      }

      setApiError('تعذر إرسال طلب التسجيل. يرجى المحاولة مرة أخرى.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isPaid = course?.type === 'paid'

  const lockIdentityFields =
    isAuthenticated &&
    form.full_name.trim() !== '' &&
    form.email.trim() !== ''

  if (isLoading) {
    return (
      <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-100">
          <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-8 grid gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (slug && !course && apiError) {
    return (
      <main className="bg-slate-50 px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <StateMessage type="error" title="حدث خطأ" message={apiError} />
      </main>
    )
  }

  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="سجل الآن"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: course?.title || 'سجل الآن' },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-4xl rounded-2xl bg-white p-6 text-right shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-8"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="flex flex-col justify-between gap-5 border-b border-slate-100 pb-6 lg:flex-row lg:items-center">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-customBlue">
                <UserPlus size={17} />
                نموذج التسجيل
              </span>

              <h1 className="text-3xl font-black text-deepBlue">
                {course?.title || 'التسجيل في الدورة'}
              </h1>

              <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />

              {course?.short_description && (
                <p className="mt-4 max-w-2xl leading-8 text-slate-600">
                  {course.short_description}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-slate-50 px-6 py-4 ring-1 ring-slate-100">
              <span className="block text-xs font-black text-slate-400">السعر</span>
              <strong
                className={`mt-1 block text-2xl font-black ${
                  isPaid ? 'text-customOrange' : 'text-customBlue'
                }`}
              >
                {course ? (isPaid ? formatPrice(course.price) : 'مجانية') : 'يحدد بعد اختيار الدورة'}
              </strong>
            </div>
          </div>

          {apiError && (
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-orange-50 p-4 text-customOrange ring-1 ring-orange-100">
              <AlertCircle size={22} className="mt-1 shrink-0" />
              <p className="whitespace-pre-line font-bold leading-7">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            {!slug && (
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                اختر الدورة
                <span className="relative block">
                  <BookOpen
                    size={20}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={selectedCourseId}
                    required
                    onChange={(event) => handleCourseChange(event.target.value)}
                    className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                  >
                    <option value="">اختر الدورة</option>
                    {(Array.isArray(courses) ? courses : []).map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </span>
                {validationErrors.course_id?.[0] ?
                  <span className="text-xs text-customOrange">{validationErrors.course_id[0]}</span>
                : null}
              </label>
            )}

            {slug && course && (
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                الدورة المختارة
                <span className="relative block">
                  <BookOpen
                    size={20}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={course.title}
                    disabled
                    className="h-14 w-full rounded-xl border border-slate-200 bg-slate-100 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none"
                  />
                </span>
              </label>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="الاسم الكامل"
                name="full_name"
                value={form.full_name}
                icon={User}
                error={validationErrors.full_name?.[0]}
                readOnly={lockIdentityFields}
                readOnlyHint={lockIdentityFields ? 'يُستخدم اسمك من ملفك الشخصي.' : undefined}
                onChange={updateField}
              />

              <FormField
                label="رقم الجوال"
                name="phone"
                value={form.phone}
                icon={Phone}
                error={validationErrors.phone?.[0]}
                htmlRequired={false}
                onChange={updateField}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="البريد الإلكتروني"
                name="email"
                type="email"
                value={form.email}
                icon={Mail}
                error={validationErrors.email?.[0]}
                readOnly={lockIdentityFields}
                readOnlyHint={lockIdentityFields ? 'يُستخدم بريدك من ملفك الشخصي.' : undefined}
                onChange={updateField}
              />

              <FormField
                label="المدينة"
                name="city"
                value={form.city}
                icon={MapPin}
                error={validationErrors.city?.[0]}
                htmlRequired={false}
                onChange={updateField}
              />
            </div>

            <label className="grid gap-2 text-sm font-black text-deepBlue">
              الجنس اختياري
              <select
                value={form.gender}
                onChange={(event) => updateField('gender', event.target.value)}
                className="h-14 rounded-xl border border-slate-200 bg-slate-50 px-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
              >
                <option value="">اختر الجنس</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>

              {validationErrors.gender?.[0] && (
                <span className="text-xs text-customOrange">
                  {validationErrors.gender[0]}
                </span>
              )}
            </label>

            <label className="grid gap-2 text-sm font-black text-deepBlue">
              ملاحظات إضافية
              <textarea
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                rows={5}
                className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
              />

              {validationErrors.notes?.[0] && (
                <span className="text-xs text-customOrange">
                  {validationErrors.notes[0]}
                </span>
              )}
            </label>

            {isPaid && (
              <div>
                <h2 className="text-lg font-black text-deepBlue">طريقة الدفع</h2>
                <p className="mt-2 text-sm font-semibold text-deepBlue/60">
                  للدورات المدفوعة: اختر المزوّد. في التطوير المحلي يمكنك استخدام «دفع تجريبي محلي» لاختبار الصفحة
                  /fake-payment.
                </p>
                <div className="mt-4">
                  <PaymentProviderSelector
                    value={form.payment_provider}
                    onChange={(v) => updateField('payment_provider', v)}
                    disabled={isSubmitting}
                  />
                </div>
                {validationErrors.payment_provider?.[0] && (
                  <span className="mt-2 block text-xs text-customOrange">
                    {validationErrors.payment_provider[0]}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.03 }}
                disabled={isSubmitting}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-customOrange px-7 font-extrabold text-white shadow-lg shadow-orange-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={20} />
                )}
                {isSubmitting ? 'جاري الإرسال...' : 'إكمال التسجيل'}
              </motion.button>

              <Link
                to="/courses"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-lg border border-customBlue px-7 font-extrabold text-customBlue transition hover:bg-sky-50"
              >
                العودة للدورات
                <ArrowLeft size={20} />
              </Link>
            </div>
          </form>
        </motion.div>
      </section>
    </main>
  )
}

function FormField({
  label,
  name,
  value,
  icon: Icon,
  error,
  type = 'text',
  htmlRequired = true,
  readOnly = false,
  readOnlyHint,
  onChange,
}: {
  label: string
  name: keyof RegisterForm
  value: string
  icon: typeof User
  error?: string
  type?: string
  htmlRequired?: boolean
  readOnly?: boolean
  readOnlyHint?: string
  onChange: (name: keyof RegisterForm, value: string) => void
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-deepBlue">
      {label}
      <span className="relative block">
        <Icon
          size={20}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          name={name}
          type={type}
          value={value}
          required={htmlRequired && !readOnly}
          readOnly={readOnly}
          onChange={(event) => !readOnly && onChange(name, event.target.value)}
          className={`h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100 ${
            readOnly ? 'cursor-default bg-slate-100 text-slate-600' : ''
          }`}
        />
      </span>

      {readOnlyHint ?
        <span className="text-xs font-semibold text-slate-500">{readOnlyHint}</span>
      : null}

      {error && <span className="text-xs text-customOrange">{error}</span>}
    </label>
  )
}