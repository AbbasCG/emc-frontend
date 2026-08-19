import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  User,
  GraduationCap,
  Star,
  Check,
  AlertCircle,
  Info,
  Briefcase,
  Users,
  Settings,
  Calendar,
  HeartHandshake,
  ClipboardCheck,
  Mic,
  Lightbulb,
  Search,
  BookOpen
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PublicSeo from '@/components/public/PublicSeo'
import CountrySelector, { type Country, COUNTRIES } from '@/components/ui/CountrySelector'
import { submitExpertApplication, type ExpertApplicationPayload } from '@/api/expertApi'
import { getLaravelFieldErrors } from '@/api/apiErrors'
import toast from '@/lib/toast'

const defaultForm: ExpertApplicationPayload = {
  full_name: '',
  country: '',
  city: '',
  whatsapp_number: '',
  email: '',
  linkedin_url: '',
  primary_specialty: '',
  academic_qualification: '',
  current_employer: '',
  job_title: '',
  years_of_experience: '',
  expertise_fields: [],
  expertise_level: '',
  tools_technologies: '',
  contribution_roles: [],
  trainer_fields: [],
  trainer_program_types: [],
  trainer_target_audiences: [],
  trainer_delivery_mode: [],
  trainer_has_experience: false,
  trainer_years_experience: '',
  trainer_previous_courses: '',
  trainer_content_readiness: '',
  expert_specialty_areas: '',
  expert_contribution_types: [],
  expert_achievements: '',
  expert_has_certifications: false,
  expert_certifications_details: '',
  consultant_fields: [],
  consultant_types: [],
  consultant_previous_clients: '',
  consultant_target_clients: [],
  events_types: [],
  events_contribution_areas: [],
  events_previous_events: '',
  mentor_fields: [],
  mentor_target_audiences: [],
  mentor_session_types: [],
  evaluator_fields: [],
  evaluator_types: [],
  participant_project_types: [],
  participant_contribution_method: '',
  availability_times: [],
  availability_level: '',
  collaboration_preferences: [],
  bio: '',
  unique_value: '',
  agree_to_contact: false,
  agree_to_store_data: false,
}

/* ── Enums ── */
const ACADEMIC_QUALIFICATION_OPTIONS = ['دبلوم', 'بكالوريوس', 'ماجستير', 'دكتوراه', 'شهادة مهنية / احترافية', 'أخرى']
const YEARS_EXPERIENCE_OPTIONS = ['أقل من سنة', '1–3 سنوات', '3–5 سنوات', '5–10 سنوات', 'أكثر من 10 سنوات']
const EXPERTISE_LEVEL_OPTIONS = ['مبتدئ', 'متوسط', 'متقدم', 'خبير', 'متخصص مهني']
const EXPERTISE_FIELDS = ['التقنية والبرمجة', 'الذكاء الاصطناعي', 'الأمن السيبراني', 'إدارة المشاريع', 'التسويق والمبيعات', 'المالية', 'الموارد البشرية', 'التصميم', 'أخرى']
const CONTRIBUTION_ROLES = [
  'مدرب / مدربة',
  'خبير / خبيرة',
  'مستشار / مستشارة',
  'متخصص / متخصصة في الفعاليات والمؤتمرات',
  'مرشد / Mentor',
  'محكم / مقيّم للمشاريع والتحديات',
  'مشارك في المبادرات والمشاريع'
]
const AVAILABILITY_TIMES = ['الصباح', 'المساء', 'عطلات نهاية الأسبوع', 'مرن حسب الطلب']
const AVAILABILITY_LEVELS = ['متفرغ جزئياً', 'متفرغ كلياً', 'متوفر بالساعات']
const COLLABORATION_PREFERENCES = ['العمل عن بُعد', 'العمل الحضوري', 'كلاهما']

/* ── UI Helpers ── */
function OptionalBadge() {
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">اختياري</span>
}

