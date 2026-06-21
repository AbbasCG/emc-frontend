import { useState, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Paperclip,
  Upload,
  User,
  Briefcase,
  Sparkles,
  ClipboardList,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import CountrySelector, { type Country } from '@/components/ui/CountrySelector'
import { submitVolunteerApplication } from '@/api/volunteerApplicationApi'
import { getApiErrorMessage, getLaravelFieldErrors } from '@/api/apiErrors'
import toast from '@/lib/toast'

/* ── Constants ──────────────────────────────────────────────────────── */

const DEPARTMENTS = [
  'البرامج والمسارات',
  'التسويق والإعلام',
  'التقنية والدعم الفني',
  'الموارد البشرية',
  'الشراكات والعلاقات العامة',
  'المجتمع والصحة النفسية والوعي',
  'الجودة والحوكمة',
  'المالية',
  'التشغيل والعمليات',
  'غير محدد',
]

const EXPERIENCE_LEVELS = ['مبتدئ', 'متوسط', 'متقدم', 'خبير']

const AVAILABILITY_OPTIONS = [
  'أقل من 3 ساعات أسبوعيًا',
  '3-5 ساعات أسبوعيًا',
  '5-10 ساعات أسبوعيًا',
  'أكثر من 10 ساعات أسبوعيًا',
]

const GENDER_OPTIONS = [
  { value: 'male', label: 'ذكر' },
  { value: 'female', label: 'أنثى' },
]

const STEPS = [
  { id: 1, label: 'البيانات الشخصية', icon: User },
  { id: 2, label: 'مجال التطوع', icon: Briefcase },
  { id: 3, label: 'الخبرات والتوفر', icon: Sparkles },
  { id: 4, label: 'المراجعة والإرسال', icon: ClipboardList },
]

/* ── Types ───────────────────────────────────────────────────────────── */

type FormData = {
  full_name: string
  email: string
  phone: string
  country: Country | null
  city: string
  gender: string
  desired_department: string
  experience_level: string
  skills: string
  availability: string
  motivation: string
  previous_experience: string
  notes: string
  cv_file: File | null
  agree_terms: boolean
}

type FieldErrors = Partial<Record<keyof FormData, string>>

/* ── Input helpers ───────────────────────────────────────────────────── */

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block text-right">
      <span className="mb-1.5 block text-sm font-black text-deepBlue">
        {label}
        {required && <span className="mr-1 text-red-500">*</span>}
      </span>
      {children}
      {error && (
        <p className="mt-1.5 text-right text-[12px] font-bold text-red-600">{error}</p>
      )}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  hasError,
  dir,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hasError?: boolean
  dir?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      className={`h-14 w-full rounded-xl border bg-slate-50 px-4 text-right font-semibold text-deepBlue outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-sky-100 ${
        hasError ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-customBlue'
      }`}
    />
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  hasError,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  hasError?: boolean
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir="rtl"
      className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-sky-100 ${
        hasError ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-customBlue'
      }`}
    />
  )
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  hasError,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  hasError?: boolean
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir="rtl"
        className={`h-14 w-full appearance-none rounded-xl border bg-slate-50 px-4 pr-10 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${
          hasError ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-customBlue'
        } ${!value ? 'text-slate-400' : ''}`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  )
}

/* ── Stepper ─────────────────────────────────────────────────────────── */

function Stepper({ step }: { step: number }) {
  return (
    <div className="mb-10 flex items-start justify-center gap-0 sm:gap-2" dir="rtl">
      {STEPS.map((s, idx) => {
        const done = step > s.id
        const active = step === s.id
        const Icon = s.icon
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 sm:h-12 sm:w-12 ${
                  done
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                    : active
                      ? 'bg-deepBlue text-white shadow-md shadow-deepBlue/30'
                      : 'border-2 border-slate-200 bg-white text-slate-400'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                ) : (
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </div>
              <span
                className={`hidden text-center text-[11px] font-black leading-tight sm:block sm:max-w-[80px] ${
                  active ? 'text-deepBlue' : done ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-1 mb-5 h-0.5 w-8 rounded-full transition-colors duration-300 sm:mx-2 sm:w-14 ${
                  step > s.id ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Review row ─────────────────────────────────────────────────────── */

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-right">
      <span className="shrink-0 text-[12px] font-black text-deepBlue/60">{label}</span>
      <span className="text-[13px] font-bold text-deepBlue">{value}</span>
    </div>
  )
}

/* ── Main page ────────────────────────────────────────────────────────── */

export default function VolunteerApply() {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>({
    full_name: '',
    email: '',
    phone: '',
    country: null,
    city: '',
    gender: '',
    desired_department: '',
    experience_level: '',
    skills: '',
    availability: '',
    motivation: '',
    previous_experience: '',
    notes: '',
    cv_file: null,
    agree_terms: false,
  })

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setFieldErrors((e) => ({ ...e, [key]: undefined }))
  }

  /* ── Validation ── */

  function validateStep1(): FieldErrors {
    const e: FieldErrors = {}
    if (!form.full_name.trim()) e.full_name = 'الاسم الكامل مطلوب'
    if (!form.email.trim()) e.email = 'البريد الإلكتروني مطلوب'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'البريد الإلكتروني غير صحيح'
    if (!form.phone.trim()) e.phone = 'رقم الجوال مطلوب'
    if (!form.country) e.country = 'الدولة مطلوبة'
    if (!form.city.trim()) e.city = 'المدينة مطلوبة'
    if (!form.gender) e.gender = 'الجنس مطلوب'
    return e
  }

  function validateStep2(): FieldErrors {
    const e: FieldErrors = {}
    if (!form.desired_department) e.desired_department = 'القسم مطلوب'
    return e
  }

  function validateStep3(): FieldErrors {
    const e: FieldErrors = {}
    if (!form.experience_level) e.experience_level = 'مستوى الخبرة مطلوب'
    if (!form.availability) e.availability = 'التوفر مطلوب'
    if (!form.motivation.trim()) e.motivation = 'سبب التطوع مطلوب'
    else if (form.motivation.trim().length < 20) e.motivation = 'يرجى كتابة سبب التطوع بما لا يقل عن 20 حرفًا'
    // if (!form.cv_file) e.cv_file = 'السيرة الذاتية مطلوبة'
    return e
  }

  function validateStep4(): FieldErrors {
    const e: FieldErrors = {}
    if (!form.agree_terms) e.agree_terms = 'يجب الموافقة قبل الإرسال'
    return e
  }

  function next() {
    let errors: FieldErrors = {}
    if (step === 1) errors = validateStep1()
    if (step === 2) errors = validateStep2()
    if (step === 3) errors = validateStep3()

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setStep((s) => Math.min(s + 1, 4))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function prev() {
    setStep((s) => Math.max(s - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Which step owns each backend field name
  const FIELD_STEP: Record<string, number> = {
    full_name: 1, email: 1, phone: 1, country: 1, city: 1, gender: 1,
    desired_department: 2,
    experience_level: 3, skills: 3, availability: 3, motivation: 3,
    previous_experience: 3, cv_file: 3, notes: 3,
    agree_terms: 4,
  }

  async function handleSubmit() {
    const errors = validateStep4()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setSubmitError(null)
    setSubmitting(true)
    try {
      await submitVolunteerApplication({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        country: form.country?.name ?? '',
        city: form.city,
        gender: form.gender,
        desired_department: form.desired_department,
        experience_level: form.experience_level,
        skills: form.skills,
        availability: form.availability,
        motivation: form.motivation,
        previous_experience: form.previous_experience || undefined,
        cv_file: form.cv_file,
        notes: form.notes || undefined,
        agree_terms: form.agree_terms,
      })
      setSubmitted(true)
    } catch (err) {
      const fieldErrs = getLaravelFieldErrors(err)
      const hasFieldErrs = Object.keys(fieldErrs).length > 0

      if (import.meta.env.DEV) {
        console.error('[VolunteerApply] Submit error:', err)
        if (hasFieldErrs) console.log('[VolunteerApply] Backend field errors:', fieldErrs)
      }

      if (hasFieldErrs) {
        // Surface backend errors as field-level errors and navigate to earliest failing step
        setFieldErrors(fieldErrs as FieldErrors)
        const earliestStep = Object.keys(fieldErrs).reduce((min, field) => {
          const s = FIELD_STEP[field] ?? 4
          return s < min ? s : min
        }, 4)
        setStep(earliestStep)
        toast.error('يرجى مراجعة البيانات المدخلة', { description: getApiErrorMessage(err) })
      } else {
        setSubmitError(getApiErrorMessage(err))
        toast.error(getApiErrorMessage(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Success state ── */

  if (submitted) {
    return (
      <div className="bg-[#f4f7fb] pt-20">
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
            className="mx-auto w-full max-w-xl rounded-3xl bg-white p-10 text-center shadow-2xl shadow-deepBlue/10 ring-1 ring-deepBlue/[0.06]"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 22 }}
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-300/40"
            >
              <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2.5} />
            </motion.div>
            <h2 className="text-2xl font-black text-deepBlue">تم إرسال طلب التطوع بنجاح</h2>
            <p className="mx-auto mt-4 max-w-sm text-[14px] font-semibold leading-relaxed text-deepBlue/65">
              شكرًا لرغبتك في الانضمام إلى فريق EMC. سنراجع طلبك ونتواصل معك قريبًا.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-2xl bg-deepBlue px-7 py-3 text-[13px] font-black text-white shadow-md transition hover:brightness-105"
              >
                الرئيسية
              </Link>
              <Link
                to="/team"
                className="inline-flex items-center gap-2 rounded-2xl border border-deepBlue/15 bg-white px-7 py-3 text-[13px] font-black text-deepBlue transition hover:bg-slate-50"
              >
                تعرف على الفريق
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  const slideVariants = {
    enter: { opacity: 0, x: -20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  }

  return (
    <div className="bg-[#f4f7fb] pt-20" dir="rtl">
      <PageHeader
        title="طلب التطوع مع EMC"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'التطوع', href: '/volunteer' },
          { label: 'تقديم طلب' },
        ]}
      />

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">

          {/* Progress bar */}
          <div className="mb-2 flex items-center justify-between text-[11px] font-black text-deepBlue/50">
            <span>الخطوة {step} من {STEPS.length}</span>
            <span>{Math.round((step / STEPS.length) * 100)}%</span>
          </div>
          <div className="mb-8 h-2 overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-customBlue to-deepBlue"
              animate={{ width: `${(step / STEPS.length) * 100}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>

          <Stepper step={step} />

          <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-deepBlue/[0.08] ring-1 ring-deepBlue/[0.05]">
            <div className="border-b border-slate-100 px-8 py-6">
              <h1 className="text-xl font-black text-deepBlue">
                {STEPS[step - 1]?.label}
              </h1>
              <p className="mt-1 text-[13px] font-semibold text-deepBlue/55">
                {step === 1 && 'أدخل بياناتك الشخصية بدقة حتى نتمكن من التواصل معك.'}
                {step === 2 && 'اختر القسم الذي تودّ التطوع فيه داخل EMC.'}
                {step === 3 && 'أخبرنا عن خبرتك ومهاراتك ووقتك المتاح.'}
                {step === 4 && 'راجع بياناتك ثم أرسل طلبك.'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="space-y-6 px-8 py-8"
              >

                {/* ── Step 1: البيانات الشخصية ── */}
                {step === 1 && (
                  <>
                    <Field label="الاسم الكامل" required error={fieldErrors.full_name}>
                      <Input
                        value={form.full_name}
                        onChange={(v) => set('full_name', v)}
                        placeholder="مثال: محمد عبدالله"
                        hasError={!!fieldErrors.full_name}
                      />
                    </Field>

                    <Field label="البريد الإلكتروني" required error={fieldErrors.email}>
                      <Input
                        value={form.email}
                        onChange={(v) => set('email', v)}
                        type="email"
                        placeholder="example@email.com"
                        dir="ltr"
                        hasError={!!fieldErrors.email}
                      />
                    </Field>

                    <Field label="رقم الجوال" required error={fieldErrors.phone}>
                      <Input
                        value={form.phone}
                        onChange={(v) => set('phone', v)}
                        type="tel"
                        placeholder="+31 6 12345678"
                        dir="ltr"
                        hasError={!!fieldErrors.phone}
                      />
                    </Field>

                    <Field label="الدولة" required error={fieldErrors.country}>
                      <CountrySelector
                        value={form.country}
                        onChange={(c) => set('country', c)}
                        error={fieldErrors.country}
                      />
                    </Field>

                    <Field label="المدينة" required error={fieldErrors.city}>
                      <Input
                        value={form.city}
                        onChange={(v) => set('city', v)}
                        placeholder="مثال: أمستردام"
                        hasError={!!fieldErrors.city}
                      />
                    </Field>

                    <Field label="الجنس" required error={fieldErrors.gender}>
                      <div className="flex gap-3">
                        {GENDER_OPTIONS.map((g) => (
                          <button
                            key={g.value}
                            type="button"
                            onClick={() => set('gender', g.value)}
                            className={`flex-1 rounded-xl border py-3.5 text-sm font-black transition ${
                              form.gender === g.value
                                ? 'border-customBlue bg-customBlue/[0.08] text-customBlue'
                                : fieldErrors.gender
                                  ? 'border-red-300 bg-slate-50 text-slate-500'
                                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </>
                )}

                {/* ── Step 2: مجال التطوع ── */}
                {step === 2 && (
                  <Field label="القسم الذي ترغب بالتطوع فيه" required error={fieldErrors.desired_department}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {DEPARTMENTS.map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => set('desired_department', dept)}
                          className={`rounded-2xl border px-5 py-4 text-right text-[13px] font-bold transition ${
                            form.desired_department === dept
                              ? 'border-customBlue bg-customBlue/[0.08] text-customBlue shadow-sm'
                              : fieldErrors.desired_department
                                ? 'border-red-200 bg-slate-50 text-slate-600'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-customBlue/30 hover:bg-sky-50/60'
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                    {fieldErrors.desired_department && (
                      <p className="mt-2 text-[12px] font-bold text-red-600">
                        {fieldErrors.desired_department}
                      </p>
                    )}
                  </Field>
                )}

                {/* ── Step 3: الخبرات والتوفر ── */}
                {step === 3 && (
                  <>
                    <Field label="مستوى الخبرة" required error={fieldErrors.experience_level}>
                      <div className="flex flex-wrap gap-3">
                        {EXPERIENCE_LEVELS.map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => set('experience_level', lvl)}
                            className={`rounded-xl border px-5 py-2.5 text-sm font-bold transition ${
                              form.experience_level === lvl
                                ? 'border-customBlue bg-customBlue text-white shadow-sm'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-customBlue/30'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="التوفر الأسبوعي" required error={fieldErrors.availability}>
                      <SelectInput
                        value={form.availability}
                        onChange={(v) => set('availability', v)}
                        options={AVAILABILITY_OPTIONS}
                        placeholder="اختر التوفر"
                        hasError={!!fieldErrors.availability}
                      />
                    </Field>

                    <Field label="المهارات" error={fieldErrors.skills}>
                      <Textarea
                        value={form.skills}
                        onChange={(v) => set('skills', v)}
                        placeholder="أذكر مهاراتك ذات الصلة (تصميم، برمجة، تدريب، تحرير...)"
                        rows={3}
                      />
                    </Field>

                    <Field label="لماذا ترغب بالتطوع مع EMC؟" required error={fieldErrors.motivation}>
                      <Textarea
                        value={form.motivation}
                        onChange={(v) => set('motivation', v)}
                        placeholder="شارك دوافعك وما تأمل في تحقيقه من خلال التطوع..."
                        rows={4}
                        hasError={!!fieldErrors.motivation}
                      />
                    </Field>

                    <Field label="هل لديك خبرة سابقة في التطوع؟">
                      <Textarea
                        value={form.previous_experience}
                        onChange={(v) => set('previous_experience', v)}
                        placeholder="اختياري — اذكر أي تجارب تطوع سابقة"
                        rows={3}
                      />
                    </Field>

                    <Field label="السيرة الذاتية" error={fieldErrors.cv_file}>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          ref={fileRef}
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="sr-only"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            set('cv_file', e.target.files?.[0] ?? null)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className={`inline-flex items-center gap-2 rounded-xl border border-dashed px-5 py-3 text-sm font-bold transition ${
                            form.cv_file
                              ? 'border-customBlue/50 bg-sky-50 text-customBlue'
                              : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-customBlue/50 hover:bg-sky-50 hover:text-customBlue'
                          }`}
                        >
                          {form.cv_file ? (
                            <>
                              <Paperclip size={16} />
                              <span className="max-w-[240px] truncate">{form.cv_file.name}</span>
                            </>
                          ) : (
                            <>
                              <Upload size={16} />
                              رفع السيرة الذاتية (PDF / DOC / DOCX)
                            </>
                          )}
                        </button>
                        {form.cv_file && (
                          <button
                            type="button"
                            onClick={() => set('cv_file', null)}
                            className="text-[11px] font-bold text-red-500 hover:text-red-700"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    </Field>

                    <Field label="ملاحظات إضافية">
                      <Textarea
                        value={form.notes}
                        onChange={(v) => set('notes', v)}
                        placeholder="اختياري — أي شيء آخر تودّ إضافته"
                        rows={3}
                      />
                    </Field>
                  </>
                )}

                {/* ── Step 4: المراجعة والإرسال ── */}
                {step === 4 && (
                  <>
                    <div className="space-y-1 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/60 px-6 py-2">
                      <ReviewRow label="الاسم" value={form.full_name} />
                      <ReviewRow label="البريد" value={form.email} />
                      <ReviewRow label="الجوال" value={form.phone} />
                      <ReviewRow label="الدولة" value={form.country?.name} />
                      <ReviewRow label="المدينة" value={form.city} />
                      <ReviewRow label="الجنس" value={GENDER_OPTIONS.find(g => g.value === form.gender)?.label} />
                      <ReviewRow label="القسم" value={form.desired_department} />
                      <ReviewRow label="مستوى الخبرة" value={form.experience_level} />
                      <ReviewRow label="التوفر" value={form.availability} />
                      <ReviewRow label="المهارات" value={form.skills} />
                      <ReviewRow label="دافع التطوع" value={form.motivation} />
                      <ReviewRow label="خبرة سابقة" value={form.previous_experience} />
                      <ReviewRow label="السيرة الذاتية" value={form.cv_file?.name} />
                      <ReviewRow label="ملاحظات" value={form.notes} />
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-customBlue/15 bg-customBlue/[0.04] px-5 py-4">
                      <input
                        type="checkbox"
                        checked={form.agree_terms}
                        onChange={(e) => set('agree_terms', e.target.checked)}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-customBlue"
                      />
                      <span className="text-[13px] font-bold leading-relaxed text-deepBlue">
                        أوافق على استخدام بياناتي لغرض مراجعة طلب التطوع والتواصل معي.
                      </span>
                    </label>
                    {fieldErrors.agree_terms && (
                      <p className="text-[12px] font-bold text-red-600">{fieldErrors.agree_terms}</p>
                    )}

                    {submitError && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[13px] font-bold text-red-700">
                        {submitError}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* ── Navigation buttons ── */}
            <div className="flex items-center justify-between border-t border-slate-100 px-8 py-5">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prev}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-black text-deepBlue transition hover:bg-slate-50 disabled:opacity-55"
                >
                  <ArrowRight size={16} />
                  السابق
                </button>
              ) : (
                <Link
                  to="/volunteer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-black text-deepBlue transition hover:bg-slate-50"
                >
                  <ArrowRight size={16} />
                  رجوع
                </Link>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-7 py-2.5 text-[13px] font-black text-white shadow-md shadow-orange-900/15 transition hover:brightness-105"
                >
                  التالي
                  <ArrowLeft size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-deepBlue px-7 py-2.5 text-[13px] font-black text-white shadow-md shadow-deepBlue/25 transition hover:brightness-105 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      جارٍ الإرسال...
                    </>
                  ) : (
                    <>
                      إرسال الطلب
                      <CheckCircle2 size={16} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
