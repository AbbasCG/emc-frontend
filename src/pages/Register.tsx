import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  UserPlus,
} from 'lucide-react'
import api from '../api/axios'
import PageHeader from '../components/PageHeader'
import StateMessage from '../components/StateMessage'
import type { Course } from '../types'
import { extractItem, formatPrice } from '../utils/course'

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

type ValidationErrors = Partial<Record<keyof RegisterForm, string[]>>

const initialForm: RegisterForm = {
  full_name: '',
  phone: '',
  email: '',
  city: '',
  gender: '',
  notes: '',
  payment_provider: 'fake',
}

const paymentProviders: { label: string; value: PaymentProvider }[] = [
  { label: 'Stripe', value: 'stripe' },
  { label: 'PayPal', value: 'paypal' },
  { label: 'Fake Payment', value: 'fake' },
]

export default function Register() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [form, setForm] = useState<RegisterForm>(initialForm)
  const [isLoading, setIsLoading] = useState(Boolean(slug))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    if (!slug) {
      return
    }

    const controller = new AbortController()

    async function fetchCourse() {
      try {
        setIsLoading(true)
        setApiError('')
        const response = await api.get<Course | { data?: Course }>(`/courses/${slug}`, {
          signal: controller.signal,
        })
        const item = extractItem(response.data)
        setCourse(item?.id ? item : null)
      } catch (err) {
        if (axios.isCancel(err)) return
        setApiError('تعذر تحميل بيانات الدورة. يرجى المحاولة مرة أخرى.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourse()

    return () => controller.abort()
  }, [slug])

  function updateField(name: keyof RegisterForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
    setValidationErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApiError('')
    setValidationErrors({})

    if (!course) {
      setApiError('يرجى اختيار دورة قبل إكمال التسجيل.')
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        course_id: course.id,
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        city: form.city,
        gender: form.gender,
        notes: form.notes,
        payment_provider: course.type === 'paid' ? form.payment_provider : undefined,
      }

      const response = await api.post('/register', payload)
      const checkoutUrl = response.data?.checkout_url

      if (checkoutUrl) {
        window.location.href = checkoutUrl
        return
      }

      navigate('/thank-you')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        setValidationErrors(err.response.data?.errors ?? {})
        setApiError(err.response.data?.message ?? 'يرجى مراجعة البيانات المدخلة.')
        return
      }

      setApiError('تعذر إرسال طلب التسجيل. يرجى المحاولة مرة أخرى.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isPaid = course?.type === 'paid'

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
                <p className="mt-4 max-w-2xl leading-8 text-slate-600">{course.short_description}</p>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 px-6 py-4 ring-1 ring-slate-100">
              <span className="block text-xs font-black text-slate-400">السعر</span>
              <strong className={`mt-1 block text-2xl font-black ${isPaid ? 'text-customOrange' : 'text-customBlue'}`}>
                {course ? (isPaid ? formatPrice(course.price) : 'مجانية') : 'يحدد بعد اختيار الدورة'}
              </strong>
            </div>
          </div>

          {apiError && (
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-orange-50 p-4 text-customOrange ring-1 ring-orange-100">
              <AlertCircle size={22} className="mt-1 shrink-0" />
              <p className="font-bold leading-7">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="الاسم الكامل"
                name="full_name"
                value={form.full_name}
                icon={User}
                error={validationErrors.full_name?.[0]}
                onChange={updateField}
              />
              <FormField
                label="رقم الجوال"
                name="phone"
                value={form.phone}
                icon={Phone}
                error={validationErrors.phone?.[0]}
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
                onChange={updateField}
              />
              <FormField
                label="المدينة"
                name="city"
                value={form.city}
                icon={MapPin}
                error={validationErrors.city?.[0]}
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
              {validationErrors.gender?.[0] && <span className="text-xs text-customOrange">{validationErrors.gender[0]}</span>}
            </label>

            <label className="grid gap-2 text-sm font-black text-deepBlue">
              ملاحظات إضافية
              <textarea
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                rows={5}
                className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
              {validationErrors.notes?.[0] && <span className="text-xs text-customOrange">{validationErrors.notes[0]}</span>}
            </label>

            {isPaid && (
              <div>
                <h2 className="text-lg font-black text-deepBlue">طريقة الدفع</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {paymentProviders.map((provider) => (
                    <button
                      key={provider.value}
                      type="button"
                      onClick={() => updateField('payment_provider', provider.value)}
                      className={`flex h-14 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition ${
                        form.payment_provider === provider.value
                          ? 'border-customOrange bg-orange-50 text-customOrange'
                          : 'border-slate-200 bg-slate-50 text-deepBlue hover:border-customBlue hover:text-customBlue'
                      }`}
                    >
                      <CreditCard size={18} />
                      {provider.label}
                    </button>
                  ))}
                </div>
                {validationErrors.payment_provider?.[0] && (
                  <span className="mt-2 block text-xs text-customOrange">{validationErrors.payment_provider[0]}</span>
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
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
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
  onChange,
}: {
  label: string
  name: keyof RegisterForm
  value: string
  icon: typeof User
  error?: string
  type?: string
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
          required
          onChange={(event) => onChange(name, event.target.value)}
          className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
        />
      </span>
      {error && <span className="text-xs text-customOrange">{error}</span>}
    </label>
  )
}
