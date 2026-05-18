import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Headphones,
  Home,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { submitWorkshopRequest } from '../api/workshopRequestsApi'
import AppAlert from '../components/ui/AppAlert'
import AppBadge from '../components/ui/AppBadge'
import AppButton from '../components/ui/AppButton'
import AppCheckboxGroup from '../components/ui/AppCheckboxGroup'
import AppFileUpload from '../components/ui/AppFileUpload'
import AppInput from '../components/ui/AppInput'
import AppRadioGroup from '../components/ui/AppRadioGroup'
import AppTextarea from '../components/ui/AppTextarea'

type ValidationErrors = Record<string, string[]>

type WorkshopFormValues = {
  requester_name: string
  requester_email: string
  requester_phone: string
  requester_department: string
  program_name: string
  speaker_name: string
  speaker_job_title: string
  topics: string
  target_audience: string
  proposed_date: string
  proposed_time: string
  price_type: 'free' | 'paid'
  price_amount: string
}

const categories = [
  'المسارات الأكاديمية والمهنية',
  'التعلم الدولي والتبادل',
  'معهد اللغة والتواصل',
  'الذكاء الاصطناعي والتمكين الرقمي',
  'تطوير المهارات والمسار المهني',
  'القيادة وريادة الأعمال',
  'مساحات الوعي والمعرفة',
  'الصحة النفسية ونمط الحياة',
  'الوعي المالي',
  'التعلم التجريبي والأنشطة الميدانية',
  'تطوير الأطفال والناشئة Future Minds',
  'الشراكات والتعاون الاستراتيجي',
]

const locationTypes = ['مقر المركز', 'Google Meet', 'Zoom', 'أخرى']

const STEP_META = [
  { id: 1, title: 'بيانات مقدم الطلب', hint: 'تواصل ومتابعة الطلب' },
  { id: 2, title: 'بيانات الورشة', hint: 'البرنامج والمتحدث والمجالات' },
  { id: 3, title: 'تفاصيل التنفيذ', hint: 'محاور، جمهور، موعد ومكان' },
  { id: 4, title: 'المراجعة والإرسال', hint: 'التسعير ثم الإرسال النهائي' },
] as const

const initialForm: WorkshopFormValues = {
  requester_name: '',
  requester_email: '',
  requester_phone: '',
  requester_department: '',
  program_name: '',
  speaker_name: '',
  speaker_job_title: '',
  topics: '',
  target_audience: '',
  proposed_date: '',
  proposed_time: '',
  price_type: 'free',
  price_amount: '',
}

const stepAnimation = {
  initial: { opacity: 0, x: -18 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 18 },
  transition: { duration: 0.26, ease: [0.22, 0.61, 0.36, 1] as const },
}

const glassCard =
  'rounded-3xl border border-white/70 bg-white/75 shadow-[0_20px_60px_-18px_rgba(34,51,74,0.14)] backdrop-blur-md ring-1 ring-slate-200/45'

const SUCCESS_TITLE = 'تم استلام الطلب بنجاح'
const SUCCESS_DESCRIPTION =
  'تم إرسال طلب الورشة بنجاح، وسيقوم فريق EMC بالتواصل معك بعد مراجعة البيانات.'

/** Ring length for r=54 in viewBox 0 0 120 120 */
const RING_LEN = 2 * Math.PI * 54

