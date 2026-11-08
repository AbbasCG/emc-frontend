import { useState, useEffect, useRef } from 'react'
import { DEPARTMENTS_GUIDE } from '@/data/departmentsGuide'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  GraduationCap,
  Sparkles,
  HeartHandshake,
  Compass,
  Check,
  Send,
  RotateCcw,
  Building2,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PublicSeo from '@/components/public/PublicSeo'
import { CvFileField } from '@/components/ui/CvFileField'
import CountrySelector, { type Country, COUNTRIES } from '@/components/ui/CountrySelector'
import { countryFromPhone } from '@/lib/countryFromPhone'
import { submitVolunteerApplication } from '@/api/volunteerApplicationApi'
import { assessmentLegacyFields } from '@/utils/volunteerApplyLegacyFields'
import { getApiErrorMessage, getLaravelFieldErrors } from '@/api/apiErrors'
import toast from '@/lib/toast'
import {
  GENDER_OPTIONS,
  EDUCATION_LEVELS,
  CURRENT_STATUS_OPTIONS,
  VOLUNTEER_DAYS_AVAILABILITY,
  DAYS_OF_WEEK,
  TIME_SLOT_OPTIONS,
  DAILY_HOURS_OPTIONS,
  IN_PERSON_OPTIONS,
  REMOTE_OPTIONS,
  PAST_VOLUNTEER_DURATIONS,
  PAST_VOLUNTEER_TASKS,
  PERSONAL_SKILLS_OPTIONS,
  SKILL_RATINGS,
  TECHNICAL_TOOLS_OPTIONS,
  PORTFOLIO_STATUS_OPTIONS,
  LIKERT_SCALE,
  MOTIVATION_STATEMENTS,
  COMMITMENT_STATEMENTS,
  SITUATIONAL_QUESTIONS,
  EXPECTED_VOLUNTEER_DURATIONS,
  THREE_MONTHS_COMMITMENT_OPTIONS,
  REASONS_FOR_APPLYING,
  EXPECTED_GAINS,
  DEPARTMENT_SKILLS_MATRIX,
  WORK_ENVIRONMENT_PREFERENCES,
  QUIT_REASONS_OPTIONS,
  CONSENT_TEXT,
} from '@/components/volunteerOpportunities/volunteerFormSpec'

/* ── Constants ──────────────────────────────────────────────────────── */

const DEPARTMENTS = [...DEPARTMENTS_GUIDE.map((d) => d.name)]

const STEPS = [
  { id: 1, title: 'البيانات الشخصية', subtitle: 'التعريف والتواصل', icon: User },
  { id: 2, title: 'المؤهلات والتفرغ', subtitle: 'التعليم والأوقات المتاحة', icon: GraduationCap },
  { id: 3, title: 'الخبرات والقدرات', subtitle: 'المهارات والأدوات السابقة', icon: Sparkles },
  { id: 4, title: 'الدافعية والجدية', subtitle: 'المواقف الواقعية والالتزام', icon: HeartHandshake },
  { id: 5, title: 'التوقعات والإدارات', subtitle: 'اختيار الإدارة والإرسال', icon: Compass },
]

const DRAFT_KEY = 'emc_volunteer_application_draft_v2'

/* ── Form State Interface ────────────────────────────────────────────── */

interface FormState {
  // المستوى الأول
  full_name: string
  birth_date: string
  nationality: string
  country: Country | null
  city: string
  phone: string
  email: string
  gender: string

  // المستوى الثاني
  education_level: string
  current_status: string
  job_title: string
  specialization: string
  volunteer_days_availability: string
  volunteer_days: string[]
  preferred_time_slot: string
  daily_hours: string
  in_person_capable: string
  remote_capable: string

  // المستوى الثالث
  has_previous_volunteering: boolean | null
  volunteering_organizations: string
  volunteering_duration: string
  past_volunteer_tasks: string[]
  personal_skills: string[]
  skill_level_rating: number
  technical_tools: string[]
  value_add_contributions: string
  portfolio_link_status: string
  portfolio_url: string
  cv_file: File | null

  // المستوى الرابع
  motivation_ratings: Record<string, number>
  commitment_ratings: Record<string, number>
  situational_responses: Record<string, string>
  expected_duration: string
  commitment_three_months: string

  // المستوى الخامس
  reasons_for_applying: string[]
  expected_gains: string[]
  primary_value_department: string
  department_skills: string[]
  preferred_work_environment: string
  quit_reasons: string[]
  suggestions: string
  notes: string
  agree_terms: boolean
}

const initialForm: FormState = {
  full_name: '',
  birth_date: '',
  nationality: '',
  country: null,
  city: '',
  phone: '',
  email: '',
  gender: '',

  education_level: '',
  current_status: '',
  job_title: '',
  specialization: '',
  volunteer_days_availability: '',
  volunteer_days: [],
  preferred_time_slot: '',
  daily_hours: '',
  in_person_capable: '',
  remote_capable: '',

  has_previous_volunteering: null,
  volunteering_organizations: '',
  volunteering_duration: '',
  past_volunteer_tasks: [],
  personal_skills: [],
  skill_level_rating: 3,
  technical_tools: [],
  value_add_contributions: '',
  portfolio_link_status: '',
  portfolio_url: '',
  cv_file: null,

  motivation_ratings: {},
  commitment_ratings: {},
  situational_responses: {},
  expected_duration: '',
  commitment_three_months: '',

  reasons_for_applying: [],
  expected_gains: [],
  primary_value_department: '',
  department_skills: [],
  preferred_work_environment: '',
  quit_reasons: [],
  suggestions: '',
  notes: '',
  agree_terms: false,
}