function Field({ label, error, required, optional, hint, children }: any) {
  return (
    <div className="block text-right">
      <div className="mb-1.5 flex flex-row-reverse items-center justify-end gap-1.5">
        <span className="text-sm font-black text-deepBlue">
          {label}
          {required && <span className="mr-1 text-red-500" aria-hidden="true">*</span>}
        </span>
        {optional && <OptionalBadge />}
      </div>
      {hint && <span className="mb-1.5 block text-xs text-slate-500">{hint}</span>}
      {children}
      {error && <p className="mt-1.5 text-right text-[12px] font-bold text-red-600" role="alert">{error}</p>}
    </div>
  )
}

function Input({ id, value, onChange, placeholder, type = 'text', hasError, required }: any) {
  return (
    <input
      id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} required={required} aria-invalid={hasError ? 'true' : undefined}
      className={`h-14 w-full rounded-xl border bg-slate-50 px-4 text-right font-semibold text-deepBlue outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-sky-100 ${hasError ? 'border-red-400' : 'border-slate-200 focus:border-customBlue'}`}
    />
  )
}

function Textarea({ id, value, onChange, placeholder, rows = 4, hasError }: any) {
  return (
    <textarea
      id={id} value={value} rows={rows} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} dir="rtl" aria-invalid={hasError ? 'true' : undefined}
      className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-sky-100 ${hasError ? 'border-red-400' : 'border-slate-200 focus:border-customBlue'}`}
    />
  )
}

function Select({ id, value, onChange, options, placeholder, hasError }: any) {
  return (
    <select
      id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={hasError ? 'true' : undefined}
      className={`h-14 w-full cursor-pointer appearance-none rounded-xl border bg-slate-50 px-4 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${hasError ? 'border-red-400' : 'border-slate-200 focus:border-customBlue'} ${!value ? 'text-slate-400' : ''}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function TagPicker({ options, selected, onChange, hasError }: any) {
  const toggle = (opt: string) => onChange(selected.includes(opt) ? selected.filter((s: string) => s !== opt) : [...selected, opt])
  return (
    <div className={`rounded-xl border p-4 ${hasError ? 'border-red-400' : 'border-slate-200'} bg-slate-50`}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt: string) => {
          const active = selected.includes(opt)
          return (
            <button key={opt} type="button" onClick={() => toggle(opt)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${active ? 'bg-customBlue text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-customBlue/40'}`}>
              {active && <Check size={11} />}
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, label }: any) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-right transition hover:border-customBlue/30 hover:bg-white">
      <span className="text-sm font-semibold text-deepBlue">{label}</span>
      <div className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-customBlue' : 'bg-slate-200'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${checked ? 'right-0.5' : 'left-0.5'}`} />
      </div>
    </button>
  )
}

function ErrorSummary({ errors }: { errors: Record<string, string | undefined> }) {
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

/* ── Main Component ── */
export default function ExpertApply() {
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(1)
  const [form, setForm] = useState<ExpertApplicationPayload>(defaultForm)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [submitting, setSubmitting] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const topRef = useRef<HTMLDivElement>(null)
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  // Dynamic steps calculation
  const STEPS = useMemo(() => {
    const baseSteps = [
      { id: 'basic_info', label: 'البيانات الأساسية', icon: User },
      { id: 'professional', label: 'الخلفية المهنية', icon: Briefcase },
      { id: 'expertise', label: 'مجالات الخبرة', icon: Star },
      { id: 'roles', label: 'أدوار المساهمة', icon: HeartHandshake },
    ]

    const roles = form.contribution_roles
    if (roles.includes('مدرب / مدربة')) baseSteps.push({ id: 'trainer', label: 'للمدربين', icon: BookOpen })
    if (roles.includes('خبير / خبيرة')) baseSteps.push({ id: 'expert', label: 'للخبراء', icon: Lightbulb })
    if (roles.includes('مستشار / مستشارة')) baseSteps.push({ id: 'consultant', label: 'للمستشارين', icon: Users })
    if (roles.includes('متخصص / متخصصة في الفعاليات والمؤتمرات')) baseSteps.push({ id: 'events', label: 'للفعاليات', icon: Mic })
    if (roles.includes('مرشد / Mentor')) baseSteps.push({ id: 'mentor', label: 'للمرشدين', icon: GraduationCap })
    if (roles.includes('محكم / مقيّم للمشاريع والتحديات')) baseSteps.push({ id: 'evaluator', label: 'للمحكمين', icon: Search })
    if (roles.includes('مشارك في المبادرات والمشاريع')) baseSteps.push({ id: 'participant', label: 'للمبادرات', icon: Settings })

    baseSteps.push({ id: 'availability', label: 'التفرغ', icon: Calendar })
    baseSteps.push({ id: 'about', label: 'نبذة عنك', icon: Info })
    baseSteps.push({ id: 'consent', label: 'المراجعة', icon: ClipboardCheck })

    return baseSteps.map((s, idx) => ({ ...s, stepIndex: idx + 1 }))
  }, [form.contribution_roles])

  const validateStep = (stepIndex: number, data: ExpertApplicationPayload) => {
    const err: Record<string, string | undefined> = {}
    const step = STEPS.find(s => s.stepIndex === stepIndex)
    if (!step) return err

    if (step.id === 'basic_info') {
      if (!data.full_name.trim()) err.full_name = 'الاسم الكامل مطلوب'
      if (!data.email.trim()) err.email = 'البريد الإلكتروني مطلوب'
      if (!data.whatsapp_number.trim()) err.whatsapp_number = 'رقم الواتساب مطلوب'
      if (!data.country) err.country = 'الدولة مطلوبة'
      if (!data.city.trim()) err.city = 'المدينة مطلوبة'
    } else if (step.id === 'professional') {
      if (!data.primary_specialty.trim()) err.primary_specialty = 'التخصص الأساسي مطلوب'
      if (!data.academic_qualification) err.academic_qualification = 'المؤهل الأكاديمي مطلوب'
      if (!data.job_title.trim()) err.job_title = 'المسمى الوظيفي مطلوب'
      if (!data.years_of_experience) err.years_of_experience = 'سنوات الخبرة مطلوبة'
    } else if (step.id === 'expertise') {
      if (data.expertise_fields.length === 0) err.expertise_fields = 'اختر مجالاً واحداً على الأقل'
      if (!data.expertise_level) err.expertise_level = 'مستوى الخبرة مطلوب'
      if (!data.tools_technologies.trim()) err.tools_technologies = 'هذا الحقل مطلوب'
    } else if (step.id === 'roles') {
      if (data.contribution_roles.length === 0) err.contribution_roles = 'اختر دوراً واحداً على الأقل'
    } else if (step.id === 'availability') {
      if (data.availability_times.length === 0) err.availability_times = 'اختر وقت التفرغ'
      if (!data.availability_level) err.availability_level = 'مستوى التفرغ مطلوب'
      if (data.collaboration_preferences.length === 0) err.collaboration_preferences = 'اختر تفضيلات التعاون'
    } else if (step.id === 'about') {
      if (!data.bio.trim()) err.bio = 'النبذة مطلوبة'
      if (!data.unique_value.trim()) err.unique_value = 'القيمة المضافة مطلوبة'
    } else if (step.id === 'consent') {
      if (!data.agree_to_contact || !data.agree_to_store_data) err.consent = 'يجب الموافقة على جميع الشروط'
    }
    return err
  }

  const set = useCallback((key: keyof ExpertApplicationPayload, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setErrors(prev => ({ ...prev, [key]: undefined }))
  }, [])

  const surfaceErrors = useCallback((errs: Record<string, string | undefined>) => {
    requestAnimationFrame(() => {
      errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const firstKey = Object.keys(errs).find(k => errs[k])
      if (firstKey) document.getElementById(firstKey)?.focus()
    })
  }, [])

  const goNext = () => {
    const errs = validateStep(currentStep, form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setCompletedSteps(prev => { const s = new Set(prev); s.delete(currentStep); return s })
      surfaceErrors(errs)
      return
    }
    setErrors({})
    setCompletedSteps(prev => new Set([...prev, currentStep]))
    setCurrentStep(s => Math.min(s + 1, STEPS.length))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const goPrev = () => {
    setErrors({})
    setCurrentStep(s => Math.max(s - 1, 1))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    const errs = validateStep(STEPS.length, form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      surfaceErrors(errs)
      return
    }
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await submitExpertApplication(form)
      toast.success('تم إرسال طلبك بنجاح.')
      navigate('/join-expert/success', { state: result, replace: true })
    } catch (err: unknown) {
      const fieldErrors = getLaravelFieldErrors(err)
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        surfaceErrors(fieldErrors)
        toast.error('يرجى مراجعة الحقول المطلوبة قبل إرسال الطلب.')
        return
      }
      toast.error('حدث خطأ غير متوقع أثناء إرسال الطلب.')
    } finally {
      setSubmitting(false)
    }
  }

  const progress = (completedSteps.size / STEPS.length) * 100
  const currentStepData = STEPS.find(s => s.stepIndex === currentStep)

  return (
    <main className="bg-[#f4f7fb] pt-20" ref={topRef}>
      <PublicSeo
        title="الانضمام لمجتمع المدربين والخبراء"
        description="تسعى EMC إلى بناء مجتمع من المدربين والخبراء للمساهمة في تقديم برامج تدريبية نوعية واستشارات."
        path="/join-expert"
      />
      <PageHeader
        title="مجتمع المدربين والخبراء"
        breadcrumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'الانضمام كخبير' }]}
      />

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Welcome Message */}
          {currentStep === 1 && (
            <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-100 text-right leading-relaxed text-slate-600">
              <h2 className="text-xl font-bold text-deepBlue mb-4">الانضمام إلى مجتمع المدربين والخبراء في EMC</h2>
              <p className="mb-3">تسعى EMC إلى بناء مجتمع من المدربين والخبراء والمستشارين والمتخصصين في مختلف المجالات، للمساهمة في تقديم برامج تدريبية نوعية، ومسارات مهنية، واستشارات، وفعاليات، ومبادرات ومشاريع معرفية تستجيب لاحتياجات المتعلمين وسوق العمل.</p>
              <p>إذا كنت تمتلك خبرة مهنية أو أكاديمية، أو خبرة في التدريب، أو الاستشارات، ندعوك للتعريف بخبراتك ومجالات اهتمامك.</p>
            </div>
          )}

          {/* Progress bar */}
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>الخطوة {currentStep} من {STEPS.length}</span>
              <span>{Math.round(progress)}% مكتمل</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <motion.div className="h-full rounded-full bg-gradient-to-l from-customBlue to-customBlue/70" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.35, ease: 'easeInOut' }} />
            </div>
          </div>

          {/* Step card */}
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 sm:p-8">
              <div className="mb-6 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-deepBlue/[0.07]">
                    {currentStepData && <currentStepData.icon className="text-deepBlue" size={20} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">الخطوة {currentStep}</p>
                    <h3 className="text-lg font-black text-deepBlue">{currentStepData?.label}</h3>
                  </div>
                </div>
              </div>

              <div ref={errorSummaryRef}>
                <ErrorSummary errors={errors} />
              </div>

              <div className="space-y-6">
                {currentStepData?.id === 'basic_info' && (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Field label="الاسم الكامل" required error={errors.full_name}>
                      <Input value={form.full_name} onChange={(v: string) => set('full_name', v)} hasError={!!errors.full_name} />
                    </Field>
                    <Field label="البريد الإلكتروني" required error={errors.email}>
                      <Input type="email" value={form.email} onChange={(v: string) => set('email', v)} hasError={!!errors.email} dir="ltr" />
                    </Field>
                    <Field label="رقم الواتساب" required error={errors.whatsapp_number}>
                      <Input type="tel" value={form.whatsapp_number} onChange={(v: string) => set('whatsapp_number', v)} hasError={!!errors.whatsapp_number} dir="ltr" />
                    </Field>
                    <Field label="الدولة" required error={errors.country}>
                      <CountrySelector value={COUNTRIES.find(c => c.name === form.country) || null} onChange={(c) => set('country', c?.name ?? '')} hasError={!!errors.country} />
                    </Field>
                    <Field label="المدينة" required error={errors.city}>
                      <Input value={form.city} onChange={(v: string) => set('city', v)} hasError={!!errors.city} />
                    </Field>
                    <Field label="رابط LinkedIn" optional error={errors.linkedin_url}>
                      <Input type="url" value={form.linkedin_url || ''} onChange={(v: string) => set('linkedin_url', v)} hasError={!!errors.linkedin_url} dir="ltr" />
                    </Field>
                  </div>
                )}

                {currentStepData?.id === 'professional' && (
                  <div className="space-y-6">
                    <Field label="التخصص الأساسي" required error={errors.primary_specialty}>
                      <Input value={form.primary_specialty} onChange={(v: string) => set('primary_specialty', v)} hasError={!!errors.primary_specialty} />
                    </Field>
                    <Field label="المؤهل الأكاديمي" required error={errors.academic_qualification}>
                      <Select options={ACADEMIC_QUALIFICATION_OPTIONS} value={form.academic_qualification} onChange={(v: string) => set('academic_qualification', v)} hasError={!!errors.academic_qualification} placeholder="اختر المؤهل..." />
                    </Field>
                    <Field label="جهة العمل الحالية" optional error={errors.current_employer}>
                      <Input value={form.current_employer || ''} onChange={(v: string) => set('current_employer', v)} hasError={!!errors.current_employer} />
                    </Field>
                    <Field label="المسمى الوظيفي" required error={errors.job_title}>
                      <Input value={form.job_title} onChange={(v: string) => set('job_title', v)} hasError={!!errors.job_title} />
                    </Field>
                    <Field label="سنوات الخبرة" required error={errors.years_of_experience}>
                      <Select options={YEARS_EXPERIENCE_OPTIONS} value={form.years_of_experience} onChange={(v: string) => set('years_of_experience', v)} hasError={!!errors.years_of_experience} placeholder="اختر عدد السنوات..." />
                    </Field>
                  </div>
                )}

                {currentStepData?.id === 'expertise' && (
                  <div className="space-y-6">
                    <Field label="مجالات الخبرة" required error={errors.expertise_fields}>
                      <TagPicker options={EXPERTISE_FIELDS} selected={form.expertise_fields} onChange={(v: string[]) => set('expertise_fields', v)} hasError={!!errors.expertise_fields} />
                    </Field>
                    <Field label="مستوى الخبرة" required error={errors.expertise_level}>
                      <Select options={EXPERTISE_LEVEL_OPTIONS} value={form.expertise_level} onChange={(v: string) => set('expertise_level', v)} hasError={!!errors.expertise_level} placeholder="اختر المستوى..." />
                    </Field>
                    <Field label="الأدوات والتقنيات التي تتقنها" required error={errors.tools_technologies} hint="اذكر أهم البرامج والأدوات التي تستخدمها في مجالك">
                      <Textarea value={form.tools_technologies} onChange={(v: string) => set('tools_technologies', v)} hasError={!!errors.tools_technologies} />
                    </Field>
                  </div>
                )}

                {currentStepData?.id === 'roles' && (
                  <div className="space-y-6">
                    <Field label="كيف يمكنك المساهمة مع EMC؟" required error={errors.contribution_roles} hint="اختر دوراً أو أكثر ليتم عرض الأقسام الخاصة به لاحقاً.">
                      <TagPicker options={CONTRIBUTION_ROLES} selected={form.contribution_roles} onChange={(v: string[]) => set('contribution_roles', v)} hasError={!!errors.contribution_roles} />
                    </Field>
                  </div>
                )}

                {currentStepData?.id === 'trainer' && (
                  <div className="space-y-6">
                    <Field label="مجالات التدريب" optional><TagPicker options={['تطوير البرمجيات', 'ريادة الأعمال', 'المهارات الناعمة', 'أخرى']} selected={form.trainer_fields || []} onChange={(v: string[]) => set('trainer_fields', v)} /></Field>
                    <Field label="نمط التدريب" optional><TagPicker options={['عن بُعد', 'حضوري', 'كلاهما']} selected={form.trainer_delivery_mode || []} onChange={(v: string[]) => set('trainer_delivery_mode', v)} /></Field>
                    <Field label="هل لديك خبرة سابقة في التدريب؟" optional><Toggle checked={!!form.trainer_has_experience} onChange={(v: boolean) => set('trainer_has_experience', v)} label={form.trainer_has_experience ? 'نعم' : 'لا'} /></Field>
                    {form.trainer_has_experience && (
                       <Field label="اذكر أبرز الدورات التي قدمتها" optional><Textarea value={form.trainer_previous_courses || ''} onChange={(v: string) => set('trainer_previous_courses', v)} /></Field>
                    )}
                  </div>
                )}
                {/* Other conditional steps skipped for brevity in this scratch form, they can be added similarly */}
                {currentStepData?.id === 'expert' && (
                  <div className="space-y-6">
                    <Field label="مجالات الاستشارة والخبرة" optional><Textarea value={form.expert_specialty_areas || ''} onChange={(v: string) => set('expert_specialty_areas', v)} /></Field>
                    <Field label="هل تملك شهادات مهنية؟" optional><Toggle checked={!!form.expert_has_certifications} onChange={(v: boolean) => set('expert_has_certifications', v)} label={form.expert_has_certifications ? 'نعم' : 'لا'} /></Field>
                    {form.expert_has_certifications && (
                       <Field label="تفاصيل الشهادات" optional><Textarea value={form.expert_certifications_details || ''} onChange={(v: string) => set('expert_certifications_details', v)} /></Field>
                    )}
                  </div>
                )}
                
                {currentStepData?.id === 'consultant' && (
                  <div className="space-y-6">
                    <Field label="طبيعة الاستشارات" optional><TagPicker options={['استشارات تقنية', 'استشارات إدارية', 'أخرى']} selected={form.consultant_types || []} onChange={(v: string[]) => set('consultant_types', v)} /></Field>
                    <Field label="أبرز العملاء السابقين" optional><Textarea value={form.consultant_previous_clients || ''} onChange={(v: string) => set('consultant_previous_clients', v)} /></Field>
                  </div>
                )}

                {currentStepData?.id === 'events' && (
                  <div className="space-y-6">
                    <Field label="مجال المشاركة" optional><TagPicker options={['متحدث', 'منظم', 'مدير جلسة']} selected={form.events_contribution_areas || []} onChange={(v: string[]) => set('events_contribution_areas', v)} /></Field>
                  </div>
                )}

                {currentStepData?.id === 'mentor' && (
                  <div className="space-y-6">
                    <Field label="نوع الجلسات الإرشادية" optional><TagPicker options={['فردية', 'جماعية']} selected={form.mentor_session_types || []} onChange={(v: string[]) => set('mentor_session_types', v)} /></Field>
                  </div>
                )}

                {currentStepData?.id === 'evaluator' && (
                  <div className="space-y-6">
                    <Field label="مجالات التحكيم" optional><TagPicker options={['مشاريع تخرج', 'مسابقات تقنية', 'أفكار ريادية']} selected={form.evaluator_fields || []} onChange={(v: string[]) => set('evaluator_fields', v)} /></Field>
                  </div>
                )}

                {currentStepData?.id === 'participant' && (
                  <div className="space-y-6">
                    <Field label="المشاريع المستهدفة" optional><TagPicker options={['هاكاثون', 'معسكرات تدريبية', 'بحث وتطوير']} selected={form.participant_project_types || []} onChange={(v: string[]) => set('participant_project_types', v)} /></Field>
                  </div>
                )}

                {currentStepData?.id === 'availability' && (
                  <div className="space-y-6">
                    <Field label="أوقات التفرغ" required error={errors.availability_times}>
                      <TagPicker options={AVAILABILITY_TIMES} selected={form.availability_times} onChange={(v: string[]) => set('availability_times', v)} hasError={!!errors.availability_times} />
                    </Field>
                    <Field label="مستوى التفرغ" required error={errors.availability_level}>
                      <Select options={AVAILABILITY_LEVELS} value={form.availability_level} onChange={(v: string) => set('availability_level', v)} hasError={!!errors.availability_level} placeholder="اختر..." />
                    </Field>
                    <Field label="تفضيلات التعاون" required error={errors.collaboration_preferences}>
                      <TagPicker options={COLLABORATION_PREFERENCES} selected={form.collaboration_preferences} onChange={(v: string[]) => set('collaboration_preferences', v)} hasError={!!errors.collaboration_preferences} />
                    </Field>
                  </div>
                )}

                {currentStepData?.id === 'about' && (
                  <div className="space-y-6">
                    <Field label="نبذة تعريفية مختصرة" required error={errors.bio}>
                      <Textarea value={form.bio} onChange={(v: string) => set('bio', v)} hasError={!!errors.bio} placeholder="تحدث عن نفسك وخبراتك..." />
                    </Field>
                    <Field label="ما هي القيمة المضافة التي ستقدمها لمجتمع EMC؟" required error={errors.unique_value}>
                      <Textarea value={form.unique_value} onChange={(v: string) => set('unique_value', v)} hasError={!!errors.unique_value} />
                    </Field>
                  </div>
                )}

                {currentStepData?.id === 'consent' && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-right">
                      <h4 className="mb-4 text-sm font-bold text-deepBlue">الإقرارات والموافقات</h4>
                      <div className="space-y-4">
                        <label className="flex items-start gap-3">
                          <input type="checkbox" checked={form.agree_to_contact} onChange={e => set('agree_to_contact', e.target.checked)} className="mt-1 h-5 w-5 rounded border-slate-300 text-customBlue focus:ring-customBlue" />
                          <span className="text-sm font-semibold text-slate-700">أوافق على قيام فريق EMC بالتواصل معي ومناقشة فرص التعاون الممكنة.</span>
                        </label>
                        <label className="flex items-start gap-3">
                          <input type="checkbox" checked={form.agree_to_store_data} onChange={e => set('agree_to_store_data', e.target.checked)} className="mt-1 h-5 w-5 rounded border-slate-300 text-customBlue focus:ring-customBlue" />
                          <span className="text-sm font-semibold text-slate-700">أوافق على الاحتفاظ ببياناتي في قاعدة بيانات EMC الخاصة بالخبراء والمدربين.</span>
                        </label>
                      </div>
                      {errors.consent && <p className="mt-4 text-[12px] font-bold text-red-600">{errors.consent}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
                <button
                  type="button" onClick={goPrev} disabled={currentStep === 1 || submitting}
                  className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:invisible"
                >
                  <ArrowRight size={16} />
                  السابق
                </button>

                {currentStep < STEPS.length ? (
                  <button
                    type="button" onClick={goNext}
                    className="flex items-center gap-2 rounded-xl bg-customBlue px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-deepBlue"
                  >
                    التالي
                    <ArrowLeft size={16} />
                  </button>
                ) : (
                  <button
                    type="button" onClick={handleSubmit} disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-green-500 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-600 disabled:opacity-70"
                  >
                    {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                    <CheckCircle2 size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  )
}
