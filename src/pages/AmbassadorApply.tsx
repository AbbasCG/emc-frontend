import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Upload,
  User,
  GraduationCap,
  Star,
  Heart,
  Wrench,
  Crown,
  Clock,
  Handshake,
  Award,
  FolderUp,
  ClipboardCheck,
  Check,
  AlertCircle,
  Info,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import CountrySelector, { type Country, COUNTRIES } from '@/components/ui/CountrySelector'
import EmcDatePicker from '@/components/ui/EmcDatePicker'
import {
  submitAmbassadorApplication,
  defaultAmbassadorForm,
  type AmbassadorApplicationFormData,
} from '@/api/ambassadorApplicationApi'
import { getLaravelFieldErrors } from '@/api/apiErrors'
import toast from '@/lib/toast'

/* ── Enum Option Maps (machine value → Arabic label) ────────────────────── */

const GENDER_OPTIONS = [
  { value: 'male',   label: 'ذكر'  },
  { value: 'female', label: 'أنثى' },
]

const UNIVERSITY_TYPE_OPTIONS = [
  { value: 'public',        label: 'حكومية'  },
  { value: 'private',       label: 'خاصة'    },
  { value: 'international', label: 'دولية'   },
  { value: 'other',         label: 'أخرى'    },
]

const STUDENT_STATUS_OPTIONS = [
  { value: 'student',  label: 'طالب' },
  { value: 'graduate', label: 'خريج' },
];

const STUDY_YEARS = [
  'السنة الأولى',
  'السنة الثانية',
  'السنة الثالثة',
  'السنة الرابعة',
  'السنة الخامسة',
  'السنة السادسة',
  'دراسات عليا',
]

const ALL_INTERESTS = [
  'الذكاء الاصطناعي',
  'تطوير التطبيقات',
  'الأمن السيبراني',
  'تحليل البيانات',
  'التصميم الرقمي',
  'ريادة الأعمال التقنية',
  'التعليم الإلكتروني',
  'إنترنت الأشياء',
  'البلوك تشين',
  'التسويق الرقمي',
  'إدارة المشاريع',
  'العلوم السحابية',
]

const ALL_SKILLS = [
  'Python',
  'JavaScript',
  'التصميم بالـ Figma',
  'Excel / Google Sheets',
  'PowerPoint / Canva',
  'إدارة وسائل التواصل الاجتماعي',
  'كتابة المحتوى',
  'الإلقاء والتقديم',
  'اللغة الإنجليزية',
  'تحليل البيانات',
  'إدارة الفريق',
  'التفاوض والتسويق',
]

const VOLUNTEER_TYPES = [
  'تنظيم فعاليات',
  'تدريس / إرشاد أكاديمي',
  'تقديم دعم تقني',
  'العمل الخيري والمجتمعي',
  'التطوع في ناشئات وشركات',
  'تطوع في جمعيات وأندية طلابية',
]

const STEPS = [
  { id: 1,  label: 'البيانات الشخصية',     icon: User          },
  { id: 2,  label: 'الجامعة والدراسة',      icon: GraduationCap },
  { id: 3,  label: 'دوافع الانضمام',        icon: Star          },
  { id: 4,  label: 'الاهتمامات',            icon: Heart         },
  { id: 5,  label: 'المهارات',              icon: Wrench        },
  { id: 6,  label: 'القيادة والمبادرة',     icon: Crown         },
  { id: 7,  label: 'التوفر والإمكانات',     icon: Clock         },
  { id: 8,  label: 'الخبرة التطوعية',       icon: Handshake     },
  { id: 9,  label: 'الشهادات',              icon: Award         },
  { id: 10, label: 'المستندات',             icon: FolderUp      },
  { id: 11, label: 'المراجعة والإرسال',     icon: ClipboardCheck },
]

/* ── Sub-components ─────────────────────────────────────────────────────── */

function OptionalBadge() {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
      اختياري
    </span>
  )
}

