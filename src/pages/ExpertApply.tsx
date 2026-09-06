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
import CountrySelector, { COUNTRIES } from '@/components/ui/CountrySelector'
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

/* ── Options Catalog ── */
const ACADEMIC_QUALIFICATION_OPTIONS = [
  'دبلوم',
  'بكالوريوس',
  'ماجستير',
  'دكتوراه',
  'شهادة مهنية / احترافية',
  'أخرى'
]

const YEARS_EXPERIENCE_OPTIONS = [
  'أقل من سنة',
  '1–3 سنوات',
  '3–5 سنوات',
  '5–10 سنوات',
  'أكثر من 10 سنوات'
]

const EXPERTISE_FIELDS = [
  'الذكاء الاصطناعي',
  'البيانات وتحليل الأعمال',
  'البرمجة والتطوير',
  'الأمن السيبراني',
  'التحول الرقمي',
  'التصميم وتجربة المستخدم',
  'التسويق والإعلام الرقمي',
  'الإنتاج الإعلامي',
  'المبيعات وخدمة العملاء',
  'التأهيل المهني',
  'ريادة الأعمال',
  'القيادة والإدارة',
  'الأطفال والناشئون',
  'اللغات والمهارات الشخصية',
  'أخرى'
]

const EXPERTISE_LEVEL_OPTIONS = ['مبتدئ', 'متوسط', 'متقدم', 'خبير', 'متخصص مهني']

const CONTRIBUTION_ROLES = [
  'مدرب / مدربة',
  'خبير / خبيرة',
  'مستشار / مستشارة',
  'متخصص / متخصصة في الفعاليات والمؤتمرات',
  'مرشد / Mentor',
  'محكم / مقيّم للمشاريع والتحديات',
  'مشارك في المبادرات والمشاريع',
  'أخرى'
]

/* ── Specific Role Options ── */
const TRAINER_PROGRAM_TYPES = [
  'ورش عمل قصيرة',
  'دورات تدريبية',
  'برامج احترافية',
  'مسارات تدريبية',
  'دبلومات',
  'معسكرات تدريبية',
  'محاضرات وندوات',
  'برامج تأهيل مهني',
  'برامج تدريب للشركات والمؤسسات',
  'مشاريع تطبيقية'
]

const TRAINER_TARGET_AUDIENCES = [
  'طلاب المدارس',
  'طلاب الجامعات',
  'الخريجون',
  'الباحثون عن عمل',
  'الموظفون',
  'رواد الأعمال',
  'أصحاب المشاريع',
  'المبتدئون',
  'المتخصصون',
  'المحترفون',
  'أخرى'
]

const TRAINER_DELIVERY_MODES = ['عن بُعد', 'حضوري', 'كلاهما']

const TRAINER_CONTENT_READINESS_OPTIONS = [
  'نعم، لدي منهج تدريبي متكامل',
  'لدي محتوى تدريبي جزئي',
  'لدي خبرة ويمكنني إعداد المحتوى',
  'لا، وأرغب في تطوير المحتوى بالتعاون مع EMC'
]

const EXPERT_CONTRIBUTION_TYPES = [
  'مراجعة وتقييم البرامج',
  'تطوير البرامج والمسارات',
  'مراجعة المحتوى العلمي',
  'تقديم الخبرة المهنية',
  'الدراسات والبحوث',
  'تقييم المشاريع',
  'المشاركة في اللجان المتخصصة',
  'تقديم الرأي والاستشارات الفنية',
  'تطوير المبادرات',
  'أخرى'
]

const CONSULTANT_FIELDS = [
  'الذكاء الاصطناعي',
  'التحول الرقمي',
  'الاستراتيجية',
  'الأعمال',
  'التسويق',
  'البيانات',
  'التقنية',
  'الموارد البشرية',
  'ريادة الأعمال',
  'إدارة المشاريع',
  'التعليم والتدريب',
  'أخرى'
]

const CONSULTANT_TYPES = [
  'استشارات استراتيجية',
  'استشارات تقنية',
  'استشارات التحول الرقمي',
  'استشارات الذكاء الاصطناعي',
  'استشارات الأعمال',
  'استشارات التسويق',
  'استشارات المشاريع',
  'استشارات التدريب والتطوير',
  'تقييم وتطوير المشاريع',
  'أخرى'
]

const CONSULTANT_TARGET_CLIENTS = [
  'أفراد',
  'شركات',
  'مؤسسات',
  'جامعات',
  'مدارس',
  'جهات حكومية',
  'منظمات ومؤسسات غير ربحية',
  'رواد أعمال',
  'شركات ناشئة'
]

