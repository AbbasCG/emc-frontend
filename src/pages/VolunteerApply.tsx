import { useEffect, useMemo, useRef, useState } from 'react'
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
  Loader2,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PublicSeo from '@/components/public/PublicSeo'
import { CvFileField } from '@/components/ui/CvFileField'
import CountrySelector, { COUNTRIES } from '@/components/ui/CountrySelector'
import {
  CardChoice,
  ChoiceQuestion,
  ConsentCheckbox,
  ErrorSummary,
  Field,
  MultiChoice,
  QuestionGroup,
  ScaleQuestion,
  SingleChoice,
  SubmitFailureAlert,
  TextAreaControl,
  TextControl,
  type SummaryItem,
} from '@/components/volunteerApply/FormControls'
import { countryFromPhone } from '@/lib/countryFromPhone'
import { submitVolunteerApplication } from '@/api/volunteerApplicationApi'
import { assessmentLegacyFields } from '@/utils/volunteerApplyLegacyFields'
import {
  FIELD_LABEL,
  FIELD_STEP,
  VOLUNTEER_STEP_COUNT,
  initialVolunteerForm,
  type VolunteerFieldKey,
  type VolunteerFormState,
} from '@/lib/volunteerApply/formModel'
import { orderedErrorFields, validateVolunteerForm, validateVolunteerStep, type VolunteerFieldErrors } from '@/lib/volunteerApply/validation'
import { classifySubmitError, logSubmitFailure, type SubmitFailure } from '@/lib/volunteerApply/submitErrors'
import { focusField } from '@/lib/volunteerApply/focusField'
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

/* ── Main Component ──────────────────────────────────────────────────── */