function WorkshopSuccessCelebration({
  open,
  onReset,
}: {
  open: boolean
  onReset: () => void
}) {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${12 + (i * 41) % 76}%`,
    top: `${8 + (i * 29) % 72}%`,
    delay: i * 0.035,
    wide: i % 3 === 0,
    tone: i % 2 === 0 ? '#2691C2' : '#EC943C',
  }))

  return (
    <AnimatePresence>
      {open ?
        <motion.div
          key="success-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="workshop-success-title"
          aria-describedby="workshop-success-desc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/55 px-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-[0_28px_80px_-16px_rgba(34,51,74,0.35)] ring-1 ring-[#2691C2]/15 backdrop-blur-xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(38,145,194,0.14),transparent_50%),radial-gradient(ellipse_at_10%_90%,rgba(236,148,60,0.12),transparent_48%)]" />

            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {particles.map((p) => (
                <motion.span
                  key={p.id}
                  className="absolute rounded-full opacity-0 shadow-sm"
                  style={{
                    left: p.left,
                    top: p.top,
                    width: p.wide ? 10 : 6,
                    height: p.wide ? 10 : 6,
                    background: p.tone,
                  }}
                  initial={{ opacity: 0, scale: 0, y: 12 }}
                  animate={{
                    opacity: [0, 0.85, 0.35],
                    scale: [0, 1, 0.85],
                    y: [12, -28, -12],
                  }}
                  transition={{
                    duration: 1.15,
                    delay: 0.25 + p.delay,
                    ease: [0.22, 0.61, 0.36, 1],
                  }}
                />
              ))}
            </div>

            <div className="relative px-8 pb-9 pt-10 text-center">
              <div className="relative mx-auto mb-8 flex h-[120px] w-[120px] items-center justify-center">
                <svg
                  width={120}
                  height={120}
                  viewBox="0 0 120 120"
                  className="-rotate-90 shrink-0 overflow-visible"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="workshopSuccessRing" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2691C2" />
                      <stop offset="100%" stopColor="#EC943C" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="url(#workshopSuccessRing)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={RING_LEN}
                    initial={{ strokeDashoffset: RING_LEN }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 0.72, ease: [0.22, 0.61, 0.36, 1], delay: 0.08 }}
                  />
                </svg>

                <motion.div
                  className="absolute inset-0 m-auto grid h-[72px] w-[72px] place-items-center rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 shadow-[0_14px_36px_rgba(16,185,129,0.45)] ring-4 ring-white"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.58 }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.72 }}
                  >
                    <Check className="h-10 w-10 text-white" strokeWidth={3} aria-hidden />
                  </motion.div>
                </motion.div>
              </div>

              <h2 id="workshop-success-title" className="text-xl font-black leading-snug text-[#22334A] sm:text-2xl">
                {SUCCESS_TITLE}
              </h2>
              <p id="workshop-success-desc" className="mx-auto mt-4 max-w-sm text-[14px] font-semibold leading-relaxed text-muted-600">
                {SUCCESS_DESCRIPTION}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row-reverse sm:justify-center">
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to="/"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-[13px] font-black text-[#22334A] shadow-sm transition hover:border-[#2691C2]/35 hover:bg-slate-50 sm:w-auto"
                  >
                    <Home className="h-4 w-4 text-[#2691C2]" aria-hidden />
                    العودة للرئيسية
                  </Link>
                </motion.div>
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                  <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#2691C2] to-[#1e7aad] px-6 py-3 text-[13px] font-black text-white shadow-[0_14px_32px_rgba(38,145,194,0.38)] transition hover:brightness-[1.05] sm:w-auto"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    تقديم طلب جديد
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>
  )
}

export default function SubmitWorkshop() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WorkshopFormValues>(initialForm)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [speakerPhoto, setSpeakerPhoto] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [apiError, setApiError] = useState('')
  const [submissionSuccess, setSubmissionSuccess] = useState(false)

  useEffect(() => {
    if (!submissionSuccess) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [submissionSuccess])

  function resetWizard() {
    setSubmissionSuccess(false)
    setForm(initialForm)
    setSelectedCategories([])
    setSelectedLocations([])
    setSpeakerPhoto(null)
    setStep(1)
    setValidationErrors({})
    setApiError('')
  }

  const updateField = (name: keyof WorkshopFormValues, value: string) => {
    setForm((previous) => ({
      ...previous,
      [name]: name === 'price_type' ? (value as WorkshopFormValues['price_type']) : value,
      price_amount: name === 'price_type' && value === 'free' ? '' : previous.price_amount,
    }))
    setApiError('')
  }

  const getError = (...keys: string[]) => keys.map((key) => validationErrors[key]?.[0]).find(Boolean)

  const validateStep = (targetStep = step) => {
    const errors: ValidationErrors = {}
    const required = (key: keyof WorkshopFormValues, message: string) => {
      if (!form[key].trim()) errors[key] = [message]
    }

    if (targetStep === 1) {
      required('requester_name', 'يرجى إدخال اسم مقدم الطلب.')
      required('requester_email', 'يرجى إدخال البريد الإلكتروني.')
      required('requester_phone', 'يرجى إدخال رقم الجوال.')
      required('requester_department', 'يرجى إدخال القسم أو الجهة.')
    }

    if (targetStep === 2) {
      required('program_name', 'يرجى إدخال اسم البرنامج.')
      required('speaker_name', 'يرجى إدخال اسم المتحدث.')
      required('speaker_job_title', 'يرجى إدخال المسمى الوظيفي للمتحدث.')
      if (selectedCategories.length === 0) errors.categories = ['يرجى اختيار فئة واحدة على الأقل.']
    }

    if (targetStep === 3) {
      required('topics', 'يرجى كتابة محاور الورشة.')
      required('target_audience', 'يرجى تحديد الجمهور المستهدف.')
      required('proposed_date', 'يرجى اختيار التاريخ المقترح.')
      required('proposed_time', 'يرجى اختيار الوقت المقترح.')
      if (selectedLocations.length === 0) errors.location_types = ['يرجى اختيار طريقة تنفيذ واحدة على الأقل.']
    }

    if (targetStep === 4 && form.price_type === 'paid') {
      required('price_amount', 'يرجى إدخال قيمة السعر عند اختيار ورشة مدفوعة.')
    }

    return errors
  }

  const goToNextStep = () => {
    const errors = validateStep()
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setApiError('يرجى إكمال الحقول المطلوبة في هذه الخطوة قبل المتابعة.')
      return
    }

    setValidationErrors({})
    setApiError('')
    setStep((current) => Math.min(current + 1, 4))
  }

  const goToPreviousStep = () => {
    setValidationErrors({})
    setApiError('')
    setStep((current) => Math.max(current - 1, 1))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApiError('')
    setSubmissionSuccess(false)

    const allErrors = [1, 2, 3, 4].reduce<ValidationErrors>(
      (errors, currentStep) => ({ ...errors, ...validateStep(currentStep) }),
      {},
    )

    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(allErrors)
      setApiError('يرجى مراجعة الحقول المطلوبة قبل إرسال الطلب.')
      const firstBroken = ([1, 2, 3, 4] as const).find((s) => Object.keys(validateStep(s)).length > 0)
      setStep(firstBroken ?? step)
      return
    }

    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      payload.append(key, value)
    })
    selectedCategories.forEach((category) => payload.append('categories[]', category))
    selectedLocations.forEach((locationType) => payload.append('location_types[]', locationType))
    if (speakerPhoto) payload.append('speaker_photo', speakerPhoto)

    try {
      setIsSubmitting(true)
      await submitWorkshopRequest(payload)
      setValidationErrors({})
      setSubmissionSuccess(true)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const backendErrors = error.response.data?.errors ?? {}
        setValidationErrors(backendErrors)
        setApiError(error.response.data?.message ?? 'يرجى التحقق من البيانات المدخلة.')
        return
      }

      setApiError('تعذر إرسال الطلب الآن. يرجى المحاولة مرة أخرى لاحقا.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPct = Math.round((step / 4) * 100)

  const previewRows = [
    { label: 'الاسم', value: form.requester_name },
    { label: 'البريد', value: form.requester_email },
    { label: 'رقم الجوال', value: form.requester_phone },
    { label: 'عنوان الورشة', value: form.program_name },
    {
      label: 'المجال',
      value: selectedCategories.length ? selectedCategories.slice(0, 2).join('، ') + (selectedCategories.length > 2 ? '…' : '') : '',
    },
    {
      label: 'طريقة التنفيذ',
      value: selectedLocations.length ? selectedLocations.join('، ') : '',
    },
    {
      label: 'التاريخ المقترح',
      value:
        form.proposed_date || form.proposed_time ?
          [form.proposed_date, form.proposed_time].filter(Boolean).join(' · ')
        : '',
    },
  ]

  const previewHasData =
    previewRows.some((r) => r.value.trim()) ||
    selectedCategories.length > 0 ||
    selectedLocations.length > 0 ||
    form.requester_department.trim().length > 0

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-[#f1f5f9] via-white to-[#2691C2]/[0.06] pb-20 pt-[5.25rem]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-l from-[#22334A] via-[#1a2940] to-[#0F172A] px-5 py-7 text-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] sm:px-8 sm:py-8"
        >
          <div className="pointer-events-none absolute -left-24 top-0 h-48 w-48 rounded-full bg-[#2691C2]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 end-10 h-40 w-40 rounded-full bg-[#EC943C]/20 blur-3xl" />
          <div className="relative text-right">
            <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-white/85">
              <Link to="/" className="transition hover:text-white">
                الرئيسية
              </Link>
              <ChevronLeft className="h-4 w-4 shrink-0 rotate-180 text-[#EC943C]" aria-hidden />
              <span className="text-white">تقديم ورشة عمل</span>
            </nav>
            <h1 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">تقديم ورشة عمل</h1>
            <p className="mt-3 max-w-2xl text-[14px] font-semibold leading-relaxed text-white/80">
              شارك خبرتك مع مجتمع EMC عبر طلب واضح ومنظم يصل مباشرة إلى الفريق المختص.
            </p>
          </div>
        </motion.div>

        <div className="mt-8 space-y-5" aria-live="polite">
          {submissionSuccess ?
            <span className="sr-only">{`${SUCCESS_TITLE}. ${SUCCESS_DESCRIPTION}`}</span>
          : null}
          {apiError && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <AppAlert type="error" title="تنبيه" message={apiError} dismissible onDismiss={() => setApiError('')} />
            </motion.div>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <motion.div
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className={cn(glassCard, 'overflow-hidden')}
            >
              <div className="border-b border-slate-200/70 bg-gradient-to-l from-white via-slate-50/80 to-white px-6 py-6 sm:px-8">
                <div className="hidden lg:block">
                  <div className="relative mb-8">
                    <div className="absolute end-[12%] start-[12%] top-[22px] z-0 h-[5px] rounded-full bg-gradient-to-l from-slate-200 via-[#2691C2]/25 to-slate-200" aria-hidden />
                    <div className="relative z-[1] grid grid-cols-4 gap-2">
                      {STEP_META.map((meta) => {
                        const done = step > meta.id
                        const active = step === meta.id
                        return (
                          <div key={meta.id} className="flex flex-col items-center text-center">
                            <motion.span
                              layout
                              className={cn(
                                'grid h-11 w-11 place-items-center rounded-2xl text-[13px] font-black shadow-md ring-2 ring-white transition',
                                done && 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
                                active &&
                                  !done &&
                                  'bg-gradient-to-br from-[#EC943C] to-amber-600 text-white shadow-[0_12px_28px_rgba(236,148,60,0.35)]',
                                !done && !active && 'border border-slate-200 bg-white text-slate-500',
                              )}
                            >
                              {done ?
                                <Check className="h-5 w-5" aria-hidden />
                              : meta.id}
                            </motion.span>
                            <p className="mt-3 hidden text-[11px] font-black leading-snug text-[#22334A] lg:block">{meta.title}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2691C2]/20 bg-[#2691C2]/[0.07] px-4 py-3">
                    <span className="text-[12px] font-black text-[#22334A]">تقدّم الطلب</span>
                    <span className="text-sm font-black text-[#2691C2]">{progressPct}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/90">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-l from-[#2691C2] to-[#EC943C]"
                      initial={false}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                    />
                  </div>
                </div>

                <div className="lg:hidden">
                  <div className="space-y-3">
                    {STEP_META.map((meta) => {
                      const done = step > meta.id
                      const active = step === meta.id
                      return (
                        <div
                          key={meta.id}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl border px-4 py-3 transition',
                            active && 'border-[#2691C2]/45 bg-[#2691C2]/[0.06] shadow-sm',
                            done && !active && 'border-emerald-200/80 bg-emerald-50/50',
                            !done && !active && 'border-slate-200/80 bg-white/90',
                          )}
                        >
                          <span
                            className={cn(
                              'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[12px] font-black',
                              done && 'bg-emerald-600 text-white',
                              active && !done && 'bg-[#EC943C] text-white',
                              !done && !active && 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {done ?
                              <Check className="h-4 w-4" aria-hidden />
                            : meta.id}
                          </span>
                          <div className="min-w-0 flex-1 text-right">
                            <p className="text-[13px] font-black text-[#22334A]">{meta.title}</p>
                            <p className="text-[11px] font-semibold text-muted-600">{meta.hint}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-100/90 px-4 py-2.5">
                    <span className="text-[11px] font-black text-slate-700">التقدّم</span>
                    <span className="text-[13px] font-black text-[#2691C2]">{progressPct}%</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8 px-6 py-8 sm:px-8">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div key="requester" {...stepAnimation} className="space-y-6">
                      <header className="text-right">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2691C2]">الخطوة ١ من ٤</p>
                        <h2 className="mt-2 text-xl font-black text-[#22334A]">بيانات مقدم الطلب</h2>
                        <p className="mt-2 text-[13px] font-semibold text-muted-600">
                          بيانات التواصل التي سيستخدمها فريق EMC لمتابعة طلبك.
                        </p>
                      </header>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <AppInput
                          variant="emc"
                          label="الاسم الكامل"
                          name="requester_name"
                          value={form.requester_name}
                          onChange={(value) => updateField('requester_name', value)}
                          placeholder="اكتب الاسم الكامل"
                          error={getError('requester_name')}
                          required
                          icon="user"
                        />
                        <AppInput
                          variant="emc"
                          label="البريد الإلكتروني"
                          name="requester_email"
                          type="email"
                          value={form.requester_email}
                          onChange={(value) => updateField('requester_email', value)}
                          placeholder="name@example.com"
                          error={getError('requester_email')}
                          required
                          icon="mail"
                        />
                        <AppInput
                          variant="emc"
                          label="رقم الجوال"
                          name="requester_phone"
                          type="tel"
                          value={form.requester_phone}
                          onChange={(value) => updateField('requester_phone', value)}
                          placeholder="+966 5X XXX XXXX"
                          error={getError('requester_phone')}
                          required
                          icon="phone"
                        />
                        <AppInput
                          variant="emc"
                          label="القسم أو الجهة"
                          name="requester_department"
                          value={form.requester_department}
                          onChange={(value) => updateField('requester_department', value)}
                          placeholder="مثال: كلية الأعمال"
                          error={getError('requester_department')}
                          required
                          icon="text"
                        />
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="program" {...stepAnimation} className="space-y-6">
                      <header className="text-right">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2691C2]">الخطوة ٢ من ٤</p>
                        <h2 className="mt-2 text-xl font-black text-[#22334A]">بيانات الورشة</h2>
                        <p className="mt-2 text-[13px] font-semibold text-muted-600">
                          صِف البرنامج، المتحدث، والمجالات التي تمثل محتواك.
                        </p>
                      </header>

                      <AppInput
                        variant="emc"
                        label="اسم البرنامج / عنوان الورشة"
                        name="program_name"
                        value={form.program_name}
                        onChange={(value) => updateField('program_name', value)}
                        placeholder="مثال: مقدمة عملية في الذكاء الاصطناعي"
                        error={getError('program_name')}
                        required
                        icon="text"
                      />

                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                        <AppCheckboxGroup
                          label="فئات البرنامج"
                          name="categories"
                          options={categories.map((category) => ({ label: category, value: category }))}
                          selected={selectedCategories}
                          onChange={setSelectedCategories}
                          error={getError('categories', 'categories[]')}
                          required
                          columns={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <AppInput
                          variant="emc"
                          label="اسم المتحدث"
                          name="speaker_name"
                          value={form.speaker_name}
                          onChange={(value) => updateField('speaker_name', value)}
                          placeholder="اسم المتحدث الرئيسي"
                          error={getError('speaker_name')}
                          required
                          icon="user"
                        />
                        <AppInput
                          variant="emc"
                          label="المسمى الوظيفي"
                          name="speaker_job_title"
                          value={form.speaker_job_title}
                          onChange={(value) => updateField('speaker_job_title', value)}
                          placeholder="مثال: مستشار تطوير مهني"
                          error={getError('speaker_job_title')}
                          required
                          icon="text"
                        />
                      </div>

                      <AppFileUpload
                        label="صورة المتحدث"
                        name="speaker_photo"
                        file={speakerPhoto}
                        onChange={setSpeakerPhoto}
                        accept="image/*"
                        hint="JPG أو PNG، ويفضل ألا تتجاوز 5MB"
                        error={getError('speaker_photo')}
                      />
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div key="details" {...stepAnimation} className="space-y-6">
                      <header className="text-right">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2691C2]">الخطوة ٣ من ٤</p>
                        <h2 className="mt-2 text-xl font-black text-[#22334A]">تفاصيل التنفيذ</h2>
                        <p className="mt-2 text-[13px] font-semibold text-muted-600">
                          المحاور، الجمهور، الموعد المقترح، وأسلوب التنفيذ.
                        </p>
                      </header>

                      <AppTextarea
                        variant="emc"
                        label="المواضيع والمحاور"
                        name="topics"
                        value={form.topics}
                        onChange={(value) => updateField('topics', value)}
                        placeholder="اكتب أهم المحاور التي ستغطيها الورشة."
                        error={getError('topics')}
                        required
                        rows={5}
                        maxLength={1000}
                      />
                      <AppTextarea
                        variant="emc"
                        label="الجمهور المستهدف"
                        name="target_audience"
                        value={form.target_audience}
                        onChange={(value) => updateField('target_audience', value)}
                        placeholder="مثال: طلبة السنة الأولى، الخريجون، أو المهتمون بريادة الأعمال."
                        error={getError('target_audience')}
                        required
                        rows={3}
                        maxLength={500}
                      />

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <AppInput
                          variant="emc"
                          label="التاريخ المقترح"
                          name="proposed_date"
                          type="date"
                          value={form.proposed_date}
                          onChange={(value) => updateField('proposed_date', value)}
                          error={getError('proposed_date')}
                          required
                          icon="calendar"
                        />
                        <AppInput
                          variant="emc"
                          label="الوقت المقترح"
                          name="proposed_time"
                          type="time"
                          value={form.proposed_time}
                          onChange={(value) => updateField('proposed_time', value)}
                          error={getError('proposed_time')}
                          required
                          icon="time"
                        />
                      </div>

                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                        <AppCheckboxGroup
                          label="طريقة أو مكان التنفيذ"
                          name="location_types"
                          options={locationTypes.map((locationType) => ({ label: locationType, value: locationType }))}
                          selected={selectedLocations}
                          onChange={setSelectedLocations}
                          error={getError('location_types', 'location_types[]')}
                          required
                          columns={2}
                        />
                      </div>
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div key="pricing" {...stepAnimation} className="space-y-6">
                      <header className="text-right">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2691C2]">الخطوة ٤ من ٤</p>
                        <h2 className="mt-2 text-xl font-black text-[#22334A]">المراجعة والإرسال</h2>
                        <p className="mt-2 text-[13px] font-semibold text-muted-600">
                          حدّد نوع السعر ثم أرسل الطلب بعد المراجعة النهائية.
                        </p>
                      </header>

                      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-inner">
                        <AppRadioGroup
                          label="نوع السعر"
                          name="price_type"
                          options={[
                            { label: 'مجانية', value: 'free' },
                            { label: 'مدفوعة', value: 'paid' },
                          ]}
                          selected={form.price_type}
                          onChange={(value) => updateField('price_type', value)}
                          error={getError('price_type')}
                          required
                          columns={2}
                        />
                      </div>

                      {form.price_type === 'paid' && (
                        <AppInput
                          variant="emc"
                          label="قيمة السعر"
                          name="price_amount"
                          type="number"
                          value={form.price_amount}
                          onChange={(value) => updateField('price_amount', value)}
                          placeholder="اكتب المبلغ باليورو (€)"
                          error={getError('price_amount')}
                          required
                        />
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2691C2]/25 bg-[#2691C2]/[0.06] px-4 py-4">
                        <div className="text-right">
                          <p className="text-[13px] font-black text-[#22334A]">جاهز للإرسال؟</p>
                          <p className="mt-1 text-[12px] font-semibold text-muted-600">
                            راجع الملخص على الجانب قبل تأكيد الطلب.
                          </p>
                        </div>
                        <AppBadge label={form.price_type === 'free' ? 'مجانية' : 'مدفوعة'} variant="secondary" size="sm" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:justify-end">
                    {step > 1 && (
                      <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} className="sm:min-w-[8rem]">
                        <AppButton type="button" variant="outline" onClick={goToPreviousStep} fullWidth className="rounded-2xl border-2 border-slate-200 bg-white font-black text-[#22334A] hover:border-[#2691C2]/35 hover:bg-slate-50">
                          <ArrowRight size={18} aria-hidden />
                          السابق
                        </AppButton>
                      </motion.div>
                    )}
                    {step < 4 ?
                      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} className="flex-1 sm:max-w-xs sm:flex-none">
                        <AppButton
                          type="button"
                          variant="secondary"
                          onClick={goToNextStep}
                          fullWidth
                          className="rounded-2xl border-0 bg-gradient-to-l from-[#2691C2] to-[#1e7aad] font-black shadow-[0_14px_32px_rgba(38,145,194,0.35)] hover:brightness-[1.05]"
                        >
                          التالي
                          <ArrowLeft size={18} aria-hidden />
                        </AppButton>
                      </motion.div>
                    :
                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={!isSubmitting ? { y: -2 } : undefined}
                        whileTap={!isSubmitting ? { scale: 0.99 } : undefined}
                        className={cn(
                          'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-3 text-[14px] font-black text-white shadow-[0_14px_36px_rgba(236,148,60,0.38)] transition disabled:cursor-not-allowed disabled:opacity-55 sm:flex-none sm:px-10',
                          'bg-gradient-to-l from-[#EC943C] to-amber-600 hover:brightness-[1.03]',
                        )}
                      >
                        {isSubmitting ?
                          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                        : <CheckCircle2 size={20} aria-hidden />}
                        إرسال الطلب
                      </motion.button>
                    }
                  </div>
                </div>
              </form>
            </motion.div>
          </div>

          <aside className="space-y-6 lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
            <motion.div
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className={cn(glassCard, 'p-6')}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 pb-4 text-right">
                <div>
                  <h3 className="text-lg font-black text-[#22334A]">ملخص الطلب</h3>
                  <p className="mt-1 text-[12px] font-semibold text-muted-600">يتجدّد أثناء تعبئة الخطوات</p>
                </div>
                <span className="rounded-xl bg-[#2691C2]/10 px-2.5 py-1 text-[11px] font-black text-[#2691C2] ring-1 ring-[#2691C2]/25">
                  مباشر
                </span>
              </div>

              {!previewHasData ?
                <p className="mt-6 rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/90 px-4 py-10 text-center text-[13px] font-bold text-muted-600">
                  لم يتم إدخال البيانات بعد
                </p>
              :
                <motion.dl layout className="mt-6 space-y-4 text-right">
                  {previewRows.map((row) => (
                    <motion.div key={row.label} layout initial={{ opacity: 0.85 }} animate={{ opacity: 1 }} className="border-b border-slate-100 pb-3 last:border-0">
                      <dt className="text-[11px] font-black uppercase tracking-wide text-muted-500">{row.label}</dt>
                      <dd className="mt-1 text-[13px] font-bold text-[#22334A]">{row.value.trim() || '—'}</dd>
                    </motion.div>
                  ))}
                  {form.requester_department.trim() ?
                    <motion.div layout className="border-b border-slate-100 pb-3">
                      <dt className="text-[11px] font-black uppercase tracking-wide text-muted-500">القسم أو الجهة</dt>
                      <dd className="mt-1 text-[13px] font-bold text-[#22334A]">{form.requester_department}</dd>
                    </motion.div>
                  : null}
                </motion.dl>
              }
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className={cn(glassCard, 'overflow-hidden')}
            >
              <div className="flex items-start gap-4 bg-gradient-to-l from-[#EC943C]/15 via-white to-white p-6 text-right">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#2691C2]/15 text-[#2691C2] ring-1 ring-[#2691C2]/25">
                  <Headphones className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#22334A]">تحتاج مساعدة؟</h3>
                  <p className="mt-2 text-[13px] font-semibold leading-relaxed text-muted-700">
                    فريق EMC سيراجع طلبك ويتواصل معك بعد الإرسال.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.14 }}
              className={cn(glassCard, 'p-6')}
            >
              <h3 className="text-right text-[13px] font-black text-[#22334A]">قائمة التحقّق</h3>
              <ul className="mt-4 space-y-3 text-right">
                {STEP_META.map((meta) => {
                  const done = step > meta.id
                  const active = step === meta.id
                  return (
                    <li key={meta.id} className="flex items-center gap-3">
                      <span
                        className={cn(
                          'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[12px] font-black shadow-sm ring-2 ring-white',
                          done && 'bg-emerald-500 text-white',
                          active && !done && 'bg-[#2691C2] text-white shadow-[0_8px_20px_rgba(38,145,194,0.35)]',
                          !done && !active && 'border border-slate-200 bg-slate-50 text-slate-500',
                        )}
                      >
                        {done ?
                          <Check className="h-4 w-4" aria-hidden />
                        : meta.id}
                      </span>
                      <span className={cn('text-[13px] font-bold', active ? 'text-[#22334A]' : 'text-muted-600')}>{meta.title}</span>
                    </li>
                  )
                })}
              </ul>
            </motion.div>
          </aside>
        </div>
      </div>

      <WorkshopSuccessCelebration open={submissionSuccess} onReset={resetWizard} />
    </main>
  )
}