function Field({
  label, error, required, optional, hint, children,
}: {
  label: string
  error?: string
  required?: boolean
  optional?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="block text-right">
      <div className="mb-1.5 flex flex-row-reverse items-center justify-end gap-1.5">
        <span className="text-sm font-black text-deepBlue">
          {label}
          {required && (
            <span className="mr-1 text-red-500" aria-hidden="true">*</span>
          )}
        </span>
        {optional && <OptionalBadge />}
      </div>
      {hint && <span className="mb-1.5 block text-xs text-slate-500">{hint}</span>}
      {children}
      {error && (
        <p className="mt-1.5 text-right text-[12px] font-bold text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function Input({
  id, value, onChange, placeholder, type = 'text', hasError, dir, required, min, max,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hasError?: boolean
  dir?: string
  required?: boolean
  min?: number
  max?: number
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      required={required}
      min={min}
      max={max}
      aria-required={required ? 'true' : undefined}
      aria-invalid={hasError ? 'true' : undefined}
      className={`h-14 w-full rounded-xl border bg-slate-50 px-4 text-right font-semibold text-deepBlue outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-sky-100 ${
        hasError ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-customBlue'
      }`}
    />
  )
}

function TextareaWithCounter({
  id, value, onChange, placeholder, rows = 4, hasError, minLength, maxLength,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  hasError?: boolean
  minLength?: number
  maxLength?: number
}) {
  const len = value.length
  const tooShort = minLength !== undefined && len > 0 && len < minLength
  const atMax    = maxLength !== undefined && len >= maxLength

  return (
    <div>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="rtl"
        maxLength={maxLength}
        aria-invalid={hasError ? 'true' : undefined}
        className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-sky-100 ${
          hasError ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-customBlue'
        }`}
      />
      <div className="mt-1 flex items-center justify-between">
        <span
          className={`text-[11px] font-semibold ${
            tooShort ? 'text-amber-600' : atMax ? 'text-red-500' : 'text-slate-400'
          }`}
        >
          {len}{maxLength !== undefined ? ` / ${maxLength}` : ''}
        </span>
        {minLength !== undefined && len < minLength && (
          <span className="text-[11px] text-slate-400">الحد الأدنى {minLength} حرف</span>
        )}
      </div>
    </div>
  )
}

function Select({
  id, value, onChange, options, placeholder, hasError,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  hasError?: boolean
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={hasError ? 'true' : undefined}
        className={`h-14 w-full cursor-pointer appearance-none rounded-xl border bg-slate-50 px-4 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${
          hasError ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-customBlue'
        } ${!value ? 'text-slate-400' : ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

/** Select that stores machine values but displays Arabic labels */
function LabeledSelect({
  id, value, onChange, options, placeholder, hasError,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  hasError?: boolean
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={hasError ? 'true' : undefined}
        className={`h-14 w-full cursor-pointer appearance-none rounded-xl border bg-slate-50 px-4 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${
          hasError ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-customBlue'
        } ${!value ? 'text-slate-400' : ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function Toggle({
  checked, onChange, label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-right transition hover:border-customBlue/30 hover:bg-white"
    >
      <span className="text-sm font-semibold text-deepBlue">{label}</span>
      <div
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-customBlue' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
            checked ? 'right-0.5' : 'left-0.5'
          }`}
        />
      </div>
    </button>
  )
}

function TagPicker({
  options, selected, onChange, hasError,
}: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  hasError?: boolean
}) {
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt])
  }
  return (
    <div className={`rounded-xl border p-4 ${hasError ? 'border-red-400' : 'border-slate-200'} bg-slate-50`}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(opt)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? 'bg-customBlue text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-customBlue/40'
              }`}
            >
              {active && <Check size={11} />}
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FileUploadZone({
  label, file, onFile, accept, hasError, hint,
}: {
  label: string
  file: File | null
  onFile: (f: File | null) => void
  accept?: string
  hasError?: boolean
  hint?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      <span className="mb-1.5 block text-sm font-black text-deepBlue">{label}</span>
      {hint && <span className="mb-2 block text-xs text-slate-500">{hint}</span>}
      <div
        onClick={() => ref.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition hover:border-customBlue/50 hover:bg-customBlue/[0.03] ${
          hasError
            ? 'border-red-400 bg-red-50/30'
            : file
            ? 'border-customBlue/40 bg-customBlue/[0.03]'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="text-customBlue" size={28} />
            <p className="text-sm font-bold text-customBlue">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="text-slate-400" size={28} />
            <p className="text-sm font-semibold text-slate-500">اضغط لرفع الملف</p>
            <p className="text-xs text-slate-400">{accept}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Error Summary ───────────────────────────────────────────────────────── */

function ErrorSummary({ errors }: { errors: FieldErrors }) {
  const entries = Object.values(errors).filter(Boolean) as string[]
  if (entries.length === 0) return null
  return (
    <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <AlertCircle size={16} className="shrink-0 text-red-500" />
        <span className="text-sm font-black text-red-700">يرجى تصحيح الأخطاء التالية:</span>
      </div>
      <ul className="space-y-1 text-right">
        {entries.map((msg, i) => (
          <li key={i} className="flex items-center gap-2 text-[12px] font-semibold text-red-600">
            <span className="h-1 w-1 shrink-0 rounded-full bg-red-400" />
            {msg}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Step Validation ─────────────────────────────────────────────────────── */

type FieldErrors = Partial<Record<string, string>>

function validateStep(step: number, form: AmbassadorApplicationFormData): FieldErrors {
  const err: FieldErrors = {}

  if (step === 1) {
    if (!form.full_name.trim())
      err.full_name = 'الاسم الكامل مطلوب'
    if (!form.email.trim())
      err.email = 'البريد الإلكتروني مطلوب'
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      err.email = 'البريد الإلكتروني غير صحيح'
    if (!form.mobile_phone.trim())
      err.mobile_phone = 'رقم الهاتف مطلوب'
    if (!form.nationality.trim())
      err.nationality = 'الجنسية مطلوبة'
    if (!form.gender)
      err.gender = 'الجنس مطلوب'
    if (!form.country)
      err.country = 'الدولة مطلوبة'
    if (!form.city.trim())
      err.city = 'المدينة مطلوبة'
  }

  if (step === 2) {
    if (!form.university_name.trim())
      err.university_name = 'اسم الجامعة مطلوب'
    if (!form.faculty.trim())
      err.faculty = 'الكلية مطلوبة'
    if (!form.major.trim())
      err.major = 'التخصص مطلوب'
    if (!form.study_year)
      err.study_year = 'السنة الدراسية مطلوبة'
  }

  if (step === 3) {
    if (!form.motivation_why.trim())
      err.motivation_why = 'هذا الحقل مطلوب'
    else if (form.motivation_why.trim().length < 50)
      err.motivation_why = 'الرجاء الكتابة بتفصيل أكثر (50 حرف على الأقل)'

    if (!form.contribution_what.trim())
      err.contribution_what = 'هذا الحقل مطلوب'
    else if (form.contribution_what.trim().length < 50)
      err.contribution_what = 'الرجاء الكتابة بتفصيل أكثر (50 حرف على الأقل)'

    if (!form.expected_gain.trim())
      err.expected_gain = 'هذا الحقل مطلوب'
    else if (form.expected_gain.trim().length < 20)
      err.expected_gain = 'الرجاء الكتابة بتفصيل أكثر (20 حرف على الأقل)'
  }

  if (step === 4) {
    if (form.interests.length === 0)
      err.interests = 'اختر اهتماماً واحداً على الأقل'
  }

  if (step === 5) {
    if (form.skills.length === 0)
      err.skills = 'اختر مهارة واحدة على الأقل'
  }

  if (step === 6) {
    if (form.has_organized_events && !form.events_attendees_count.trim())
      err.events_attendees_count = 'عدد الحضور مطلوب عند تنظيم فعاليات'
  }

  if (step === 7) {
    if (!form.weekly_hours_available.trim()) {
      err.weekly_hours_available = 'الساعات الأسبوعية المتاحة مطلوبة'
    } else {
      const n = Number(form.weekly_hours_available)
      if (!Number.isInteger(n) || n < 1)
        err.weekly_hours_available = 'أدخل رقماً صحيحاً (1 على الأقل)'
      else if (n > 168)
        err.weekly_hours_available = 'الحد الأقصى 168 ساعة أسبوعياً'
    }
  }

  if (step === 10) {
    if (!form.cv_file)
      err.cv_file = 'السيرة الذاتية مطلوبة (PDF)'
  }

  if (step === 11) {
    if (!form.agree_terms)
      err.agree_terms = 'يجب الموافقة على الشروط للمتابعة'
  }

  return err
}

/* ── Main Component ──────────────────────────────────────────────────────── */

export default function AmbassadorApply() {
  const navigate = useNavigate()

  const [currentStep, setCurrentStep]       = useState(1)
  const [form, setForm]                     = useState<AmbassadorApplicationFormData>(defaultAmbassadorForm)
  const [errors, setErrors]                 = useState<FieldErrors>({})
  const [submitting, setSubmitting]         = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const topRef          = useRef<HTMLDivElement>(null)
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  const set = useCallback(<K extends keyof AmbassadorApplicationFormData>(
    key: K,
    val: AmbassadorApplicationFormData[K],
  ) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val }
      if (key === 'has_organized_events' && !val) {
        next.events_attendees_count = ''
      }
      return next
    })
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }, [])

  const setCountry = useCallback((c: Country) => {
    setForm((prev) => ({ ...prev, country: c.name }))
    setErrors((prev) => ({ ...prev, country: undefined }))
  }, [])

  const surfaceErrors = useCallback((errs: FieldErrors) => {
    requestAnimationFrame(() => {
      errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const firstKey = Object.keys(errs).find((k) => errs[k])
      if (firstKey) {
        document.getElementById(firstKey)?.focus()
      }
    })
  }, [])

  const goNext = () => {
    const errs = validateStep(currentStep, form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setCompletedSteps((prev) => {
        const s = new Set(prev)
        s.delete(currentStep)
        return s
      })
      surfaceErrors(errs)
      return
    }
    setErrors({})
    setCompletedSteps((prev) => new Set([...prev, currentStep]))
    setCurrentStep((s) => Math.min(s + 1, STEPS.length))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const goPrev = () => {
    setErrors({})
    setCurrentStep((s) => Math.max(s - 1, 1))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    // Revalidate the final step (consent)
    const errs = validateStep(11, form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      surfaceErrors(errs)
      return
    }

    if (submitting) return
    setSubmitting(true)

    try {
      const result = await submitAmbassadorApplication(form)
      toast.success('تم إرسال طلبك بنجاح.')
      navigate('/ambassador/application-success', { state: result, replace: true })
    } catch (err: unknown) {
      // 409 → duplicate already-submitted application
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        const data = (err as { response?: { data?: { message?: string; data?: { reference_number?: string } } } })
          ?.response?.data
        const refNum = data?.data?.reference_number
        toast.error(
          refNum
            ? `لقد تم إرسال طلب سابق بهذا البريد الإلكتروني. رقم الطلب: ${refNum}`
            : 'لقد تم إرسال طلب سابق بهذا البريد الإلكتروني.',
        )
        return
      }

      // 422 → field validation errors from backend
      const fieldErrors = getLaravelFieldErrors(err)
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        surfaceErrors(fieldErrors)
        toast.error('يرجى مراجعة الحقول المطلوبة قبل إرسال الطلب.')
        return
      }

      toast.error('حدث خطأ غير متوقع أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Derived values ──────────────────────────────────────────────────── */
  const progress = (completedSteps.size / STEPS.length) * 100

  // Resolve the full Country object from the stored Arabic name so CountrySelect renders correctly
  const countryValue: Country | null = form.country
    ? (COUNTRIES.find((c) => c.name === form.country) ?? null)
    : null

  /* ── Main render ─────────────────────────────────────────────────────── */
  return (
    <main className="bg-[#f4f7fb] pt-20" ref={topRef}>
      <PageHeader
        title="طلب الانضمام لبرنامج السفراء"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'سفراء التحول الرقمي', href: '/ambassador' },
          { label: 'تقديم الطلب' },
        ]}
      />

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">

          {/* ── Progress bar ─────────────────────────────────────────── */}
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>الخطوة {currentStep} من {STEPS.length}</span>
              <span>{Math.round(progress)}% مكتمل</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-customBlue to-customBlue/70"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              />
            </div>
          </div>

          {/* ── Step navigation — mobile compact ─────────────────────── */}
          <div className="mb-8 flex items-center gap-3 sm:hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-deepBlue text-xs font-black text-white">
              {currentStep}
            </div>
            <div>
              <p className="text-sm font-black text-deepBlue">{STEPS[currentStep - 1].label}</p>
              <p className="text-xs text-slate-500">الخطوة {currentStep} من {STEPS.length}</p>
            </div>
          </div>

          {/* ── Step navigation — desktop flex-wrap (no scroll) ──────── */}
          <div className="mb-8 hidden sm:flex sm:flex-wrap sm:gap-2">
            {STEPS.map((s) => {
              const Icon   = s.icon
              const done   = completedSteps.has(s.id)
              const active = s.id === currentStep
              // A future step is accessible only if all preceding steps are completed
              const locked = s.id > currentStep && !completedSteps.has(s.id)

              const handleStepClick = () => {
                if (active) return

                if (locked) {
                  // Validate and navigate to the first incomplete step before this one
                  for (let i = 1; i < s.id; i++) {
                    if (!completedSteps.has(i)) {
                      const stepErrs = validateStep(i, form)
                      setCurrentStep(i)
                      setErrors(stepErrs)
                      surfaceErrors(stepErrs)
                      toast.error('يرجى إكمال الخطوات السابقة بشكل صحيح قبل الانتقال إلى هذه الخطوة.')
                      topRef.current?.scrollIntoView({ behavior: 'smooth' })
                      return
                    }
                  }
                }

                setErrors({})
                setCurrentStep(s.id)
                topRef.current?.scrollIntoView({ behavior: 'smooth' })
              }

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={handleStepClick}
                  aria-current={active ? 'step' : undefined}
                  aria-disabled={locked ? 'true' : undefined}
                  aria-label={`${s.label}${done ? ' (مكتمل)' : locked ? ' (مقفل)' : ''}`}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue focus-visible:ring-offset-2 ${
                    active
                      ? 'bg-deepBlue text-white shadow-md'
                      : done
                      ? 'cursor-pointer bg-customBlue/[0.08] text-customBlue hover:bg-customBlue/[0.14]'
                      : locked
                      ? 'cursor-not-allowed bg-white text-slate-300 ring-1 ring-slate-100'
                      : 'cursor-pointer bg-white text-slate-400 ring-1 ring-slate-100 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                >
                  {done && !active ? <Check size={12} /> : <Icon size={12} />}
                  {s.label}
                </button>
              )
            })}
          </div>

          {/* ── Step navigation hint ─────────────────────────────────── */}
          <div className="mb-8 flex items-start gap-2 rounded-xl border border-[#0077B6]/20 bg-[#0077B6]/[0.06] px-3.5 py-2.5 text-[11px] font-bold text-[#0077B6]">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>يمكنك التنقل بين الخطوات المكتملة بالنقر على اسم الخطوة.</span>
          </div>

          {/* ── Step card ────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 sm:p-8"
            >
              {/* Step header */}
              <div className="mb-6 border-b border-slate-100 pb-5">
                {(() => {
                  const step = STEPS[currentStep - 1]
                  const Icon = step.icon
                  return (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-deepBlue/[0.07]">
                        <Icon className="text-deepBlue" size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">الخطوة {step.id}</p>
                        <h3 className="text-lg font-black text-deepBlue">{step.label}</h3>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Error summary — appears at top of card when Next fails */}
              <div ref={errorSummaryRef}>
                <ErrorSummary errors={errors} />
              </div>

              {/* ── STEP CONTENT ── */}
              <div className="grid gap-5">

                {/* ── Step 1: Personal data ──────────────────────────── */}
                {currentStep === 1 && (
                  <>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="الاسم الكامل" error={errors.full_name} required>
                        <Input
                          id="full_name"
                          value={form.full_name}
                          onChange={(v) => set('full_name', v)}
                          placeholder="الاسم بالكامل"
                          hasError={!!errors.full_name}
                          required
                        />
                      </Field>
                      <Field label="البريد الإلكتروني" error={errors.email} required>
                        <Input
                          id="email"
                          value={form.email}
                          onChange={(v) => set('email', v)}
                          type="email"
                          placeholder="example@email.com"
                          dir="ltr"
                          hasError={!!errors.email}
                          required
                        />
                      </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="رقم الهاتف" error={errors.mobile_phone} required>
                        <Input
                          id="mobile_phone"
                          value={form.mobile_phone}
                          onChange={(v) => set('mobile_phone', v)}
                          placeholder="+966 5X XXX XXXX"
                          dir="ltr"
                          hasError={!!errors.mobile_phone}
                          required
                        />
                      </Field>
                      <Field label="الجنسية" error={errors.nationality} required>
                        <Input
                          id="nationality"
                          value={form.nationality}
                          onChange={(v) => set('nationality', v)}
                          placeholder="مثال: سعودي، يمني…"
                          hasError={!!errors.nationality}
                          required
                        />
                      </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="الجنس" error={errors.gender} required>
                        <div role="radiogroup" aria-required="true" aria-label="الجنس" className="flex gap-3">
                          {GENDER_OPTIONS.map((g) => (
                            <button
                              key={g.value}
                              type="button"
                              role="radio"
                              aria-checked={form.gender === g.value}
                              onClick={() => set('gender', g.value)}
                              className={`h-14 flex-1 rounded-xl border font-bold text-sm transition ${
                                form.gender === g.value
                                  ? 'border-customBlue bg-customBlue text-white'
                                  : 'border-slate-200 bg-slate-50 text-deepBlue hover:border-customBlue/40'
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <div>
                        <EmcDatePicker
                          label="تاريخ الميلاد"
                          value={form.date_of_birth}
                          onChange={(v) => set('date_of_birth', v)}
                          error={errors.date_of_birth}
                          layout="stacked"
                          minDate={`${new Date().getFullYear() - 100}-01-01`}
                          maxDate={new Date().toISOString().slice(0, 10)}
                          showPresets={false}
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="الدولة" error={errors.country} required>
                        <div className={errors.country ? 'rounded-xl ring-2 ring-red-300' : undefined}>
                          <CountrySelector value={countryValue} onChange={setCountry} />
                        </div>
                      </Field>
                      <Field label="المدينة" error={errors.city} required>
                        <Input
                          id="city"
                          value={form.city}
                          onChange={(v) => set('city', v)}
                          placeholder="المدينة"
                          hasError={!!errors.city}
                          required
                        />
                      </Field>
                    </div>
                  </>
                )}

                {/* ── Step 2: University ────────────────────────────── */}
                {currentStep === 2 && (
                  <>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="اسم الجامعة" error={errors.university_name} required>
                        <Input
                          id="university_name"
                          value={form.university_name}
                          onChange={(v) => set('university_name', v)}
                          placeholder="اسم الجامعة"
                          hasError={!!errors.university_name}
                          required
                        />
                      </Field>
                      <Field label="نوع الجامعة" error={errors.university_type} optional>
                        <LabeledSelect
                          id="university_type"
                          value={form.university_type}
                          onChange={(v) => set('university_type', v)}
                          options={UNIVERSITY_TYPE_OPTIONS}
                          placeholder="اختر النوع"
                          hasError={!!errors.university_type}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="الكلية" error={errors.faculty} required>
                        <Input
                          id="faculty"
                          value={form.faculty}
                          onChange={(v) => set('faculty', v)}
                          placeholder="كلية الحاسب / الاقتصاد..."
                          hasError={!!errors.faculty}
                          required
                        />
                      </Field>
                      <Field label="التخصص" error={errors.major} required>
                        <Input
                          id="major"
                          value={form.major}
                          onChange={(v) => set('major', v)}
                          placeholder="علوم الحاسب / الهندسة..."
                          hasError={!!errors.major}
                          required
                        />
                      </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="السنة الدراسية" error={errors.study_year} required>
                        <Select
                          id="study_year"
                          value={form.study_year}
                          onChange={(v) => set('study_year', v)}
                          options={STUDY_YEARS}
                          placeholder="اختر السنة"
                          hasError={!!errors.study_year}
                        />
                      </Field>
                      <Field label="حالة الطالب" error={errors.student_status} optional>
                        <LabeledSelect
                          id="student_status"
                          value={form.student_status}
                          onChange={(v) => set('student_status', v)}
                          options={STUDENT_STATUS_OPTIONS}
                          placeholder="اختر الحالة"
                          hasError={!!errors.student_status}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="الرقم الجامعي" error={errors.student_number} optional>
                        <Input
                          id="student_number"
                          value={form.student_number}
                          onChange={(v) => set('student_number', v)}
                          placeholder="الرقم الجامعي"
                          dir="ltr"
                          hasError={!!errors.student_number}
                        />
                      </Field>
                      <div>
                        <EmcDatePicker
                          label="التخرج المتوقع"
                          value={form.expected_graduation_date}
                          onChange={(v) => set('expected_graduation_date', v)}
                          error={errors.expected_graduation_date}
                          layout="stacked"
                          minDate={new Date().toISOString().slice(0, 10)}
                          maxDate={`${new Date().getFullYear() + 10}-12-31`}
                          showPresets={false}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ── Step 3: Motivation ────────────────────────────── */}
                {currentStep === 3 && (
                  <>
                    <Field
                      label="لماذا تريد أن تكون سفيراً للتحول الرقمي؟"
                      error={errors.motivation_why}
                      required
                      hint="50 حرف على الأقل"
                    >
                      <TextareaWithCounter
                        id="motivation_why"
                        value={form.motivation_why}
                        onChange={(v) => set('motivation_why', v)}
                        placeholder="شارك دوافعك وأسبابك..."
                        rows={5}
                        hasError={!!errors.motivation_why}
                        minLength={50}
                        maxLength={2000}
                      />
                    </Field>

                    <Field
                      label="ما الذي ستضيفه لمجتمعك الجامعي كسفير؟"
                      error={errors.contribution_what}
                      required
                      hint="50 حرف على الأقل"
                    >
                      <TextareaWithCounter
                        id="contribution_what"
                        value={form.contribution_what}
                        onChange={(v) => set('contribution_what', v)}
                        placeholder="وصف تصورك لدورك ومساهمتك..."
                        rows={5}
                        hasError={!!errors.contribution_what}
                        minLength={50}
                        maxLength={2000}
                      />
                    </Field>

                    <Field
                      label="ما الذي تتوقع اكتسابه من البرنامج؟"
                      error={errors.expected_gain}
                      required
                      hint="20 حرف على الأقل"
                    >
                      <TextareaWithCounter
                        id="expected_gain"
                        value={form.expected_gain}
                        onChange={(v) => set('expected_gain', v)}
                        placeholder="مهارات، شبكة علاقات، خبرات..."
                        rows={4}
                        hasError={!!errors.expected_gain}
                        minLength={20}
                        maxLength={2000}
                      />
                    </Field>

                    <Field label="أكبر إنجاز حققته" error={errors.biggest_achievement} optional>
                      <TextareaWithCounter
                        id="biggest_achievement"
                        value={form.biggest_achievement}
                        onChange={(v) => set('biggest_achievement', v)}
                        placeholder="إنجاز تفخر به..."
                        rows={3}
                        maxLength={2000}
                      />
                    </Field>

                    <Field label="أكبر تحدٍّ واجهته وكيف تغلبت عليه" error={errors.biggest_challenge} optional>
                      <TextareaWithCounter
                        id="biggest_challenge"
                        value={form.biggest_challenge}
                        onChange={(v) => set('biggest_challenge', v)}
                        placeholder="قصة تحدٍّ حقيقية..."
                        rows={3}
                        maxLength={2000}
                      />
                    </Field>

                    <div className="space-y-3 pt-2">
                      <p className="text-sm font-black text-deepBlue">الخبرات السابقة (اختر ما ينطبق)</p>
                      <Toggle checked={form.has_volunteer_experience}          onChange={(v) => set('has_volunteer_experience', v)}          label="سبق لي العمل التطوعي" />
                      <Toggle checked={form.has_event_organization_experience} onChange={(v) => set('has_event_organization_experience', v)} label="سبق لي تنظيم فعاليات" />
                      <Toggle checked={form.has_teaching_experience}           onChange={(v) => set('has_teaching_experience', v)}           label="سبق لي التدريس أو الإرشاد" />
                      <Toggle checked={form.has_student_club_involvement}      onChange={(v) => set('has_student_club_involvement', v)}      label="أنا عضو أو قيادي في نادٍ طلابي" />
                    </div>

                    <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                      <Field label="إنستغرام"           error={errors.social_instagram} optional>
                        <Input id="social_instagram" value={form.social_instagram} onChange={(v) => set('social_instagram', v)} placeholder="@username"          dir="ltr" hasError={!!errors.social_instagram} />
                      </Field>
                      <Field label="لينكد إن"           error={errors.social_linkedin} optional>
                        <Input id="social_linkedin"  value={form.social_linkedin}  onChange={(v) => set('social_linkedin', v)}  placeholder="linkedin.com/in/..." dir="ltr" hasError={!!errors.social_linkedin}  />
                      </Field>
                      <Field label="فيسبوك"             error={errors.social_facebook} optional>
                        <Input id="social_facebook"  value={form.social_facebook}  onChange={(v) => set('social_facebook', v)}  placeholder="facebook.com/..."   dir="ltr" hasError={!!errors.social_facebook}  />
                      </Field>
                      <Field label="تيك توك"            error={errors.social_tiktok} optional>
                        <Input id="social_tiktok"    value={form.social_tiktok}    onChange={(v) => set('social_tiktok', v)}    placeholder="@username"          dir="ltr" hasError={!!errors.social_tiktok}    />
                      </Field>
                      <Field label="غيت هاب"            error={errors.social_github} optional>
                        <Input id="social_github"    value={form.social_github}    onChange={(v) => set('social_github', v)}    placeholder="github.com/..."     dir="ltr" hasError={!!errors.social_github}    />
                      </Field>
                      <Field label="عدد المتابعين (تقريباً)" error={errors.followers_count} optional>
                        <Input id="followers_count"  value={form.followers_count}  onChange={(v) => set('followers_count', v)}  placeholder="1000" type="number" dir="ltr" hasError={!!errors.followers_count}  min={0} />
                      </Field>
                    </div>
                  </>
                )}

                {/* ── Step 4: Interests ─────────────────────────────── */}
                {currentStep === 4 && (
                  <Field label="اختر مجالات اهتمامك (واحد على الأقل)" error={errors.interests} required>
                    <TagPicker options={ALL_INTERESTS} selected={form.interests} onChange={(v) => set('interests', v)} hasError={!!errors.interests} />
                  </Field>
                )}

                {/* ── Step 5: Skills ────────────────────────────────── */}
                {currentStep === 5 && (
                  <Field label="اختر مهاراتك الرئيسية (واحدة على الأقل)" error={errors.skills} required>
                    <TagPicker options={ALL_SKILLS} selected={form.skills} onChange={(v) => set('skills', v)} hasError={!!errors.skills} />
                  </Field>
                )}

                {/* ── Step 6: Leadership ────────────────────────────── */}
                {currentStep === 6 && (
                  <>
                    <div className="space-y-3">
                      <p className="text-sm font-black text-deepBlue">الخبرة القيادية</p>
                      <Toggle checked={form.has_led_team}               onChange={(v) => set('has_led_team', v)}               label="قدت فريقاً من قبل" />
                      <Toggle checked={form.has_organized_events}       onChange={(v) => set('has_organized_events', v)}       label="نظمت فعاليات جماهيرية" />
                      <Toggle checked={form.has_represented_university} onChange={(v) => set('has_represented_university', v)} label="مثّلت جامعتك في فعاليات خارجية" />
                    </div>

                    {form.has_organized_events && (
                      <Field
                        label="تقريباً كم عدد الحضور في أكبر فعالية نظمتها؟"
                        error={errors.events_attendees_count}
                        required
                      >
                        <Input
                          id="events_attendees_count"
                          value={form.events_attendees_count}
                          onChange={(v) => set('events_attendees_count', v)}
                          placeholder="مثال: 100"
                          type="number"
                          dir="ltr"
                          hasError={!!errors.events_attendees_count}
                          min={0}
                          required
                        />
                      </Field>
                    )}
                  </>
                )}

                {/* ── Step 7: Availability ──────────────────────────── */}
                {currentStep === 7 && (
                  <>
                    <Field
                      label="كم ساعة أسبوعياً يمكنك تخصيصها للبرنامج؟"
                      error={errors.weekly_hours_available}
                      required
                      hint="رقم صحيح بين 1 و 168"
                    >
                      <Input
                        id="weekly_hours_available"
                        value={form.weekly_hours_available}
                        onChange={(v) => set('weekly_hours_available', v)}
                        type="number"
                        placeholder="مثال: 5"
                        dir="ltr"
                        hasError={!!errors.weekly_hours_available}
                        min={1}
                        max={168}
                        required
                      />
                    </Field>

                    <div className="space-y-3 pt-2">
                      <p className="text-sm font-black text-deepBlue">الإمكانات المتاحة</p>
                      <Toggle checked={form.can_attend_university_events} onChange={(v) => set('can_attend_university_events', v)} label="يمكنني حضور فعاليات داخل الجامعة" />
                      <Toggle checked={form.can_represent_emc_outside}    onChange={(v) => set('can_represent_emc_outside', v)}    label="يمكنني تمثيل EMC في فعاليات خارجية" />
                      <Toggle checked={form.can_travel}                   onChange={(v) => set('can_travel', v)}                   label="يمكنني السفر إذا تطلب البرنامج ذلك" />
                      <Toggle checked={form.owns_laptop}                  onChange={(v) => set('owns_laptop', v)}                  label="أمتلك حاسباً محمولاً" />
                      <Toggle checked={form.has_stable_internet}          onChange={(v) => set('has_stable_internet', v)}          label="أمتلك اتصالاً مستقراً بالإنترنت" />
                      <Toggle checked={form.can_attend_weekly_meetings}   onChange={(v) => set('can_attend_weekly_meetings', v)}   label="يمكنني حضور اجتماعات أسبوعية دورية" />
                    </div>
                  </>
                )}

                {/* ── Step 8: Volunteer experience ──────────────────── */}
                {currentStep === 8 && (
                  <Field label="أنواع الخبرة التطوعية التي لديك" error={errors.volunteer_experience_types} optional>
                    <TagPicker options={VOLUNTEER_TYPES} selected={form.volunteer_experience_types} onChange={(v) => set('volunteer_experience_types', v)} />
                  </Field>
                )}

                {/* ── Step 9: Certifications ────────────────────────── */}
                {currentStep === 9 && (
                  <>
                    <Field label="الشهادات والدورات (اكتب كل شهادة في سطر)" error={errors.certifications} optional>
                      <TextareaWithCounter
                        id="certifications"
                        value={form.certifications.join('\n')}
                        onChange={(v) => set('certifications', v.split('\n').filter(Boolean))}
                        placeholder={'Google Data Analytics Certificate\nAWS Cloud Practitioner\nScrum Fundamentals'}
                        rows={5}
                        maxLength={2000}
                      />
                    </Field>

                    <div>
                      <p className="mb-2 flex items-center gap-2 text-sm font-black text-deepBlue">
                        ملفات الشهادات <OptionalBadge />
                      </p>
                      <div
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.multiple = true
                          input.accept = 'image/*,.pdf'
                          input.onchange = (e) => {
                            const files = Array.from((e.target as HTMLInputElement).files ?? [])
                            set('certificate_files', files)
                          }
                          input.click()
                        }}
                        className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition hover:border-customBlue/50 hover:bg-customBlue/[0.03]"
                      >
                        <Upload className="mx-auto mb-2 text-slate-400" size={28} />
                        <p className="text-sm font-semibold text-slate-500">رفع ملفات الشهادات (يمكن اختيار أكثر من ملف)</p>
                        {form.certificate_files.length > 0 && (
                          <p className="mt-2 text-xs font-bold text-customBlue">{form.certificate_files.length} ملفات مختارة</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Step 10: Documents ────────────────────────────── */}
                {currentStep === 10 && (
                  <>
                    <FileUploadZone
                      label="السيرة الذاتية (مطلوب) *"
                      file={form.cv_file}
                      onFile={(f) => set('cv_file', f)}
                      accept=".pdf"
                      hasError={!!errors.cv_file}
                      hint="PDF فقط، حجم أقصى 5 ميغابايت"
                    />
                    {errors.cv_file && (
                      <p className="text-[12px] font-bold text-red-600" role="alert">{errors.cv_file}</p>
                    )}
                    <FileUploadZone
                      label="بطاقة الطالب الجامعي"
                      file={form.student_id_file}
                      onFile={(f) => set('student_id_file', f)}
                      accept="image/*,.pdf"
                      hint="صورة واضحة أو PDF — اختياري"
                    />
                    <FileUploadZone
                      label="صورة شخصية رسمية"
                      file={form.photo_file}
                      onFile={(f) => set('photo_file', f)}
                      accept="image/jpeg,image/png,image/webp"
                      hint="JPG أو PNG أو WebP، حجم أقصى 2 ميغابايت — اختياري"
                    />
                  </>
                )}

                {/* ── Step 11: Review & Submit ──────────────────────── */}
                {currentStep === 11 && (
                  <>
                    <div className="space-y-4 rounded-2xl bg-slate-50 p-5 text-sm">
                      <SummaryRow label="الاسم"             value={form.full_name} />
                      <SummaryRow label="البريد الإلكتروني" value={form.email} />
                      <SummaryRow label="الهاتف"            value={form.mobile_phone} />
                      <SummaryRow label="الجامعة"           value={form.university_name} />
                      <SummaryRow label="التخصص"            value={form.major} />
                      <SummaryRow label="السنة"             value={form.study_year} />
                      <SummaryRow label="الاهتمامات"        value={form.interests.join('، ')} />
                      <SummaryRow label="المهارات"          value={form.skills.join('، ')} />
                      <SummaryRow label="السيرة الذاتية"    value={form.cv_file?.name ?? '—'} />
                    </div>

                    <div
                      role="checkbox"
                      aria-checked={form.agree_terms}
                      tabIndex={0}
                      onClick={() => set('agree_terms', !form.agree_terms)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault()
                          set('agree_terms', !form.agree_terms)
                        }
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 focus:outline-none focus:ring-2 focus:ring-customBlue/30"
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                          form.agree_terms ? 'border-customBlue bg-customBlue' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {form.agree_terms && <Check size={12} className="text-white" />}
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        أوافق على أن المعلومات المقدمة صحيحة، وأسمح لمنصة EMC باستخدام بياناتي لأغراض البرنامج.
                      </p>
                    </div>
                    {errors.agree_terms && (
                      <p className="text-[12px] font-bold text-red-600" role="alert">{errors.agree_terms}</p>
                    )}
                  </>
                )}

              </div>
            </motion.div>
          </AnimatePresence>

          {/* ── Navigation buttons ──────────────────────────────────── */}
          <div className="mt-6 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={goPrev}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-extrabold text-deepBlue transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                <ArrowRight size={16} />
                السابق
              </button>
            ) : (
              <Link
                to="/ambassador"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-extrabold text-deepBlue transition hover:bg-slate-50"
              >
                <ArrowRight size={16} />
                رجوع
              </Link>
            )}

            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-2xl bg-deepBlue px-8 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-deepBlue/90"
              >
                التالي
                <ArrowLeft size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-customOrange px-8 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
                {!submitting && <ArrowLeft size={16} />}
              </button>
            )}
          </div>

        </div>
      </section>
    </main>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="text-right font-semibold text-deepBlue">{value || '—'}</span>
    </div>
  )
}