const EVENTS_TYPES = [
  'مؤتمرات',
  'ملتقيات',
  'منتديات',
  'ورش عمل',
  'معسكرات تدريبية',
  'مسابقات وتحديات',
  'هاكاثونات',
  'ندوات',
  'فعاليات مجتمعية',
  'فعاليات رقمية',
  'فعاليات حضورية',
  'أخرى'
]

const EVENTS_CONTRIBUTION_AREAS = [
  'تصميم فكرة الفعالية',
  'بناء أجندة الفعالية',
  'تصميم تجربة المشاركين',
  'إدارة وتنظيم الفعالية',
  'تنسيق المتحدثين والخبراء',
  'إدارة الجلسات',
  'إدارة العمليات',
  'إدارة الفعاليات الرقمية',
  'تصميم المسابقات والتحديات',
  'تطوير المبادرات',
  'إدارة فرق الفعاليات',
  'أخرى'
]

const MENTOR_FIELDS = [
  'التطوير المهني',
  'المسار الوظيفي',
  'ريادة الأعمال',
  'الذكاء الاصطناعي',
  'البيانات',
  'التقنية',
  'التسويق',
  'بناء المشاريع',
  'العمل الحر',
  'القيادة',
  'أخرى'
]

const MENTOR_TARGET_AUDIENCES = [
  'الطلاب',
  'الخريجون',
  'الباحثون عن عمل',
  'رواد الأعمال',
  'أصحاب المشاريع',
  'المتخصصون',
  'أصحاب الأفكار والمشاريع الناشئة'
]

const MENTOR_SESSION_TYPES = [
  'جلسات فردية',
  'جلسات جماعية',
  'مراجعة المشاريع',
  'توجيه مهني',
  'توجيه ريادي',
  'مراجعة الخطط',
  'بناء المسار المهني',
  'أخرى'
]

const EVALUATOR_FIELDS = [
  'الذكاء الاصطناعي',
  'البيانات',
  'البرمجة',
  'ريادة الأعمال',
  'التسويق',
  'التحول الرقمي',
  'الابتكار',
  'التصميم',
  'المشاريع التقنية',
  'أخرى'
]

const EVALUATOR_TYPES = [
  'تقييم المشاريع',
  'تقييم الأفكار',
  'تقييم العروض التقديمية',
  'تقييم النماذج الأولية',
  'تقييم المسابقات والتحديات',
  'تقييم المشاريع النهائية',
  'تحكيم الهاكاثونات',
  'أخرى'
]

const PARTICIPANT_PROJECT_TYPES = [
  'مبادرات تعليمية',
  'مبادرات تقنية',
  'مبادرات الذكاء الاصطناعي',
  'مبادرات مجتمعية',
  'مشاريع بحثية',
  'مسابقات وتحديات',
  'هاكاثونات',
  'برامج شبابية',
  'مشاريع ريادة الأعمال',
  'مشاريع التحول الرقمي',
  'أخرى'
]

const AVAILABILITY_TIMES = ['صباحًا', 'ظهرًا', 'مساءً', 'نهاية الأسبوع', 'حسب الاتفاق']

const AVAILABILITY_LEVELS = [
  'متاح بشكل منتظم',
  'متاح حسب جدول البرامج',
  'متاح عند وجود فرص مناسبة',
  'متاح للمشاريع والبرامج القصيرة فقط'
]

const COLLABORATION_PREFERENCES = [
  'تعاون مستمر',
  'تعاون حسب البرامج',
  'مشاريع قصيرة',
  'مبادرات وفعاليات',
  'استشارات',
  'تدريب',
  'شراكات معرفية',
  'أخرى'
]

/* ── UI Components ── */
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

function Input({ id, value, onChange, placeholder, type = 'text', hasError, required, dir }: any) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      dir={dir}
      aria-invalid={hasError ? 'true' : undefined}
      className={`h-14 w-full rounded-xl border bg-slate-50 px-4 font-semibold text-deepBlue outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-sky-100 ${
        dir === 'ltr' ? 'text-left' : 'text-right'
      } ${hasError ? 'border-red-400' : 'border-slate-200 focus:border-customBlue'}`}
    />
  )
}