export default function VolunteerApply() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<VolunteerFormState>(initialVolunteerForm)
  const [errors, setErrors] = useState<VolunteerFieldErrors>({})
  const [failure, setFailure] = useState<SubmitFailure | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const topRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)
  /** A second press while the first send is still running must not send again. */
  const submittingRef = useRef(false)
  /** The field to move focus to once its level is on screen. */
  const pendingFocus = useRef<VolunteerFieldKey | null>(null)

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

  // After a render that put a field on screen (another level, a new message), move focus to it.
  useEffect(() => {
    const key = pendingFocus.current
    if (!key) return
    pendingFocus.current = null
    if (!focusField(key)) summaryRef.current?.focus()
  }, [step, errors])

  const summaryItems = useMemo<SummaryItem[]>(
    () =>
      orderedErrorFields(errors).map((key) => ({
        key,
        label: FIELD_LABEL[key],
        message: errors[key] ?? '',
        step: FIELD_STEP[key],
      })),
    [errors],
  )
  const stepsWithErrors = useMemo(() => new Set(summaryItems.map((item) => item.step)), [summaryItems])

  function setField<K extends keyof VolunteerFormState>(key: K, val: VolunteerFormState[K]) {
    setForm((f) => ({ ...f, [key]: val }))
    if (errors[key]) {
      setErrors((e) => {
        const next = { ...e }
        delete next[key]
        return next
      })
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

  /** Shows what is wrong and puts the cursor on the first problem, on whichever level it is. */
  function showErrors(next: VolunteerFieldErrors) {
    const first = orderedErrorFields(next)[0]
    setErrors(next)
    if (!first) return
    pendingFocus.current = first
    setStep(FIELD_STEP[first])
  }

  function goToItem(item: SummaryItem) {
    pendingFocus.current = item.key
    if (item.step !== step) setStep(item.step)
    else if (!focusField(item.key)) summaryRef.current?.focus()
  }

  function scrollToTop() {
    topRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }

  function handleNext() {
    const found = validateVolunteerStep(form, step)
    if (Object.keys(found).length > 0) {
      showErrors(found)
      return
    }
    setErrors({})
    setStep((prev) => Math.min(prev + 1, VOLUNTEER_STEP_COUNT))
    scrollToTop()
  }

  function handlePrev() {
    setStep((prev) => Math.max(prev - 1, 1))
    scrollToTop()
  }

  function goToStep(target: number) {
    if (target < step || stepsWithErrors.has(target)) {
      setStep(target)
      scrollToTop()
    }
  }

  async function handleSubmit() {
    if (submittingRef.current) return

    const { errors: found, firstStep } = validateVolunteerForm(form)
    if (firstStep) {
      setFailure(null)
      showErrors(found)
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setFailure(null)
    setErrors({})

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

      // Only here: the server accepted the application.
      localStorage.removeItem(DRAFT_KEY)
      setSubmitted(true)
      window.scrollTo?.({ top: 0 })
    } catch (err) {
      const result = classifySubmitError(err, { hasAttachment: form.cv_file !== null })
      logSubmitFailure(result, err)

      const hasFieldErrors = Object.keys(result.fieldErrors).length > 0
      if (hasFieldErrors) showErrors(result.fieldErrors)
      // What is not about one field is said once, at the top, with the way to try again.
      if (!hasFieldErrors || result.unmapped.length > 0) {
        setFailure(result)
        if (!hasFieldErrors) requestAnimationFrame(() => alertRef.current?.focus())
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  function handleResetDraft() {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح المسودة وبدء الطلب من جديد؟')) {
      localStorage.removeItem(DRAFT_KEY)
      setForm(initialVolunteerForm)
      setStep(1)
      setErrors({})
      setFailure(null)
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

            <h1 className="font-display text-2xl font-semibold text-deepBlue sm:text-3xl">
              تم استلام طلب التطوع وتقييم الكفاءات بنجاح
            </h1>

            <p className="mt-4 text-sm font-semibold leading-relaxed text-foreground/70">
              شكراً لرغبتك واهتمامك بالانضمام إلى فريق EMC. سيقوم فريق الموارد البشرية وإدارة التطوع بمراجعة ملفك وإجاباتك بدقة والتواصل معك قريباً.
            </p>

            <div className="mt-8 rounded-2xl bg-paper2 p-4 text-xs font-bold text-foreground/75 text-right space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-foreground/50">الإدارة المختارة:</span>
                <span className="text-deepBlue font-semibold">{form.primary_value_department}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/50">البريد الإلكتروني:</span>
                <span className="text-deepBlue font-latin" dir="ltr">{form.email}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/"
                className="rounded-2xl bg-deepBlue px-7 py-3 text-sm font-semibold text-white shadow-emc-md transition hover:bg-deepBlue/90"
              >
                العودة للرئيسية
              </Link>
              <Link
                to="/volunteer"
                className="rounded-2xl border border-line bg-white px-7 py-3 text-sm font-semibold text-deepBlue transition hover:bg-paper2"
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


  const progressPercent = Math.round(((step - 1) / STEPS.length) * 100)

  return (
    <main
      className="min-h-screen bg-slate-50 pt-24 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] text-right sm:pb-20"
      dir="rtl"
      ref={topRef}
    >
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

      <div className="mx-auto mt-6 max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* ── Intro ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-deepBlue p-5 text-white sm:p-6">
          <p className="max-w-xl text-sm leading-7 text-white/90">
            صُممت هذه الاستمارة على 5 مستويات للتعرف على كفاءاتك وتوجيهك إلى الإدارة الأنسب لك. يُحفظ تقدمك تلقائياً على هذا الجهاز.
          </p>
          <button
            type="button"
            onClick={handleResetDraft}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
          >
            <RotateCcw size={16} aria-hidden="true" />
            بدء من جديد
          </button>
        </div>

        {/* ── Levels ── */}
        <nav aria-label="مستويات الاستمارة" className="mb-6">
          <div className="mb-3 flex items-baseline justify-between gap-3 text-sm text-slate-600">
            <span>
              المستوى {step} من {STEPS.length} · <strong className="font-semibold text-deepBlue">{STEPS[step - 1].title}</strong>
            </span>
            <span className="font-latin tabular-nums" dir="ltr">{progressPercent}%</span>
          </div>

          <div
            role="progressbar"
            aria-label="تقدمك في الاستمارة"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
          >
            <div className="h-full rounded-full bg-customBlue transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
          </div>

          <ol className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
            {STEPS.map((s) => {
              const Icon = s.icon
              const isCurrent = s.id === step
              const isDone = s.id < step
              const hasErrors = stepsWithErrors.has(s.id)
              const reachable = isDone || hasErrors

              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(s.id)}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`المستوى ${s.id}: ${s.title}${hasErrors ? ' — يحتاج إلى تصحيح' : ''}`}
                    disabled={!isCurrent && !reachable}
                    className={`relative flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-customBlue/25 ${
                      hasErrors
                        ? 'border-red-400 bg-red-50'
                        : isCurrent
                          ? 'border-customBlue bg-white'
                          : isDone
                            ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                            : 'border-slate-200 bg-white text-slate-500'
                    } ${!isCurrent && !reachable ? 'cursor-default' : ''}`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold ${
                        hasErrors
                          ? 'bg-red-600 text-white'
                          : isCurrent
                            ? 'bg-deepBlue text-white'
                            : isDone
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 bg-white text-slate-500'
                      }`}
                    >
                      {isDone && !hasErrors ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
                    </span>
                    <span className="hidden text-xs font-medium leading-4 text-deepBlue sm:block">{s.title}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        {/* ── Main Form Card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-emc-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-8 sm:py-6">
            <h2 className="text-xl font-semibold text-deepBlue">{STEPS[step - 1].title}</h2>
            <p className="mt-1 text-sm text-slate-600">{STEPS[step - 1].subtitle}</p>
          </div>

          <div className="p-5 sm:p-8">
            <ErrorSummary items={summaryItems} currentStep={step} onGo={goToItem} summaryRef={summaryRef} />
            {failure && <SubmitFailureAlert failure={failure} onRetry={() => void handleSubmit()} retrying={submitting} alertRef={alertRef} />}

            <div className="space-y-6">
                {/* ══════════════════════════════════════════════════════════════
                    المستوى الأول: البيانات الشخصية
                ══════════════════════════════════════════════════════════════ */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <Field name="full_name" label="الاسم الرباعي" required error={errors.full_name}>
                      <TextControl
                        value={form.full_name}
                        onChange={(v) => setField('full_name', v)}
                        placeholder="مثال: أحمد محمد عبدالله السالم"
                      />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="تاريخ الميلاد" hint="اختياري">
                        <TextControl
                          type="date"
                          value={form.birth_date}
                          onChange={(v) => setField('birth_date', v)}
                        />
                      </Field>

                      <Field label="الجنسية" hint="اختياري">
                        <TextControl
                          value={form.nationality}
                          onChange={(v) => setField('nationality', v)}
                          placeholder="مثال: يمني، مصري، سعودي..."
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field name="country" label="بلد الإقامة" required error={errors.country}>
                        <CountrySelector
                          value={form.country}
                          onChange={(c) => setField('country', c)}
                          error={errors.country}
                          hideErrorMessage
                          strong
                        />
                      </Field>

                      <Field name="city" label="المدينة" required error={errors.city}>
                        <TextControl
                          value={form.city}
                          onChange={(v) => setField('city', v)}
                          placeholder="مثال: صنعاء، الرياض، القاهرة..."
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field name="phone" label="رقم الجوال (مع مفتاح الدولة)" required error={errors.phone}>
                        <TextControl
                          value={form.phone}
                          onChange={(v) => setField('phone', v)}
                          onBlur={autofillCountryFromPhone}
                          type="tel"
                          placeholder="+967 770000000"
                          dir="ltr"
                        />
                      </Field>

                      <Field name="email" label="البريد الإلكتروني" required error={errors.email}>
                        <TextControl
                          value={form.email}
                          onChange={(v) => setField('email', v)}
                          type="email"
                          placeholder="name@example.com"
                          dir="ltr"
                        />
                      </Field>
                    </div>

                    <Field name="gender" label="الجنس" hint="اختياري">
                      <SingleChoice
                        layout="equal"
                        options={GENDER_OPTIONS}
                        selected={form.gender}
                        onSelect={(v) => setField('gender', v)}
                      />
                    </Field>
                  </motion.div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    المستوى الثاني: المؤهلات والتفرغ
                ══════════════════════════════════════════════════════════════ */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-7"
                  >
                    <Field name="education_level" label="1. ما أعلى مؤهل علمي حصلت عليه؟" required error={errors.education_level}>
                      <SingleChoice
                        options={EDUCATION_LEVELS}
                        selected={form.education_level}
                        onSelect={(v) => setField('education_level', v)}
                      />
                    </Field>

                    <Field name="current_status" label="2. ما وضعك الحالي؟" required error={errors.current_status}>
                      <SingleChoice
                        options={CURRENT_STATUS_OPTIONS}
                        selected={form.current_status}
                        onSelect={(v) => setField('current_status', v)}
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
                          <Field name="job_title" label="المسمى الوظيفي الذي تشغله حالياً" required error={errors.job_title}>
                            <TextControl
                              value={form.job_title}
                              onChange={(v) => setField('job_title', v)}
                              placeholder="مثال: مهندس برمجيات، أخصائي تسويق..."
                            />
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Field label="3. ما تخصصك الدراسي أو المهني؟" hint="اختياري">
                      <TextControl
                        value={form.specialization}
                        onChange={(v) => setField('specialization', v)}
                        placeholder="مثال: تقنية معلومات، إدارة أعمال، ترجمة..."
                      />
                    </Field>

                    <hr className="border-slate-200 my-2" />

                    <Field name="volunteer_days_availability" label="4. ما مدى توافرك للمشاركة في العمل التطوعي؟" required error={errors.volunteer_days_availability}>
                      <SingleChoice
                        options={VOLUNTEER_DAYS_AVAILABILITY}
                        selected={form.volunteer_days_availability}
                        onSelect={(v) => setField('volunteer_days_availability', v)}
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
                          <Field name="volunteer_days" label="ما الأيام التي تستطيع التطوع خلالها؟ (حدد كل ما ينطبق)" required error={errors.volunteer_days}>
                            <MultiChoice
                              options={DAYS_OF_WEEK}
                              selected={form.volunteer_days}
                              onToggle={(d) => toggleArrayItem('volunteer_days', d)}
                            />
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field name="preferred_time_slot" label="5. ما الفترة المناسبة لك للتطوع؟" required error={errors.preferred_time_slot}>
                        <SingleChoice
                          options={TIME_SLOT_OPTIONS}
                          selected={form.preferred_time_slot}
                          onSelect={(v) => setField('preferred_time_slot', v)}
                        />
                      </Field>

                      <Field name="daily_hours" label="6. كم ساعة تستطيع تخصيصها يومياً؟" required error={errors.daily_hours}>
                        <SingleChoice
                          options={DAILY_HOURS_OPTIONS}
                          selected={form.daily_hours}
                          onSelect={(v) => setField('daily_hours', v)}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="7. هل تستطيع المشاركة في الأنشطة الحضورية عند الحاجة؟">
                        <SingleChoice
                          options={IN_PERSON_OPTIONS}
                          selected={form.in_person_capable}
                          onSelect={(v) => setField('in_person_capable', v)}
                        />
                      </Field>

                      <Field label="8. هل تستطيع المشاركة عن بُعد؟">
                        <SingleChoice
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-7"
                  >
                    <Field name="has_previous_volunteering" label="1. هل سبق لك المشاركة في أعمال تطوعية؟" required error={errors.has_previous_volunteering}>
                      <SingleChoice
                        layout="equal"
                        options={[
                          { value: 'yes', label: 'نعم' },
                          { value: 'no', label: 'لا' },
                        ]}
                        selected={form.has_previous_volunteering === null ? '' : form.has_previous_volunteering ? 'yes' : 'no'}
                        onSelect={(v) => setField('has_previous_volunteering', v === 'yes')}
                      />
                    </Field>

                    {/* تفاصيل عند اختيار نعم */}
                    <AnimatePresence>
                      {form.has_previous_volunteering === true && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-5 rounded-xl border border-slate-200 bg-slate-50/60 p-5"
                        >
                          <Field label="ما الجهات أو المبادرات التي تطوعت معها؟">
                            <TextAreaControl
                              value={form.volunteering_organizations}
                              onChange={(v) => setField('volunteering_organizations', v)}
                              placeholder="أذكر أسماء المنظمات أو المبادرات وأدوارك فيها..."
                              rows={3}
                            />
                          </Field>

                          <Field name="volunteering_duration" label="ما المدة الإجمالية لخبرتك التطوعية؟" required error={errors.volunteering_duration}>
                            <SingleChoice
                              options={PAST_VOLUNTEER_DURATIONS}
                              selected={form.volunteering_duration}
                              onSelect={(v) => setField('volunteering_duration', v)}
                            />
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Field label="2. ما أبرز المهام التي سبق أن نفذتها؟" hint="مربعات اختيار">
                      <MultiChoice
                        options={PAST_VOLUNTEER_TASKS}
                        selected={form.past_volunteer_tasks}
                        onToggle={(t) => toggleArrayItem('past_volunteer_tasks', t)}
                      />
                    </Field>

                    <Field label="3. حدد المهارات التي تمتلكها:" hint="مربعات اختيار">
                      <MultiChoice
                        options={PERSONAL_SKILLS_OPTIONS}
                        selected={form.personal_skills}
                        onToggle={(s) => toggleArrayItem('personal_skills', s)}
                      />
                    </Field>

                    <Field label="4. كيف تقيّم مستواك العام في المهارات التي اخترتها؟" hint="مقياس من 1 إلى 5">
                      <SingleChoice
                        options={SKILL_RATINGS.map((r) => ({ value: String(r.value), label: `${r.value} · ${r.label}` }))}
                        selected={String(form.skill_level_rating)}
                        onSelect={(v) => setField('skill_level_rating', Number(v))}
                      />
                    </Field>

                    <Field label="5. ما البرامج والأدوات التقنية التي تستطيع استخدامها؟">
                      <MultiChoice
                        options={TECHNICAL_TOOLS_OPTIONS}
                        selected={form.technical_tools}
                        onToggle={(t) => toggleArrayItem('technical_tools', t)}
                      />
                    </Field>

                    <Field label="6. اذكر ثلاثة أشياء تستطيع تقديمها للمؤسسة من خلال مهاراتك أو خبراتك:">
                      <TextAreaControl
                        value={form.value_add_contributions}
                        onChange={(v) => setField('value_add_contributions', v)}
                        placeholder="1. ...&#10;2. ...&#10;3. ..."
                        rows={4}
                      />
                    </Field>

                    <Field label="7. هل لديك نماذج أعمال أو مشاريع سابقة تستطيع مشاركتها؟">
                      <SingleChoice
                        options={PORTFOLIO_STATUS_OPTIONS}
                        selected={form.portfolio_link_status}
                        onSelect={(v) => setField('portfolio_link_status', v)}
                      />
                    </Field>

                    {form.portfolio_link_status === 'نعم، مع رابط' && (
                      <Field label="رابط نماذج الأعمال / Portfolio:">
                        <TextControl
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    <QuestionGroup
                      name="motivation_ratings"
                      title="أولاً: مقياس الدافعية للتطوع"
                      description="حدد مدى اتفاقك مع العبارات التالية على مقياس من 1 (لا أتفق بشدة) إلى 5 (أتفق بشدة)."
                      error={errors.motivation_ratings}
                    >
                      {MOTIVATION_STATEMENTS.map((stmt) => (
                        <ScaleQuestion
                          key={stmt.id}
                          text={stmt.text}
                          scale={LIKERT_SCALE}
                          value={form.motivation_ratings[stmt.id]}
                          onChange={(v) => setField('motivation_ratings', { ...form.motivation_ratings, [stmt.id]: v })}
                        />
                      ))}
                    </QuestionGroup>

                    <hr className="border-slate-200" />

                    <QuestionGroup
                      name="commitment_ratings"
                      title="ثانياً: مقياس الجدية والالتزام"
                      description="قيّم مدى انطباق كل عبارة على أسلوب عملك والتزامك."
                      error={errors.commitment_ratings}
                    >
                      {COMMITMENT_STATEMENTS.map((stmt) => (
                        <ScaleQuestion
                          key={stmt.id}
                          text={stmt.text}
                          scale={LIKERT_SCALE}
                          value={form.commitment_ratings[stmt.id]}
                          onChange={(v) => setField('commitment_ratings', { ...form.commitment_ratings, [stmt.id]: v })}
                        />
                      ))}
                    </QuestionGroup>

                    <hr className="border-slate-200" />

                    <QuestionGroup
                      name="situational_responses"
                      title="ثالثاً: أسئلة المواقف العملية"
                      description="كيف تتصرف في المواقف التالية؟ اختر الإجابة الأقرب إلى تصرفك الطبيعي."
                      error={errors.situational_responses}
                    >
                      {SITUATIONAL_QUESTIONS.map((sq, idx) => (
                        <ChoiceQuestion
                          key={sq.id}
                          index={idx + 1}
                          text={sq.question}
                          options={sq.options}
                          value={form.situational_responses[sq.id]}
                          onChange={(v) => setField('situational_responses', { ...form.situational_responses, [sq.id]: v })}
                        />
                      ))}
                    </QuestionGroup>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                      <Field label="ما المدة التي تتوقع الاستمرار خلالها في العمل التطوعي؟">
                        <SingleChoice
                          options={EXPECTED_VOLUNTEER_DURATIONS}
                          selected={form.expected_duration}
                          onSelect={(v) => setField('expected_duration', v)}
                        />
                      </Field>

                      <Field label="هل تستطيع الالتزام بفترة تطوعية لا تقل عن 3 أشهر؟">
                        <SingleChoice
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-7"
                  >
                    <Field label="1. ما الأسباب الرئيسية التي دفعتك للتقديم للتطوع؟" hint="مربعات اختيار">
                      <MultiChoice
                        options={REASONS_FOR_APPLYING}
                        selected={form.reasons_for_applying}
                        onToggle={(r) => toggleArrayItem('reasons_for_applying', r)}
                      />
                    </Field>

                    <Field label="2. ما أهم 3 أشياء تتوقع الحصول عليها من تجربتك التطوعية؟" hint="حدد 3 خيارات كحد أقصى">
                      <MultiChoice
                        options={EXPECTED_GAINS}
                        selected={form.expected_gains}
                        onToggle={(g) => toggleArrayItem('expected_gains', g, 3)}
                      />
                    </Field>

                    <hr className="border-slate-200" />

                    {/* اختيار الإدارة الرئيسية */}
                    <Field
                      name="primary_value_department"
                      label="3. ما الإدارة التي ترى أنك الأكثر قدرة على تقديم قيمة مضافة لها؟"
                      required
                      error={errors.primary_value_department}
                    >
                      <CardChoice
                        options={DEPARTMENTS}
                        selected={form.primary_value_department}
                        icon={<Building2 size={16} aria-hidden="true" />}
                        onSelect={(dept) => {
                          setField('primary_value_department', dept)
                          setField('department_skills', [])
                        }}
                      />
                    </Field>

                    {/* المهارات المرتبطة بالإدارة المختارة */}
                    {form.primary_value_department && activeDeptSkills.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-5"
                      >
                        <Field
                          label={`المهارات المرتبطة بإدارة (${form.primary_value_department})`}
                          hint="اختر ما تجيده منها"
                        >
                          <MultiChoice
                            options={[...activeDeptSkills, 'مهارات أخرى']}
                            selected={form.department_skills}
                            onToggle={(s) => toggleArrayItem('department_skills', s)}
                          />
                        </Field>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="4. ما نوع البيئة التطوعية التي تفضل العمل فيها؟">
                        <SingleChoice
                          options={WORK_ENVIRONMENT_PREFERENCES}
                          selected={form.preferred_work_environment}
                          onSelect={(v) => setField('preferred_work_environment', v)}
                        />
                      </Field>

                      <Field label="5. ما الذي قد يدفعك إلى التوقف عن التطوع؟">
                        <MultiChoice
                          options={QUIT_REASONS_OPTIONS}
                          selected={form.quit_reasons}
                          onToggle={(q) => toggleArrayItem('quit_reasons', q)}
                        />
                      </Field>
                    </div>

                    <Field label="6. ما اقتراحاتك لجعل تجربتك التطوعية أكثر فاعلية؟" hint="اختياري">
                      <TextAreaControl
                        value={form.suggestions}
                        onChange={(v) => setField('suggestions', v)}
                        placeholder="شاركنا أي أفكار تسهم في تحسين بيئة التطوع وتجربتك..."
                        rows={3}
                      />
                    </Field>

                    <Field label="7. هل لديك أي ملاحظات أو معلومات إضافية تود مشاركتها؟" hint="اختياري">
                      <TextAreaControl
                        value={form.notes}
                        onChange={(v) => setField('notes', v)}
                        placeholder="أي نقاط أو متطلبات خاصة تود توضيحها..."
                        rows={3}
                      />
                    </Field>

                    <ConsentCheckbox
                      name="agree_terms"
                      checked={form.agree_terms}
                      onChange={(checked) => setField('agree_terms', checked)}
                      text={CONSENT_TEXT}
                      error={errors.agree_terms}
                    />
                  </motion.div>
                )}

            </div>
          </div>

          {/* ── Navigation Actions (Footer) ── */}
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-20 flex items-center justify-between gap-3 rounded-b-2xl border-t border-slate-200 bg-white px-5 py-4 sm:static sm:px-8">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                disabled={submitting}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-400 bg-white px-5 text-sm font-semibold text-deepBlue transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-customBlue/25 disabled:opacity-50"
              >
                <ArrowRight size={16} aria-hidden="true" />
                المستوى السابق
              </button>
            ) : (
              <Link
                to="/volunteer"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-400 bg-white px-5 text-sm font-semibold text-deepBlue transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-customBlue/25"
              >
                <ArrowRight size={16} aria-hidden="true" />
                رجوع للتطوع
              </Link>
            )}

            {step < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-customBlue px-7 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-customBlue/30"
              >
                المستوى التالي
                <ArrowLeft size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                aria-busy={submitting}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-customBlue px-8 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-customBlue/30 disabled:cursor-wait disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    جارٍ إرسال الطلب
                  </>
                ) : (
                  <>
                    إرسال طلب التطوع
                    <Send size={16} aria-hidden="true" />
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