/* ── Helper Components ───────────────────────────────────────────────── */

function Field({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="text-right">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-black text-deepBlue">
          {label}
          {required && <span className="mr-1 text-red-500">*</span>}
        </label>
        {hint && <span className="text-xs text-foreground/50">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs font-bold text-red-600">{error}</p>}
    </div>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  hasError,
  dir,
  onBlur,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hasError?: boolean
  dir?: string
  onBlur?: () => void
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      dir={dir}
      className={`h-13 w-full rounded-2xl border bg-paper2 px-4 text-right font-semibold text-deepBlue outline-none transition placeholder:text-muted-400 focus:bg-white focus:ring-4 focus:ring-brand-100 ${
        hasError ? 'border-red-400 focus:border-red-400' : 'border-line focus:border-customBlue'
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
      className={`w-full rounded-2xl border bg-paper2 p-4 text-right font-semibold text-deepBlue outline-none transition placeholder:text-muted-400 focus:bg-white focus:ring-4 focus:ring-brand-100 ${
        hasError ? 'border-red-400 focus:border-red-400' : 'border-line focus:border-customBlue'
      }`}
    />
  )
}

function SingleSelectPills({
  options,
  selected,
  onSelect,
  hasError,
}: {
  options: readonly string[]
  selected: string
  onSelect: (val: string) => void
  hasError?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const isSelected = selected === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`rounded-xl border px-4 py-2.5 text-xs font-black transition-all ${
              isSelected
                ? 'border-customBlue bg-customBlue text-white shadow-emc-sm'
                : hasError
                  ? 'border-red-200 bg-paper2 text-foreground/75 hover:border-customBlue/40'
                  : 'border-line bg-paper2 text-foreground/75 hover:border-customBlue/30 hover:bg-white'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function MultiSelectPills({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[]
  selected: string[]
  onToggle: (val: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const isSelected = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-black transition-all ${
              isSelected
                ? 'border-customBlue bg-brand-50 text-customBlue shadow-emc-sm ring-1 ring-customBlue'
                : 'border-line bg-paper2 text-foreground/75 hover:border-customBlue/30 hover:bg-white'
            }`}
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                isSelected ? 'border-customBlue bg-customBlue text-white' : 'border-slate-300 bg-white'
              }`}
            >
              {isSelected && <Check size={11} strokeWidth={3} />}
            </div>
            <span>{opt}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Main Component ──────────────────────────────────────────────────── */

export default function VolunteerApply() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const topRef = useRef<HTMLDivElement>(null)

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restores the saved draft once, after mount (localStorage is not readable during render)
        setForm((prev) => ({ ...prev, ...parsed, cv_file: null }))
      }
    } catch {
      // ignore
    }
  }, [])

  // Auto-save draft on changes (excluding file)
  useEffect(() => {
    try {
      const { cv_file: _cvFile, ...rest } = form
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rest))
    } catch {
      // ignore
    }
  }, [form])

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }))
    if (errors[key]) {
      setErrors((e) => ({ ...e, [key]: undefined }))
    }
  }

  function toggleArrayItem(key: 'volunteer_days' | 'past_volunteer_tasks' | 'personal_skills' | 'technical_tools' | 'reasons_for_applying' | 'expected_gains' | 'department_skills' | 'quit_reasons', item: string, max?: number) {
    const list = form[key]
    if (list.includes(item)) {
      setField(key, list.filter((i) => i !== item))
    } else {
      if (max && list.length >= max) {
        toast.warning(`يمكنك اختيار ${max} خيارات كحد أقصى`)
        return
      }
      setField(key, [...list, item])
    }
  }

  function autofillCountryFromPhone() {
    if (form.country) return
    const raw = form.phone.trim()
    if (!raw) return
    const candidate = raw.startsWith('+') ? raw : `+${raw}`
    const iso = countryFromPhone(candidate)
    if (!iso) return
    const match = COUNTRIES.find((c) => c.code === iso)
    if (match) setField('country', match)
  }

  /* ── Step-by-Step Validation ────────────────────────────────────────── */

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {}

    if (s === 1) {
      if (!form.full_name.trim()) errs.full_name = 'الاسم الرباعي مطلوب'
      if (!form.email.trim()) errs.email = 'البريد الإلكتروني مطلوب'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'صيغة البريد الإلكتروني غير صحيحة'
      if (!form.phone.trim()) errs.phone = 'رقم الجوال مطلوب'
      if (!form.country) errs.country = 'بلد الإقامة مطلوب'
      if (!form.city.trim()) errs.city = 'المدينة مطلوبة'
    }

    if (s === 2) {
      if (!form.education_level) errs.education_level = 'يرجى تحديد أعلى مؤهل علمي'
      if (!form.current_status) errs.current_status = 'يرجى تحديد وضعك الحالي'
      if (form.current_status === 'موظف' && !form.job_title.trim()) {
        errs.job_title = 'يرجى كتابة المسمى الوظيفي'
      }
      if (!form.volunteer_days_availability) errs.volunteer_days_availability = 'يرجى تحديد مدى التوافر'
      if (
        (form.volunteer_days_availability === 'أيام محددة خلال الأسبوع' || form.volunteer_days_availability === 'أيام الإجازة فقط') &&
        form.volunteer_days.length === 0
      ) {
        errs.volunteer_days = 'يرجى اختيار يوم واحد على الأقل'
      }
      if (!form.preferred_time_slot) errs.preferred_time_slot = 'يرجى تحديد الفترة المناسبة'
      if (!form.daily_hours) errs.daily_hours = 'يرجى تحديد الساعات اليومية'
    }

    if (s === 3) {
      if (form.has_previous_volunteering === null) {
        errs.has_previous_volunteering = 'يرجى الإجابة عما إذا سبق لك التطوع'
      }
      if (form.has_previous_volunteering === true && !form.volunteering_duration) {
        errs.volunteering_duration = 'يرجى تحديد مدة الخبرة التطوعية'
      }
    }

    if (s === 4) {
      // Check motivation likert
      const missingMotiv = MOTIVATION_STATEMENTS.some((m) => !form.motivation_ratings[m.id])
      if (missingMotiv) errs.motivation_ratings = 'يرجى التقييم لجميع عبارات الدافعية'

      // Check commitment likert
      const missingCommit = COMMITMENT_STATEMENTS.some((c) => !form.commitment_ratings[c.id])
      if (missingCommit) errs.commitment_ratings = 'يرجى التقييم لجميع عبارات الجدية والالتزام'

      // Check situational questions
      const missingSit = SITUATIONAL_QUESTIONS.some((q) => !form.situational_responses[q.id])
      if (missingSit) errs.situational_responses = 'يرجى الإجابة على جميع أسئلة المواقف العملية'
    }

    if (s === 5) {
      if (!form.primary_value_department) errs.primary_value_department = 'يرجى اختيار الإدارة الأنسب لمهاراتك'
      if (!form.agree_terms) errs.agree_terms = 'يجب الموافقة على استخدام البيانات قبل الإرسال'
    }

    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0]
      toast.error('يرجى استكمال الحقول المطلوبة', { description: errs[firstKey] })
      return false
    }

    return true
  }

  function handleNext() {
    if (!validateStep(step)) return
    setStep((prev) => Math.min(prev + 1, STEPS.length))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function handlePrev() {
    setStep((prev) => Math.max(prev - 1, 1))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSubmit() {
    if (!validateStep(5)) return
    // Validate entire form defensively
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setStep(s)
        topRef.current?.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      await submitVolunteerApplication({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        country: form.country?.name ?? '',
        city: form.city,
        gender: form.gender || 'unspecified',
        birth_date: form.birth_date || null,
        nationality: form.nationality || null,

        education_level: form.education_level,
        current_status: form.current_status,
        job_title: form.job_title || null,
        specialization: form.specialization || null,
        volunteer_days_availability: form.volunteer_days_availability,
        volunteer_days: form.volunteer_days,
        preferred_time_slot: form.preferred_time_slot,
        daily_hours: form.daily_hours,
        in_person_capable: form.in_person_capable || null,
        remote_capable: form.remote_capable || null,

        has_previous_volunteering: form.has_previous_volunteering,
        volunteering_organizations: form.volunteering_organizations || null,
        volunteering_duration: form.volunteering_duration || null,
        past_volunteer_tasks: form.past_volunteer_tasks,
        personal_skills: form.personal_skills,
        skill_level_rating: form.skill_level_rating,
        technical_tools: form.technical_tools,
        value_add_contributions: form.value_add_contributions || null,
        portfolio_link_status: form.portfolio_link_status || null,
        portfolio_url: form.portfolio_url || null,
        cv_file: form.cv_file,

        motivation_ratings: form.motivation_ratings,
        commitment_ratings: form.commitment_ratings,
        situational_responses: form.situational_responses,
        expected_duration: form.expected_duration || null,
        commitment_three_months: form.commitment_three_months || null,

        reasons_for_applying: form.reasons_for_applying,
        expected_gains: form.expected_gains,
        primary_value_department: form.primary_value_department,
        desired_department: form.primary_value_department,
        department_skills: form.department_skills,
        preferred_work_environment: form.preferred_work_environment || null,
        quit_reasons: form.quit_reasons,
        suggestions: form.suggestions || null,
        notes: form.notes || null,
        agree_terms: form.agree_terms,

        // Older fields HR screens and matching read: only answers that mean the same thing, nothing invented.
        ...assessmentLegacyFields(form),
      })

      localStorage.removeItem(DRAFT_KEY)
      setSubmitted(true)
      toast.success('تم إرسال طلب التطوع بنجاح!')
    } catch (err) {
      const fieldErrs = getLaravelFieldErrors(err)
      if (fieldErrs && Object.keys(fieldErrs).length > 0) {
        setErrors(fieldErrs)
        toast.error('يرجى مراجعة البيانات المدخلة', { description: getApiErrorMessage(err) })
      } else {
        setSubmitError(getApiErrorMessage(err))
        toast.error(getApiErrorMessage(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleResetDraft() {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح المسودة وبدء الطلب من جديد؟')) {
      localStorage.removeItem(DRAFT_KEY)
      setForm(initialForm)
      setStep(1)
      setErrors({})
      toast.message('تمت إعادة ضبط النموذج')
    }
  }

  /* ── Success Screen ─────────────────────────────────────────────────── */

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-16" dir="rtl">
        <div className="mx-auto max-w-xl px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="rounded-3xl bg-white p-10 text-center shadow-emc-lg ring-1 ring-line"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
              <CheckCircle2 size={44} strokeWidth={2.5} />
            </div>

            <h1 className="font-display text-2xl font-black text-deepBlue sm:text-3xl">
              تم استلام طلب التطوع وتقييم الكفاءات بنجاح
            </h1>

            <p className="mt-4 text-sm font-semibold leading-relaxed text-foreground/70">
              شكراً لرغبتك واهتمامك بالانضمام إلى فريق EMC. سيقوم فريق الموارد البشرية وإدارة التطوع بمراجعة ملفك وإجاباتك بدقة والتواصل معك قريباً.
            </p>

            <div className="mt-8 rounded-2xl bg-paper2 p-4 text-xs font-bold text-foreground/75 text-right space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-foreground/50">الإدارة المختارة:</span>
                <span className="text-deepBlue font-black">{form.primary_value_department}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/50">البريد الإلكتروني:</span>
                <span className="text-deepBlue font-latin" dir="ltr">{form.email}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/"
                className="rounded-2xl bg-deepBlue px-7 py-3 text-xs font-black text-white shadow-emc-md transition hover:bg-deepBlue/90"
              >
                العودة للرئيسية
              </Link>
              <Link
                to="/volunteer"
                className="rounded-2xl border border-line bg-white px-7 py-3 text-xs font-black text-deepBlue transition hover:bg-paper2"
              >
                صفحة التطوع
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // Active department skills options
  const activeDeptSkills = form.primary_value_department
    ? (DEPARTMENT_SKILLS_MATRIX[form.primary_value_department] ?? [
        'التنسيق والتنظيم',
        'إدارة المهام',
        'التواصل الفعال',
        'إعداد التقارير',
      ])
    : []

  const progressPercent = Math.round(((step - 1) / (STEPS.length - 1)) * 100)

  return (
    <main className="min-h-screen bg-slate-50 pt-24 pb-20 text-right" dir="rtl" ref={topRef}>
      <PublicSeo
        title="استمارة طلب التطوع وتقييم الكفاءات | مركز EMC"
        description="استمارة التقديم والتقييم الشاملة للتطوع مع مركز EMC — 5 مستويات لقياس المهارات، التفرغ، والجاهزية العملية."
        path="/volunteer/apply"
      />

      <PageHeader
        title="استمارة التطوع وتقييم الكفاءات"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'التطوع', href: '/volunteer' },
          { label: 'استمارة التقديم الشاملة' },
        ]}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-6">
        {/* ── Intro Banner (Aesthetics like TrainerApply) ── */}
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-deepBlue via-primary-800 to-primary-700 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 -left-10 h-48 w-48 rounded-full bg-customBlue/20 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-sky-200 backdrop-blur-sm">
                <Sparkles size={14} className="text-amber-300" />
                بوابة التطوع وصناعة الأثر
              </span>
              <button
                type="button"
                onClick={handleResetDraft}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-300 hover:text-white transition"
                title="إعادة ضبط ومسح المسودة"
              >
                <RotateCcw size={12} />
                بدء من جديد
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mb-2.5">
              استمارة التطوع وتقييم الكفاءات — مركز EMC
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-200 max-w-2xl">
              صُممت هذه الاستمارة على 5 مستويات نوعية للتعرف على كفاءاتك ومجالات تميزك، وتوجيهك للإدارة والفرصة الأكثر ملاءمة لقدراتك وطموحاتك.
            </p>
          </div>
        </div>

        {/* ── Stepper Header ── */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between text-xs font-black text-foreground/60">
            <span>المستوى {step} من {STEPS.length}: <strong className="text-deepBlue">{STEPS[step - 1].title}</strong></span>
            <span className="font-latin tabular-nums" dir="ltr">{progressPercent}% مكتمل</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-customBlue to-deepBlue"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Step Pills */}
          <div className="mt-6 grid grid-cols-5 gap-2 sm:gap-3">
            {STEPS.map((s) => {
              const Icon = s.icon
              const isCurrent = s.id === step
              const isDone = s.id < step
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id < step) setStep(s.id)
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center transition-all ${
                    isCurrent
                      ? 'border-customBlue bg-white shadow-emc-md ring-2 ring-customBlue/20'
                      : isDone
                        ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100/60'
                        : 'border-line bg-paper2/80 opacity-60'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition ${
                      isCurrent
                        ? 'bg-deepBlue text-white shadow-sm'
                        : isDone
                          ? 'bg-emerald-500 text-white'
                          : 'border border-slate-300 bg-white text-slate-400'
                    }`}
                  >
                    {isDone ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
                  </div>
                  <span className="hidden sm:block text-[11px] font-black leading-tight text-deepBlue">
                    {s.title}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Main Form Card ── */}
        <div className="rounded-3xl border border-line bg-white shadow-emc-lg overflow-hidden">
          {/* Step header title */}
          <div className="border-b border-line px-6 sm:px-8 py-6 bg-gradient-to-b from-paper2/50 to-white">
            <span className="text-[11px] font-black text-customBlue uppercase tracking-wider">
              المستوى {step} من {STEPS.length}
            </span>
            <h2 className="mt-1 text-xl font-black text-deepBlue">
              {STEPS[step - 1].title}
            </h2>
            <p className="mt-1 text-xs font-semibold text-foreground/60">
              {STEPS[step - 1].subtitle}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-7">
            {/* ══════════════════════════════════════════════════════════════
                المستوى الأول: البيانات الشخصية
            ══════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-6"
              >
                <Field label="الاسم الرباعي" required error={errors.full_name}>
                  <Input
                    value={form.full_name}
                    onChange={(v) => setField('full_name', v)}
                    placeholder="مثال: أحمد محمد عبدالله السالم"
                    hasError={!!errors.full_name}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="تاريخ الميلاد" hint="اختياري">
                    <Input
                      type="date"
                      value={form.birth_date}
                      onChange={(v) => setField('birth_date', v)}
                    />
                  </Field>

                  <Field label="الجنسية" hint="اختياري">
                    <Input
                      value={form.nationality}
                      onChange={(v) => setField('nationality', v)}
                      placeholder="مثال: يمني، مصري، سعودي..."
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="بلد الإقامة" required error={errors.country}>
                    <CountrySelector
                      value={form.country}
                      onChange={(c) => setField('country', c)}
                      error={errors.country}
                    />
                  </Field>

                  <Field label="المدينة" required error={errors.city}>
                    <Input
                      value={form.city}
                      onChange={(v) => setField('city', v)}
                      placeholder="مثال: صنعاء، الرياض، القاهرة..."
                      hasError={!!errors.city}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="رقم الجوال (مع مفتاح الدولة)" required error={errors.phone}>
                    <Input
                      value={form.phone}
                      onChange={(v) => setField('phone', v)}
                      onBlur={autofillCountryFromPhone}
                      type="tel"
                      placeholder="+967 770000000"
                      dir="ltr"
                      hasError={!!errors.phone}
                    />
                  </Field>

                  <Field label="البريد الإلكتروني" required error={errors.email}>
                    <Input
                      value={form.email}
                      onChange={(v) => setField('email', v)}
                      type="email"
                      placeholder="name@example.com"
                      dir="ltr"
                      hasError={!!errors.email}
                    />
                  </Field>
                </div>

                <Field label="الجنس" hint="اختياري">
                  <div className="flex gap-3">
                    {GENDER_OPTIONS.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setField('gender', g.value)}
                        className={`flex-1 rounded-2xl border py-3 text-xs font-black transition-all ${
                          form.gender === g.value
                            ? 'border-customBlue bg-brand-50 text-customBlue ring-1 ring-customBlue'
                            : 'border-line bg-paper2 text-foreground/70 hover:border-slate-300'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                المستوى الثاني: المؤهلات والتفرغ
            ══════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-7"
              >
                <Field label="1. ما أعلى مؤهل علمي حصلت عليه؟" required error={errors.education_level}>
                  <SingleSelectPills
                    options={EDUCATION_LEVELS}
                    selected={form.education_level}
                    onSelect={(v) => setField('education_level', v)}
                    hasError={!!errors.education_level}
                  />
                </Field>

                <Field label="2. ما وضعك الحالي؟" required error={errors.current_status}>
                  <SingleSelectPills
                    options={CURRENT_STATUS_OPTIONS}
                    selected={form.current_status}
                    onSelect={(v) => setField('current_status', v)}
                    hasError={!!errors.current_status}
                  />
                </Field>

                {/* شرطي: يظهر فقط عند اختيار "موظف" */}
                <AnimatePresence>
                  {form.current_status === 'موظف' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <Field label="المسمى الوظيفي الذي تشغله حالياً" required error={errors.job_title}>
                        <Input
                          value={form.job_title}
                          onChange={(v) => setField('job_title', v)}
                          placeholder="مثال: مهندس برمجيات، أخصائي تسويق..."
                          hasError={!!errors.job_title}
                        />
                      </Field>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Field label="3. ما تخصصك الدراسي أو المهني؟" hint="اختياري">
                  <Input
                    value={form.specialization}
                    onChange={(v) => setField('specialization', v)}
                    placeholder="مثال: تقنية معلومات، إدارة أعمال، ترجمة..."
                  />
                </Field>

                <hr className="border-line my-2" />

                <Field label="4. ما مدى توافرك للمشاركة في العمل التطوعي؟" required error={errors.volunteer_days_availability}>
                  <SingleSelectPills
                    options={VOLUNTEER_DAYS_AVAILABILITY}
                    selected={form.volunteer_days_availability}
                    onSelect={(v) => setField('volunteer_days_availability', v)}
                    hasError={!!errors.volunteer_days_availability}
                  />
                </Field>

                {/* شرطي: يظهر عند اختيار "أيام الإجازة فقط" أو "أيام محددة" */}
                <AnimatePresence>
                  {(form.volunteer_days_availability === 'أيام محددة خلال الأسبوع' ||
                    form.volunteer_days_availability === 'أيام الإجازة فقط') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <Field label="ما الأيام التي تستطيع التطوع خلالها؟ (حدد كل ما ينطبق)" required error={errors.volunteer_days}>
                        <MultiSelectPills
                          options={DAYS_OF_WEEK}
                          selected={form.volunteer_days}
                          onToggle={(d) => toggleArrayItem('volunteer_days', d)}
                        />
                      </Field>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="5. ما الفترة المناسبة لك للتطوع؟" required error={errors.preferred_time_slot}>
                    <SingleSelectPills
                      options={TIME_SLOT_OPTIONS}
                      selected={form.preferred_time_slot}
                      onSelect={(v) => setField('preferred_time_slot', v)}
                      hasError={!!errors.preferred_time_slot}
                    />
                  </Field>

                  <Field label="6. كم ساعة تستطيع تخصيصها يومياً؟" required error={errors.daily_hours}>
                    <SingleSelectPills
                      options={DAILY_HOURS_OPTIONS}
                      selected={form.daily_hours}
                      onSelect={(v) => setField('daily_hours', v)}
                      hasError={!!errors.daily_hours}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="7. هل تستطيع المشاركة في الأنشطة الحضورية عند الحاجة؟">
                    <SingleSelectPills
                      options={IN_PERSON_OPTIONS}
                      selected={form.in_person_capable}
                      onSelect={(v) => setField('in_person_capable', v)}
                    />
                  </Field>

                  <Field label="8. هل تستطيع المشاركة عن بُعد؟">
                    <SingleSelectPills
                      options={REMOTE_OPTIONS}
                      selected={form.remote_capable}
                      onSelect={(v) => setField('remote_capable', v)}
                    />
                  </Field>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                المستوى الثالث: الخبرات والقدرات
            ══════════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-7"
              >
                <Field label="1. هل سبق لك المشاركة في أعمال تطوعية؟" required error={errors.has_previous_volunteering}>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setField('has_previous_volunteering', true)}
                      className={`flex-1 rounded-2xl border py-3.5 text-xs font-black transition ${
                        form.has_previous_volunteering === true
                          ? 'border-customBlue bg-customBlue text-white shadow-emc-sm'
                          : 'border-line bg-paper2 text-foreground/75 hover:border-slate-300'
                      }`}
                    >
                      نعم
                    </button>
                    <button
                      type="button"
                      onClick={() => setField('has_previous_volunteering', false)}
                      className={`flex-1 rounded-2xl border py-3.5 text-xs font-black transition ${
                        form.has_previous_volunteering === false
                          ? 'border-customBlue bg-customBlue text-white shadow-emc-sm'
                          : 'border-line bg-paper2 text-foreground/75 hover:border-slate-300'
                      }`}
                    >
                      لا
                    </button>
                  </div>
                </Field>

                {/* تفاصيل عند اختيار نعم */}
                <AnimatePresence>
                  {form.has_previous_volunteering === true && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-5 rounded-2xl border border-customBlue/15 bg-brand-50/30 p-5"
                    >
                      <Field label="ما الجهات أو المبادرات التي تطوعت معها؟">
                        <Textarea
                          value={form.volunteering_organizations}
                          onChange={(v) => setField('volunteering_organizations', v)}
                          placeholder="أذكر أسماء المنظمات أو المبادرات وأدوارك فيها..."
                          rows={3}
                        />
                      </Field>

                      <Field label="ما المدة الإجمالية لخبرتك التطوعية؟" required error={errors.volunteering_duration}>
                        <SingleSelectPills
                          options={PAST_VOLUNTEER_DURATIONS}
                          selected={form.volunteering_duration}
                          onSelect={(v) => setField('volunteering_duration', v)}
                          hasError={!!errors.volunteering_duration}
                        />
                      </Field>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Field label="2. ما أبرز المهام التي سبق أن نفذتها؟" hint="مربعات اختيار">
                  <MultiSelectPills
                    options={PAST_VOLUNTEER_TASKS}
                    selected={form.past_volunteer_tasks}
                    onToggle={(t) => toggleArrayItem('past_volunteer_tasks', t)}
                  />
                </Field>

                <Field label="3. حدد المهارات التي تمتلكها:" hint="مربعات اختيار">
                  <MultiSelectPills
                    options={PERSONAL_SKILLS_OPTIONS}
                    selected={form.personal_skills}
                    onToggle={(s) => toggleArrayItem('personal_skills', s)}
                  />
                </Field>

                <Field label="4. كيف تقيّم مستواك العام في المهارات التي اخترتها؟" hint="مقياس من 1 إلى 5">
                  <div className="grid grid-cols-5 gap-2">
                    {SKILL_RATINGS.map((r) => {
                      const isSelected = form.skill_level_rating === r.value
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setField('skill_level_rating', r.value)}
                          className={`flex flex-col items-center gap-1 rounded-2xl border py-3 text-center transition ${
                            isSelected
                              ? 'border-customBlue bg-customBlue text-white shadow-emc-sm'
                              : 'border-line bg-paper2 text-foreground/75 hover:border-slate-300'
                          }`}
                        >
                          <span className="font-latin text-sm font-black">{r.value}</span>
                          <span className="text-[11px] font-bold">{r.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </Field>

                <Field label="5. ما البرامج والأدوات التقنية التي تستطيع استخدامها؟">
                  <MultiSelectPills
                    options={TECHNICAL_TOOLS_OPTIONS}
                    selected={form.technical_tools}
                    onToggle={(t) => toggleArrayItem('technical_tools', t)}
                  />
                </Field>

                <Field label="6. اذكر ثلاثة أشياء تستطيع تقديمها للمؤسسة من خلال مهاراتك أو خبراتك:">
                  <Textarea
                    value={form.value_add_contributions}
                    onChange={(v) => setField('value_add_contributions', v)}
                    placeholder="1. ...&#10;2. ...&#10;3. ..."
                    rows={4}
                  />
                </Field>

                <Field label="7. هل لديك نماذج أعمال أو مشاريع سابقة تستطيع مشاركتها؟">
                  <SingleSelectPills
                    options={PORTFOLIO_STATUS_OPTIONS}
                    selected={form.portfolio_link_status}
                    onSelect={(v) => setField('portfolio_link_status', v)}
                  />
                </Field>

                {form.portfolio_link_status === 'نعم، مع رابط' && (
                  <Field label="رابط نماذج الأعمال / Portfolio:">
                    <Input
                      value={form.portfolio_url}
                      onChange={(v) => setField('portfolio_url', v)}
                      placeholder="https://..."
                      dir="ltr"
                    />
                  </Field>
                )}

                <Field label="السيرة الذاتية (CV)" hint="اختياري - صيغة PDF">
                  <CvFileField
                    file={form.cv_file}
                    onChange={(f) => setField('cv_file', f)}
                  />
                </Field>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                المستوى الرابع: قياس الدافعية والجدية
            ══════════════════════════════════════════════════════════════ */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-8"
              >
                {/* 1. الدافعية */}
                <div>
                  <div className="mb-3">
                    <h3 className="text-sm font-black text-deepBlue">
                      أولاً: مقياس الدافعية للتطوع
                    </h3>
                    <p className="text-xs text-foreground/60">
                      حدد مدى اتفاقك مع العبارات التالية على مقياس من 1 (لا أتفق بشدة) إلى 5 (أتفق بشدة):
                    </p>
                  </div>

                  <div className="space-y-4">
                    {MOTIVATION_STATEMENTS.map((stmt) => (
                      <div
                        key={stmt.id}
                        className="rounded-2xl border border-line bg-paper2/50 p-4 transition-all hover:bg-white"
                      >
                        <p className="text-xs font-black text-deepBlue mb-3">{stmt.text}</p>
                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                          {LIKERT_SCALE.map((s) => {
                            const isSelected = form.motivation_ratings[stmt.id] === s.value
                            return (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() =>
                                  setField('motivation_ratings', {
                                    ...form.motivation_ratings,
                                    [stmt.id]: s.value,
                                  })
                                }
                                className={`rounded-xl border py-2 text-center transition ${
                                  isSelected
                                    ? 'border-customBlue bg-customBlue text-white shadow-emc-sm'
                                    : 'border-slate-200 bg-white text-foreground/70 hover:border-customBlue/30'
                                }`}
                              >
                                <span className="block font-latin text-xs font-black">{s.value}</span>
                                <span className="hidden sm:block text-[10px] font-bold">{s.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {errors.motivation_ratings && (
                    <p className="mt-2 text-xs font-bold text-red-600">{errors.motivation_ratings}</p>
                  )}
                </div>

                <hr className="border-line" />

                {/* 2. الجدية والالتزام */}
                <div>
                  <div className="mb-3">
                    <h3 className="text-sm font-black text-deepBlue">
                      ثانياً: مقياس الجدية والالتزام
                    </h3>
                    <p className="text-xs text-foreground/60">
                      قيّم مدى انطباق كل عبارة على أسلوب عملك والتزامك:
                    </p>
                  </div>

                  <div className="space-y-4">
                    {COMMITMENT_STATEMENTS.map((stmt) => (
                      <div
                        key={stmt.id}
                        className="rounded-2xl border border-line bg-paper2/50 p-4 transition-all hover:bg-white"
                      >
                        <p className="text-xs font-black text-deepBlue mb-3">{stmt.text}</p>
                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                          {LIKERT_SCALE.map((s) => {
                            const isSelected = form.commitment_ratings[stmt.id] === s.value
                            return (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() =>
                                  setField('commitment_ratings', {
                                    ...form.commitment_ratings,
                                    [stmt.id]: s.value,
                                  })
                                }
                                className={`rounded-xl border py-2 text-center transition ${
                                  isSelected
                                    ? 'border-customBlue bg-customBlue text-white shadow-emc-sm'
                                    : 'border-slate-200 bg-white text-foreground/70 hover:border-customBlue/30'
                                }`}
                              >
                                <span className="block font-latin text-xs font-black">{s.value}</span>
                                <span className="hidden sm:block text-[10px] font-bold">{s.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {errors.commitment_ratings && (
                    <p className="mt-2 text-xs font-bold text-red-600">{errors.commitment_ratings}</p>
                  )}
                </div>

                <hr className="border-line" />

                {/* 3. أسئلة المواقف العملية */}
                <div>
                  <div className="mb-3">
                    <h3 className="text-sm font-black text-deepBlue">
                      ثالثاً: أسئلة المواقف العملية
                    </h3>
                    <p className="text-xs text-foreground/60">
                      كيف تتصرف في المواقف التالية؟ اختر الإجابة الأقرب لتصرفك الطبيعي:
                    </p>
                  </div>

                  <div className="space-y-5">
                    {SITUATIONAL_QUESTIONS.map((sq, idx) => (
                      <div key={sq.id} className="rounded-2xl border border-line bg-paper2/30 p-5">
                        <span className="text-[11px] font-black text-customBlue">
                          الموقف {idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm font-black text-deepBlue mt-1 mb-3">
                          {sq.question}
                        </p>

                        <div className="space-y-2">
                          {sq.options.map((opt) => {
                            const isSelected = form.situational_responses[sq.id] === opt
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() =>
                                  setField('situational_responses', {
                                    ...form.situational_responses,
                                    [sq.id]: opt,
                                  })
                                }
                                className={`w-full rounded-xl border p-3.5 text-right text-xs font-bold transition flex items-center justify-between ${
                                  isSelected
                                    ? 'border-customBlue bg-white text-customBlue shadow-emc-sm ring-1 ring-customBlue'
                                    : 'border-line bg-white/70 text-foreground/75 hover:bg-white'
                                }`}
                              >
                                <span>{opt}</span>
                                <div
                                  className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mr-3 ${
                                    isSelected
                                      ? 'border-customBlue bg-customBlue text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {errors.situational_responses && (
                    <p className="mt-2 text-xs font-bold text-red-600">{errors.situational_responses}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <Field label="ما المدة التي تتوقع الاستمرار خلالها في العمل التطوعي؟">
                    <SingleSelectPills
                      options={EXPECTED_VOLUNTEER_DURATIONS}
                      selected={form.expected_duration}
                      onSelect={(v) => setField('expected_duration', v)}
                    />
                  </Field>

                  <Field label="هل تستطيع الالتزام بفترة تطوعية لا تقل عن 3 أشهر؟">
                    <SingleSelectPills
                      options={THREE_MONTHS_COMMITMENT_OPTIONS}
                      selected={form.commitment_three_months}
                      onSelect={(v) => setField('commitment_three_months', v)}
                    />
                  </Field>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                المستوى الخامس: التوقعات والإدارات
            ══════════════════════════════════════════════════════════════ */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-7"
              >
                <Field label="1. ما الأسباب الرئيسية التي دفعتك للتقديم للتطوع؟" hint="مربعات اختيار">
                  <MultiSelectPills
                    options={REASONS_FOR_APPLYING}
                    selected={form.reasons_for_applying}
                    onToggle={(r) => toggleArrayItem('reasons_for_applying', r)}
                  />
                </Field>

                <Field label="2. ما أهم 3 أشياء تتوقع الحصول عليها من تجربتك التطوعية؟" hint="حدد 3 خيارات كحد أقصى">
                  <MultiSelectPills
                    options={EXPECTED_GAINS}
                    selected={form.expected_gains}
                    onToggle={(g) => toggleArrayItem('expected_gains', g, 3)}
                  />
                </Field>

                <hr className="border-line" />

                {/* اختيار الإدارة الرئيسية */}
                <Field
                  label="3. ما الإدارة التي ترى أنك الأكثر قدرة على تقديم قيمة مضافة لها؟"
                  required
                  error={errors.primary_value_department}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {DEPARTMENTS.map((dept) => {
                      const isSelected = form.primary_value_department === dept
                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => {
                            setField('primary_value_department', dept)
                            setField('department_skills', [])
                          }}
                          className={`rounded-2xl border p-4 text-right transition ${
                            isSelected
                              ? 'border-customBlue bg-brand-50 text-customBlue shadow-emc-sm ring-1 ring-customBlue'
                              : 'border-line bg-paper2/70 text-foreground/80 hover:border-customBlue/30 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black">{dept}</span>
                            <Building2 size={16} className={isSelected ? 'text-customBlue' : 'text-slate-400'} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Field>

                {/* المهارات المرتبطة بالإدارة المختارة */}
                {form.primary_value_department && activeDeptSkills.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-2xl border border-customBlue/20 bg-brand-50/40 p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-deepBlue">
                        المهارات المرتبطة بإدارة ({form.primary_value_department}):
                      </span>
                      <span className="text-[11px] font-bold text-customBlue">اختر ما تجيده منها</span>
                    </div>

                    <MultiSelectPills
                      options={[...activeDeptSkills, 'مهارات أخرى']}
                      selected={form.department_skills}
                      onToggle={(s) => toggleArrayItem('department_skills', s)}
                    />
                  </motion.div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="4. ما نوع البيئة التطوعية التي تفضل العمل فيها؟">
                    <SingleSelectPills
                      options={WORK_ENVIRONMENT_PREFERENCES}
                      selected={form.preferred_work_environment}
                      onSelect={(v) => setField('preferred_work_environment', v)}
                    />
                  </Field>

                  <Field label="5. ما الذي قد يدفعك إلى التوقف عن التطوع؟">
                    <MultiSelectPills
                      options={QUIT_REASONS_OPTIONS}
                      selected={form.quit_reasons}
                      onToggle={(q) => toggleArrayItem('quit_reasons', q)}
                    />
                  </Field>
                </div>

                <Field label="6. ما اقتراحاتك لجعل تجربتك التطوعية أكثر فاعلية؟" hint="اختياري">
                  <Textarea
                    value={form.suggestions}
                    onChange={(v) => setField('suggestions', v)}
                    placeholder="شاركنا أي أفكار تسهم في تحسين بيئة التطوع وتجربتك..."
                    rows={3}
                  />
                </Field>

                <Field label="7. هل لديك أي ملاحظات أو معلومات إضافية تود مشاركتها؟" hint="اختياري">
                  <Textarea
                    value={form.notes}
                    onChange={(v) => setField('notes', v)}
                    placeholder="أي نقاط أو متطلبات خاصة تود توضيحها..."
                    rows={3}
                  />
                </Field>

                {/* Consent Checkbox */}
                <div className="rounded-2xl border border-customBlue/20 bg-customBlue/[0.04] p-5">
                  <label className="flex items-start gap-3.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.agree_terms}
                      onChange={(e) => setField('agree_terms', e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-customBlue focus:ring-customBlue"
                    />
                    <span className="text-xs font-bold leading-relaxed text-deepBlue">
                      {CONSENT_TEXT}
                    </span>
                  </label>
                  {errors.agree_terms && (
                    <p className="mt-2 text-xs font-bold text-red-600">{errors.agree_terms}</p>
                  )}
                </div>

                {submitError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
                    {submitError}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* ── Navigation Actions (Footer) ── */}
          <div className="flex items-center justify-between border-t border-line px-6 sm:px-8 py-5 bg-paper2/50">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-2.5 text-xs font-black text-deepBlue shadow-sm transition hover:bg-paper2 disabled:opacity-50"
              >
                <ArrowRight size={16} />
                المستوى السابق
              </button>
            ) : (
              <Link
                to="/volunteer"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-2.5 text-xs font-black text-deepBlue shadow-sm transition hover:bg-paper2"
              >
                <ArrowRight size={16} />
                رجوع للتطوع
              </Link>
            )}

            {step < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-7 py-2.5 text-xs font-black text-white shadow-emc-md transition hover:brightness-105"
              >
                المستوى التالي
                <ArrowLeft size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-8 py-2.5 text-xs font-black text-white shadow-emc-md transition hover:brightness-105 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    جارٍ إرسال الطلب...
                  </>
                ) : (
                  <>
                    إرسال طلب التطوع
                    <Send size={15} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