function Textarea({ id, value, onChange, placeholder, rows = 4, hasError }: any) {
  return (
    <textarea
      id={id}
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir="rtl"
      aria-invalid={hasError ? 'true' : undefined}
      className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-sky-100 ${
        hasError ? 'border-red-400' : 'border-slate-200 focus:border-customBlue'
      }`}
    />
  )
}



function TagPicker({ options, selected, onChange, hasError }: any) {
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter((s: string) => s !== opt) : [...selected, opt])

  return (
    <div className={`rounded-xl border p-4 ${hasError ? 'border-red-400' : 'border-slate-200'} bg-slate-50`}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt: string) => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                active
                  ? 'bg-customBlue text-white shadow-sm'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-customBlue/40'
              }`}
            >
              {active && <Check size={12} />}
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RadioGroup({ options, selected, onChange, hasError }: any) {
  return (
    <div className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${hasError ? 'rounded-xl border border-red-400 p-2' : ''}`}>
      {options.map((opt: string) => {
        const active = selected === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-right text-xs font-bold transition ${
              active
                ? 'border-customBlue bg-customBlue/5 text-customBlue ring-1 ring-customBlue'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
            }`}
          >
            <span>{opt}</span>
            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? 'border-customBlue bg-customBlue' : 'border-slate-300'}`}>
              {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ErrorSummary({ errors }: { errors: Record<string, string | undefined> }) {
  const entries = Object.values(errors).filter(Boolean) as string[]
  if (entries.length === 0) return null
  return (
    <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-right">
      <div className="mb-2 flex items-center justify-start gap-2">
        <AlertCircle size={18} className="shrink-0 text-red-500" />
        <span className="text-sm font-black text-red-700">يرجى تصحيح الحقول التالية للتعثر:</span>
      </div>
      <ul className="space-y-1">
        {entries.map((msg, i) => (
          <li key={i} className="flex items-center justify-start gap-2 text-xs font-semibold text-red-600">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
            {msg}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Main Form Component ── */
export default function ExpertApply() {
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(1)
  const [form, setForm] = useState<ExpertApplicationPayload>(defaultForm)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [submitting, setSubmitting] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const topRef = useRef<HTMLDivElement>(null)
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  // Calculate dynamic steps based on selected roles
  const STEPS = useMemo(() => {
    const baseSteps = [
      { id: 'basic_info', label: 'البيانات الأساسية', icon: User },
      { id: 'professional', label: 'الخلفية المهنية', icon: Briefcase },
      { id: 'expertise', label: 'مجالات الخبرة', icon: Star },
      { id: 'roles', label: 'طبيعة المساهمة', icon: HeartHandshake },
    ]

    const roles = form.contribution_roles
    if (roles.includes('مدرب / مدربة')) baseSteps.push({ id: 'trainer', label: 'للمدربين', icon: BookOpen })
    if (roles.includes('خبير / خبيرة')) baseSteps.push({ id: 'expert', label: 'للخبراء', icon: Lightbulb })
    if (roles.includes('مستشار / مستشارة')) baseSteps.push({ id: 'consultant', label: 'للمستشارين', icon: Users })
    if (roles.includes('متخصص / متخصصة في الفعاليات والمؤتمرات')) baseSteps.push({ id: 'events', label: 'للفعاليات', icon: Mic })
    if (roles.includes('مرشد / Mentor')) baseSteps.push({ id: 'mentor', label: 'للمرشدين', icon: GraduationCap })
    if (roles.includes('محكم / مقيّم للمشاريع والتحديات')) baseSteps.push({ id: 'evaluator', label: 'للمحكمين', icon: Search })
    if (roles.includes('مشارك في المبادرات والمشاريع')) baseSteps.push({ id: 'participant', label: 'للمبادرات', icon: Settings })

    baseSteps.push({ id: 'availability', label: 'التفرغ والتعاون', icon: Calendar })
    baseSteps.push({ id: 'about', label: 'نبذة عنك', icon: Info })
    baseSteps.push({ id: 'consent', label: 'الموافقة والإرسال', icon: ClipboardCheck })

    return baseSteps.map((s, idx) => ({ ...s, stepIndex: idx + 1 }))
  }, [form.contribution_roles])

  const validateStep = (stepIndex: number, data: ExpertApplicationPayload) => {
    const err: Record<string, string | undefined> = {}
    const step = STEPS.find(s => s.stepIndex === stepIndex)
    if (!step) return err

    if (step.id === 'basic_info') {
      if (!data.full_name.trim()) err.full_name = 'الاسم الكامل مطلوب'
      if (!data.country) err.country = 'يرجى اختيار الدولة'
      if (!data.city.trim()) err.city = 'المدينة مطلوبة'
      if (!data.whatsapp_number.trim()) err.whatsapp_number = 'رقم الواتساب مطلوب'
      if (!data.email.trim()) err.email = 'البريد الإلكتروني مطلوب'
    } else if (step.id === 'professional') {
      if (!data.primary_specialty.trim()) err.primary_specialty = 'التخصص الأساسي مطلوب'
      if (!data.academic_qualification) err.academic_qualification = 'المؤهل الأكاديمي مطلوب'
      if (!data.job_title.trim()) err.job_title = 'المسمى الوظيفي الحالي مطلوب'
      if (!data.years_of_experience) err.years_of_experience = 'سنوات الخبرة مطلوبة'
    } else if (step.id === 'expertise') {
      if (data.expertise_fields.length === 0) err.expertise_fields = 'اختر مجالاً واحداً على الأقل'
      if (!data.expertise_level) err.expertise_level = 'مستوى الخبرة مطلوب'
      if (!data.tools_technologies.trim()) err.tools_technologies = 'الأدوات والتقنيات مطلوبة'
    } else if (step.id === 'roles') {
      if (data.contribution_roles.length === 0) err.contribution_roles = 'اختر دوراً واحداً على الأقل للمساهمة'
    } else if (step.id === 'availability') {
      if (data.availability_times.length === 0) err.availability_times = 'يرجى تحديد أوقات التعاون'
      if (!data.availability_level) err.availability_level = 'مستوى التفرغ مطلوب'
      if (data.collaboration_preferences.length === 0) err.collaboration_preferences = 'اختر نوع التعاون المفصل'
    } else if (step.id === 'about') {
      if (!data.bio.trim()) err.bio = 'النبذة التعريفية مطلوبة'
      if (!data.unique_value.trim()) err.unique_value = 'القيمة المضافة مطلوبة'
    } else if (step.id === 'consent') {
      if (!data.agree_to_contact) err.agree_to_contact = 'يجب الموافقة على التواصل'
      if (!data.agree_to_store_data) err.agree_to_store_data = 'يجب الموافقة على الاحتفاظ بالبيانات'
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
      setCompletedSteps(prev => {
        const s = new Set(prev)
        s.delete(currentStep)
        return s
      })
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
      toast.error('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  const progress = (completedSteps.size / STEPS.length) * 100
  const currentStepData = STEPS.find(s => s.stepIndex === currentStep)

  return (
    <main className="bg-[#f4f7fb] pt-20" ref={topRef}>
      <PublicSeo
        title="انضم إلينا كمدرب وخبير"
        description="الانضمام إلى مجتمع المدربين والخبراء والمستشارين والمتخصصين في EMC."
        path="/join-expert"
      />
      <PageHeader
        title="مجتمع المدربين والخبراء"
        breadcrumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'انضم إلينا كمدرب' }]}
      />

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Main Welcome & Introductory Text */}
          {currentStep === 1 && (
            <div className="mb-8 rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-100 text-right leading-relaxed text-slate-600">
              <h2 className="text-xl font-bold text-deepBlue mb-4">
                الانضمام إلى مجتمع المدربين والخبراء في EMC
              </h2>
              <p className="mb-4">
                تسعى EMC إلى بناء مجتمع من المدربين والخبراء والمستشارين والمتخصصين في مختلف المجالات، للمساهمة في تقديم برامج تدريبية نوعية، ومسارات مهنية، واستشارات، وفعاليات، ومبادرات ومشاريع معرفية تستجيب لاحتياجات المتعلمين وسوق العمل.
              </p>
              <p className="mb-4">
                إذا كنت تمتلك خبرة مهنية أو أكاديمية، أو خبرة في التدريب، أو الاستشارات، أو الإرشاد، أو تصميم وإدارة الفعاليات والمؤتمرات، ندعوك للتعريف بخبراتك ومجالات اهتمامك.
              </p>
              <p className="text-xs font-bold text-customBlue">
                ستساعدنا المعلومات المقدمة في التعرف على خبراتك وتصنيفها ضمن مجتمع EMC، والتواصل معك عند توفر فرص أو مشاريع تتناسب مع تخصصك وخبرتك.
              </p>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>الخطوة {currentStep} من {STEPS.length} ({currentStepData?.label})</span>
              <span>{Math.round(progress)}% مكتمل</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-customBlue to-customBlue/70"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              />
            </div>
          </div>

          {/* Step Card Container */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 sm:p-8"
            >
              <div className="mb-6 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-deepBlue/[0.07]">
                    {currentStepData && <currentStepData.icon className="text-deepBlue" size={20} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">القسم {currentStep}</p>
                    <h3 className="text-lg font-black text-deepBlue">{currentStepData?.label}</h3>
                  </div>
                </div>
              </div>

              <div ref={errorSummaryRef}>
                <ErrorSummary errors={errors} />
              </div>

              <div className="space-y-6">
                {/* ── القسم الأول | البيانات الأساسية ── */}
                {currentStepData?.id === 'basic_info' && (
                  <div className="space-y-6">
                    <Field label="1. الاسم الكامل" required error={errors.full_name}>
                      <Input value={form.full_name} onChange={(v: string) => set('full_name', v)} hasError={!!errors.full_name} />
                    </Field>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <Field label="2. الدولة" required error={errors.country}>
                        <CountrySelector
                          value={COUNTRIES.find(c => c.name === form.country) || null}
                          onChange={(c) => set('country', c?.name ?? '')}
                          error={errors.country}
                        />
                      </Field>
                      <Field label="3. المدينة" required error={errors.city}>
                        <Input value={form.city} onChange={(v: string) => set('city', v)} hasError={!!errors.city} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <Field label="4. رقم WhatsApp" required error={errors.whatsapp_number}>
                        <Input type="tel" value={form.whatsapp_number} onChange={(v: string) => set('whatsapp_number', v)} hasError={!!errors.whatsapp_number} dir="ltr" placeholder="+966 50 000 0000" />
                      </Field>
                      <Field label="5. البريد الإلكتروني" required error={errors.email}>
                        <Input type="email" value={form.email} onChange={(v: string) => set('email', v)} hasError={!!errors.email} dir="ltr" placeholder="example@domain.com" />
                      </Field>
                    </div>

                    <Field label="6. رابط LinkedIn أو Portfolio" optional error={errors.linkedin_url}>
                      <Input type="url" value={form.linkedin_url || ''} onChange={(v: string) => set('linkedin_url', v)} hasError={!!errors.linkedin_url} dir="ltr" placeholder="https://..." />
                    </Field>
                  </div>
                )}

                {/* ── القسم الثاني | الخلفية المهنية والأكاديمية ── */}
                {currentStepData?.id === 'professional' && (
                  <div className="space-y-6">
                    <Field label="7. ما تخصصك أو مجالك المهني الأساسي؟" required error={errors.primary_specialty}>
                      <Input value={form.primary_specialty} onChange={(v: string) => set('primary_specialty', v)} hasError={!!errors.primary_specialty} placeholder="مثال: ذكاء اصطناعي، أمن سيبراني، تسويق..." />
                    </Field>

                    <Field label="8. ما مؤهلك الأكاديمي؟" required error={errors.academic_qualification}>
                      <RadioGroup options={ACADEMIC_QUALIFICATION_OPTIONS} selected={form.academic_qualification} onChange={(v: string) => set('academic_qualification', v)} hasError={!!errors.academic_qualification} />
                    </Field>

                    <Field label="9. ما جهة عملك الحالية أو آخر جهة عمل؟" optional error={errors.current_employer}>
                      <Input value={form.current_employer || ''} onChange={(v: string) => set('current_employer', v)} hasError={!!errors.current_employer} />
                    </Field>

                    <Field label="10. ما المسمى الوظيفي الحالي؟" required error={errors.job_title}>
                      <Input value={form.job_title} onChange={(v: string) => set('job_title', v)} hasError={!!errors.job_title} />
                    </Field>

                    <Field label="11. كم سنة من الخبرة المهنية لديك في تخصصك؟" required error={errors.years_of_experience}>
                      <RadioGroup options={YEARS_EXPERIENCE_OPTIONS} selected={form.years_of_experience} onChange={(v: string) => set('years_of_experience', v)} hasError={!!errors.years_of_experience} />
                    </Field>
                  </div>
                )}

                {/* ── القسم الثالث | مجالات الخبرة ── */}
                {currentStepData?.id === 'expertise' && (
                  <div className="space-y-6">
                    <Field label="12. ما المجالات التي تمتلك خبرة فيها؟" required error={errors.expertise_fields} hint="اختيار متعدد">
                      <TagPicker options={EXPERTISE_FIELDS} selected={form.expertise_fields} onChange={(v: string[]) => set('expertise_fields', v)} hasError={!!errors.expertise_fields} />
                    </Field>

                    <Field label="13. ما مستوى خبرتك في مجالك الأساسي؟" required error={errors.expertise_level}>
                      <RadioGroup options={EXPERTISE_LEVEL_OPTIONS} selected={form.expertise_level} onChange={(v: string) => set('expertise_level', v)} hasError={!!errors.expertise_level} />
                    </Field>

                    <Field label="14. ما الأدوات أو التقنيات أو البرامج التي تتقن استخدامها؟" required error={errors.tools_technologies}>
                      <Textarea value={form.tools_technologies} onChange={(v: string) => set('tools_technologies', v)} hasError={!!errors.tools_technologies} placeholder="مثال: Python, Power BI, Figma, AWS..." />
                    </Field>
                  </div>
                )}

                {/* ── القسم الرابع | كيف يمكنك المساهمة مع EMC؟ ── */}
                {currentStepData?.id === 'roles' && (
                  <div className="space-y-6">
                    <Field label="15. كيف يمكنك المساهمة مع مجتمع EMC؟" required error={errors.contribution_roles} hint="يمكن اختيار أكثر من دور، وستظهر الأسئلة المرتبطة بالأدوار المختارة بعد هذه الخطوة.">
                      <TagPicker options={CONTRIBUTION_ROLES} selected={form.contribution_roles} onChange={(v: string[]) => set('contribution_roles', v)} hasError={!!errors.contribution_roles} />
                    </Field>
                  </div>
                )}

                {/* ── القسم الخامس | للمدربين ── */}
                {currentStepData?.id === 'trainer' && (
                  <div className="space-y-6">
                    <Field label="16. ما المجالات التي يمكنك التدريب فيها؟" optional hint="اختيار متعدد">
                      <TagPicker options={EXPERTISE_FIELDS} selected={form.trainer_fields || []} onChange={(v: string[]) => set('trainer_fields', v)} />
                    </Field>

                    <Field label="17. ما نوع البرامج التدريبية التي يمكنك تقديمها؟" optional hint="اختيار متعدد">
                      <TagPicker options={TRAINER_PROGRAM_TYPES} selected={form.trainer_program_types || []} onChange={(v: string[]) => set('trainer_program_types', v)} />
                    </Field>

                    <Field label="18. ما الفئات التي تستطيع تدريبها؟" optional hint="اختيار متعدد">
                      <TagPicker options={TRAINER_TARGET_AUDIENCES} selected={form.trainer_target_audiences || []} onChange={(v: string[]) => set('trainer_target_audiences', v)} />
                    </Field>

                    <Field label="19. ما نمط التدريب الذي يمكنك تقديمه؟" optional hint="اختيار متعدد">
                      <TagPicker options={TRAINER_DELIVERY_MODES} selected={form.trainer_delivery_mode || []} onChange={(v: string[]) => set('trainer_delivery_mode', v)} />
                    </Field>

                    <Field label="20. هل لديك خبرة سابقة في التدريب أو التعليم؟" optional>
                      <RadioGroup options={['نعم', 'لا']} selected={form.trainer_has_experience ? 'نعم' : 'لا'} onChange={(v: string) => set('trainer_has_experience', v === 'نعم')} />
                    </Field>

                    <Field label="21. كم سنة من الخبرة لديك في التدريب؟" optional>
                      <RadioGroup options={YEARS_EXPERIENCE_OPTIONS} selected={form.trainer_years_experience || ''} onChange={(v: string) => set('trainer_years_experience', v)} />
                    </Field>

                    <Field label="22. ما أبرز الدورات أو الورش أو البرامج التي سبق لك تقديمها؟" optional>
                      <Textarea value={form.trainer_previous_courses || ''} onChange={(v: string) => set('trainer_previous_courses', v)} placeholder="اذكر أهم الورش والبرامج..." />
                    </Field>

                    <Field label="23. هل لديك محتوى أو منهج تدريبي جاهز؟" optional>
                      <RadioGroup options={TRAINER_CONTENT_READINESS_OPTIONS} selected={form.trainer_content_readiness || ''} onChange={(v: string) => set('trainer_content_readiness', v)} />
                    </Field>
                  </div>
                )}

                {/* ── القسم السادس | للخبراء ── */}
                {currentStepData?.id === 'expert' && (
                  <div className="space-y-6">
                    <Field label="24. ما المجال أو المجالات التي تمتلك فيها خبرة متخصصة؟" optional>
                      <Textarea value={form.expert_specialty_areas || ''} onChange={(v: string) => set('expert_specialty_areas', v)} placeholder="صف المجالات التخصصية..." />
                    </Field>

                    <Field label="25. ما نوع الخبرة التي يمكنك تقديمها لـ EMC؟" optional hint="اختيار متعدد">
                      <TagPicker options={EXPERT_CONTRIBUTION_TYPES} selected={form.expert_contribution_types || []} onChange={(v: string[]) => set('expert_contribution_types', v)} />
                    </Field>

                    <Field label="26. ما أبرز المشاريع أو الإنجازات المرتبطة بخبرتك؟" optional>
                      <Textarea value={form.expert_achievements || ''} onChange={(v: string) => set('expert_achievements', v)} />
                    </Field>

                    <Field label="27. هل لديك اعتمادات أو شهادات مهنية مرتبطة بمجالك؟" optional>
                      <RadioGroup options={['نعم', 'لا']} selected={form.expert_has_certifications ? 'نعم' : 'لا'} onChange={(v: string) => set('expert_has_certifications', v === 'نعم')} />
                    </Field>

                    {form.expert_has_certifications && (
                      <Field label="28. يرجى ذكر أهم الشهادات أو الاعتمادات" optional>
                        <Textarea value={form.expert_certifications_details || ''} onChange={(v: string) => set('expert_certifications_details', v)} />
                      </Field>
                    )}
                  </div>
                )}

                {/* ── القسم السابع | للمستشارين ── */}
                {currentStepData?.id === 'consultant' && (
                  <div className="space-y-6">
                    <Field label="29. ما المجالات التي يمكنك تقديم الاستشارات فيها؟" optional hint="اختيار متعدد">
                      <TagPicker options={CONSULTANT_FIELDS} selected={form.consultant_fields || []} onChange={(v: string[]) => set('consultant_fields', v)} />
                    </Field>

                    <Field label="30. ما نوع الاستشارات التي يمكنك تقديمها؟" optional hint="اختيار متعدد">
                      <TagPicker options={CONSULTANT_TYPES} selected={form.consultant_types || []} onChange={(v: string[]) => set('consultant_types', v)} />
                    </Field>

                    <Field label="31. ما أبرز المشاريع أو الجهات التي سبق لك تقديم استشارات لها؟" optional>
                      <Textarea value={form.consultant_previous_clients || ''} onChange={(v: string) => set('consultant_previous_clients', v)} />
                    </Field>

                    <Field label="32. ما نوع الجهات التي تستطيع العمل معها؟" optional hint="اختيار متعدد">
                      <TagPicker options={CONSULTANT_TARGET_CLIENTS} selected={form.consultant_target_clients || []} onChange={(v: string[]) => set('consultant_target_clients', v)} />
                    </Field>
                  </div>
                )}

                {/* ── القسم الثامن | لمتخصصي الفعاليات والمؤتمرات ── */}
                {currentStepData?.id === 'events' && (
                  <div className="space-y-6">
                    <Field label="33. ما نوع الفعاليات التي تمتلك خبرة في تصميمها أو إدارتها؟" optional hint="اختيار متعدد">
                      <TagPicker options={EVENTS_TYPES} selected={form.events_types || []} onChange={(v: string[]) => set('events_types', v)} />
                    </Field>

                    <Field label="34. ما الجوانب التي يمكنك المساهمة فيها؟" optional hint="اختيار متعدد">
                      <TagPicker options={EVENTS_CONTRIBUTION_AREAS} selected={form.events_contribution_areas || []} onChange={(v: string[]) => set('events_contribution_areas', v)} />
                    </Field>

                    <Field label="35. اذكر أبرز الفعاليات أو المؤتمرات التي شاركت في تنظيمها أو إدارتها" optional>
                      <Textarea value={form.events_previous_events || ''} onChange={(v: string) => set('events_previous_events', v)} />
                    </Field>
                  </div>
                )}

                {/* ── القسم التاسع | للمرشدين Mentors ── */}
                {currentStepData?.id === 'mentor' && (
                  <div className="space-y-6">
                    <Field label="36. في أي المجالات يمكنك تقديم الإرشاد والتوجيه؟" optional hint="اختيار متعدد">
                      <TagPicker options={MENTOR_FIELDS} selected={form.mentor_fields || []} onChange={(v: string[]) => set('mentor_fields', v)} />
                    </Field>

                    <Field label="37. من الفئات التي تستطيع إرشادها؟" optional hint="اختيار متعدد">
                      <TagPicker options={MENTOR_TARGET_AUDIENCES} selected={form.mentor_target_audiences || []} onChange={(v: string[]) => set('mentor_target_audiences', v)} />
                    </Field>

                    <Field label="38. ما نوع الإرشاد الذي يمكنك تقديمه؟" optional hint="اختيار متعدد">
                      <TagPicker options={MENTOR_SESSION_TYPES} selected={form.mentor_session_types || []} onChange={(v: string[]) => set('mentor_session_types', v)} />
                    </Field>
                  </div>
                )}

                {/* ── القسم العاشر | للمحكمين والمقيّمين ── */}
                {currentStepData?.id === 'evaluator' && (
                  <div className="space-y-6">
                    <Field label="39. ما المجالات التي يمكنك تقييم المشاريع فيها؟" optional hint="اختيار متعدد">
                      <TagPicker options={EVALUATOR_FIELDS} selected={form.evaluator_fields || []} onChange={(v: string[]) => set('evaluator_fields', v)} />
                    </Field>

                    <Field label="40. ما نوع التقييم الذي يمكنك تقديمه؟" optional hint="اختيار متعدد">
                      <TagPicker options={EVALUATOR_TYPES} selected={form.evaluator_types || []} onChange={(v: string[]) => set('evaluator_types', v)} />
                    </Field>
                  </div>
                )}

                {/* ── القسم الحادي عشر | المبادرات والمشاريع ── */}
                {currentStepData?.id === 'participant' && (
                  <div className="space-y-6">
                    <Field label="41. ما نوع المبادرات أو المشاريع التي ترغب بالمشاركة فيها؟" optional hint="اختيار متعدد">
                      <TagPicker options={PARTICIPANT_PROJECT_TYPES} selected={form.participant_project_types || []} onChange={(v: string[]) => set('participant_project_types', v)} />
                    </Field>

                    <Field label="42. كيف يمكنك المساهمة؟" optional>
                      <Textarea value={form.participant_contribution_method || ''} onChange={(v: string) => set('participant_contribution_method', v)} />
                    </Field>
                  </div>
                )}

                {/* ── القسم الثاني عشر | التفرغ والتعاون ── */}
                {currentStepData?.id === 'availability' && (
                  <div className="space-y-6">
                    <Field label="43. ما الأوقات التي يمكنك التعاون خلالها؟" required error={errors.availability_times} hint="اختيار متعدد">
                      <TagPicker options={AVAILABILITY_TIMES} selected={form.availability_times} onChange={(v: string[]) => set('availability_times', v)} hasError={!!errors.availability_times} />
                    </Field>

                    <Field label="44. ما مستوى توفرك للمشاركة مع EMC؟" required error={errors.availability_level}>
                      <RadioGroup options={AVAILABILITY_LEVELS} selected={form.availability_level} onChange={(v: string) => set('availability_level', v)} hasError={!!errors.availability_level} />
                    </Field>

                    <Field label="45. ما نوع التعاون الذي تفضله مع EMC؟" required error={errors.collaboration_preferences} hint="اختيار متعدد">
                      <TagPicker options={COLLABORATION_PREFERENCES} selected={form.collaboration_preferences} onChange={(v: string[]) => set('collaboration_preferences', v)} hasError={!!errors.collaboration_preferences} />
                    </Field>
                  </div>
                )}

                {/* ── القسم الثالث عشر | نبذة عنك ── */}
                {currentStepData?.id === 'about' && (
                  <div className="space-y-6">
                    <Field
                      label="46. نبذة تعريفية"
                      required
                      error={errors.bio}
                      hint="عرّفنا بنفسك وخبرتك المهنية أو الأكاديمية، وأبرز المجالات التي تتميز فيها، والقيمة التي يمكنك تقديمها لمجتمع EMC."
                    >
                      <Textarea value={form.bio} onChange={(v: string) => set('bio', v)} hasError={!!errors.bio} placeholder="اكتب نبذة شاملة عن خبراتك..." />
                    </Field>

                    <Field label="47. ما الذي يميزك أو ما القيمة التي يمكنك إضافتها إلى EMC؟" required error={errors.unique_value}>
                      <Textarea value={form.unique_value} onChange={(v: string) => set('unique_value', v)} hasError={!!errors.unique_value} placeholder="القيمة المضافة التي تسعى لتقديمها..." />
                    </Field>
                  </div>
                )}

                {/* ── القسم الرابع عشر | الموافقة والتواصل ── */}
                {currentStepData?.id === 'consent' && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-right space-y-6">
                      <Field label="48. هل توافق على تواصل فريق EMC معك عند توفر فرصة أو مشروع يتناسب مع خبراتك واهتماماتك؟" required error={errors.agree_to_contact}>
                        <RadioGroup
                          options={['نعم', 'لا']}
                          selected={form.agree_to_contact ? 'نعم' : 'لا'}
                          onChange={(v: string) => set('agree_to_contact', v === 'نعم')}
                        />
                      </Field>

                      <Field label="49. هل توافق على الاحتفاظ ببياناتك ضمن قاعدة بيانات مجتمع المدربين والخبراء والمتخصصين في EMC؟" required error={errors.agree_to_store_data}>
                        <RadioGroup
                          options={['نعم', 'لا']}
                          selected={form.agree_to_store_data ? 'نعم' : 'لا'}
                          onChange={(v: string) => set('agree_to_store_data', v === 'نعم')}
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </div>

              {/* Step Navigation Controls */}
              <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={currentStep === 1 || submitting}
                  className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:invisible"
                >
                  <ArrowRight size={16} />
                  السابق
                </button>

                {currentStep < STEPS.length ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex items-center gap-2 rounded-xl bg-customBlue px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-deepBlue"
                  >
                    التالي
                    <ArrowLeft size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-green-500 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-600 disabled:opacity-70"
                  >
                    {submitting ? 'جاري إرسال الطلب...' : 'إرسال الطلب'}
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
