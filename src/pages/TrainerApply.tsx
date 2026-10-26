import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  User,
  GraduationCap,
  Sparkles,
  DollarSign,
  Check,
  Send,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PublicSeo from '@/components/public/PublicSeo'
import { submitTrainerApplication, type TrainerApplicationPayload } from '@/api/trainerApi'
import { getLaravelFieldErrors } from '@/api/apiErrors'
import toast from '@/lib/toast'

const AI_TRAINING_FIELDS = [
  'أساسيات الذكاء الاصطناعي',
  'هندسة الأوامر (Prompt Engineering)',
  'أدوات الذكاء الاصطناعي التوليدي',
  'وكلاء الذكاء الاصطناعي (AI Agents)',
  'أتمتة الأعمال باستخدام الذكاء الاصطناعي',
  'الذكاء الاصطناعي في التعليم',
  'الذكاء الاصطناعي في التسويق وصناعة المحتوى',
  'البرمجة باستخدام الذكاء الاصطناعي (Vibe Coding)',
  'تعلم الآلة والتعلم العميق',
  'تحليل البيانات باستخدام الذكاء الاصطناعي',
  'تطبيقات الذكاء الاصطناعي في الأعمال',
  'أخرى',
]

const PROGRAM_TYPES = [
  'دورات تدريبية',
  'محاضرات وجلسات تعريفية',
  'برامج تدريبية متكاملة',
]

const TARGET_AUDIENCES = [
  'المبتدئون',
  'الطلاب والخريجون',
  'الموظفون والمهنيون',
  'المتخصصون',
  'جميع الفئات حسب مستوى البرنامج',
]

const DELIVERY_MODES = ['حضوريًا', 'عن بُعد', 'كلاهما']

const CURRENCIES = [
  { value: 'USD', label: 'الدولار الأمريكي (USD)' },
  { value: 'SAR', label: 'الريال السعودي (SAR)' },
  { value: 'YER', label: 'الريال اليمني (YER)' },
  { value: 'EUR', label: 'اليورو (EUR)' },
  { value: 'OTHER', label: 'عملة أخرى' },
]

const defaultForm: TrainerApplicationPayload = {
  full_name: '',
  phone_or_whatsapp: '',
  email: '',
  linkedin_url: '',
  primary_specialty: '',
  years_of_experience: '',
  has_training_experience: true,
  ai_training_fields: [],
  other_ai_field: '',
  training_program_types: [],
  target_audiences: [],
  delivery_mode: 'عن بُعد',
  hourly_rate: null,
  currency: 'USD',
  currency_other: '',
  additional_notes: '',
}

export default function TrainerApply() {
  const [currentStep, setCurrentStep] = useState(1)
  const [form, setForm] = useState<TrainerApplicationPayload>(defaultForm)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [submitting, setSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [applicationUuid, setApplicationUuid] = useState('')

  const topRef = useRef<HTMLDivElement>(null)

  const steps = [
    { num: 1, title: 'البيانات الشخصية', icon: User },
    { num: 2, title: 'التخصص والخبرة', icon: GraduationCap },
    { num: 3, title: 'مجالات التدريب', icon: Sparkles },
    { num: 4, title: 'آلية التعاون والتسعير', icon: DollarSign },
  ]

  const setField = (key: keyof TrainerApplicationPayload, val: unknown) => {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  const toggleArrayItem = (key: 'ai_training_fields' | 'training_program_types' | 'target_audiences', item: string) => {
    setForm(prev => {
      const arr = prev[key] || []
      const exists = arr.includes(item)
      const updated = exists ? arr.filter(x => x !== item) : [...arr, item]
      return { ...prev, [key]: updated }
    })
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  const validateStep = (stepNum: number): boolean => {
    const errs: Record<string, string | undefined> = {}

    if (stepNum === 1) {
      if (!form.full_name.trim()) errs.full_name = 'الاسم الكامل مطلوب'
      if (!form.phone_or_whatsapp.trim()) errs.phone_or_whatsapp = 'رقم الهاتف أو الواتساب مطلوب'
      if (!form.email.trim()) {
        errs.email = 'البريد الإلكتروني مطلوب'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errs.email = 'صيغة البريد الإلكتروني غير صحيحة'
      }
    } else if (stepNum === 2) {
      if (!form.primary_specialty.trim()) errs.primary_specialty = 'التخصص الرئيسي مطلوب'
      if (!form.years_of_experience.trim()) errs.years_of_experience = 'عدد سنوات الخبرة مطلوب'
    } else if (stepNum === 3) {
      if (form.ai_training_fields.length === 0) errs.ai_training_fields = 'يرجى اختيار مجال واحد على الأقل'
      if (form.ai_training_fields.includes('أخرى') && !form.other_ai_field?.trim()) {
        errs.other_ai_field = 'يرجى تحديد المجال التدريبي الآخر'
      }
      if (form.training_program_types.length === 0) errs.training_program_types = 'يرجى اختيار نوع برنامج تدريبي واحد على الأقل'
      if (form.target_audiences.length === 0) errs.target_audiences = 'يرجى اختيار فئة مستهدفة واحدة على الأقل'
    } else if (stepNum === 4) {
      if (!form.delivery_mode) errs.delivery_mode = 'يرجى تحديد نمط تقديم التدريب'
      if (form.currency === 'OTHER' && !form.currency_other?.trim()) {
        errs.currency_other = 'يرجى كتابة العملة المطلوبة'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateAllSteps = (): boolean => {
    for (let s = 1; s <= steps.length; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s)
        topRef.current?.scrollIntoView({ behavior: 'smooth' })
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length))
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    // Strictly prevent submission if not on the final step (Step 4)
    if (currentStep < steps.length) {
      handleNext()
      return
    }

    if (!validateStep(currentStep)) return
    if (!validateAllSteps()) return

    setSubmitting(true)
    try {
      const res = await submitTrainerApplication(form)
      setApplicationUuid(res.uuid)
      setIsSuccess(true)
      toast.success('تم إرسال طلب انضمامك كمدرب بنجاح!')
    } catch (err) {
      const fieldErrors = getLaravelFieldErrors(err)
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        toast.error('يرجى التأكد من صحة الحقول المدخلة.')
      } else {
        toast.error('حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] pt-24 pb-16" ref={topRef}>
      <PublicSeo
        title="انضم إلينا كمدرب | استمارة المدربين مركز EMC"
        description="استمارة الانضمام لنخبة مدربي الذكاء الاصطناعي والتكنولوجيا في مركز EMC."
        path="/join-trainer"
      />

      <PageHeader
        title="استمارة المدربين — مركز EMC"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'انضم إلينا', href: '/join-trainer' },
          { label: 'استمارة المدربين' },
        ]}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-6">
        {/* Intro Banner */}
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-deepBlue via-[#0a3060] to-[#0f4080] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 -left-10 h-48 w-48 rounded-full bg-customBlue/20 blur-3xl" />
          <div className="relative z-10 text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-sky-200 backdrop-blur-sm mb-3">
              <Sparkles size={14} className="text-amber-300" />
              شبكة مدربي الذكاء الاصطناعي
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mb-3">
              انضم إلينا كمدرب في مركز EMC
            </h1>
            <p className="text-sm leading-relaxed text-slate-200 max-w-2xl">
              يسعى مركز EMC لبناء مجتمع متميز من المدربين المتمكنين في تطبيقات وأدوات الذكاء الاصطناعي التوليدي والتقنيات الحديثة، لتقديم ورش ودورات نوعية تواكب متطلبات المستقبل.
            </p>
          </div>
        </div>

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-white p-8 sm:p-12 text-center shadow-lg border border-slate-100"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50">
              <CheckCircle2 size={42} />
            </div>
            <h2 className="text-2xl font-black text-deepBlue mb-3">تم استلام طلبك بنجاح!</h2>
            <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed mb-6">
              شكرًا لاهتمامك بالانضمام إلى فريق مدربي مركز EMC. سيقوم فريق التدريب بمراجعة بياناتك والتواصل معك عبر الواتساب أو البريد الإلكتروني لمناقشة مجالات التعاون المشترك.
            </p>
            {applicationUuid && (
              <div className="inline-block rounded-xl bg-slate-50 px-4 py-2 border border-slate-200 text-xs font-mono text-slate-500 mb-8">
                رقم الطلب: <span className="font-bold text-deepBlue">{applicationUuid.slice(0, 8)}...</span>
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/"
                className="rounded-xl bg-customBlue px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-customBlue/90 transition"
              >
                العودة للرئيسية
              </Link>
              <button
                type="button"
                onClick={() => {
                  setForm(defaultForm)
                  setCurrentStep(1)
                  setIsSuccess(false)
                }}
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                إرسال استمارة أخرى
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="rounded-3xl bg-white shadow-md border border-slate-100 overflow-hidden">
            {/* Step Indicators */}
            <div className="border-b border-slate-100 bg-slate-50/60 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                {steps.map(s => {
                  const isActive = s.num === currentStep
                  const isDone = s.num < currentStep
                  const Icon = s.icon
                  return (
                    <div key={s.num} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl transition-all duration-200 ${
                            isActive
                              ? 'bg-customBlue text-white shadow-md ring-4 ring-sky-100'
                              : isDone
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-slate-400 border border-slate-200'
                          }`}
                        >
                          {isDone ? <Check size={18} /> : <Icon size={20} />}
                        </div>
                        <span
                          className={`mt-2 text-[11px] sm:text-xs font-bold text-center ${
                            isActive ? 'text-customBlue' : isDone ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {s.title}
                        </span>
                      </div>
                      {s.num < steps.length && (
                        <div
                          className={`h-0.5 flex-1 transition-colors ${
                            s.num < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Form Content */}
            <form
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                  e.preventDefault()
                  if (currentStep < steps.length) {
                    handleNext()
                  }
                }
              }}
              className="p-6 sm:p-8"
            >
              <AnimatePresence mode="wait">
                {/* ── أولاً: البيانات الشخصية ── */}
                {currentStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 text-right"
                  >
                    <div>
                      <h3 className="text-lg font-black text-deepBlue">أولًا: البيانات الشخصية</h3>
                      <p className="text-xs text-slate-500 mt-1">يرجى إدخال معلوماتك الأساسية لسهولة التواصل معك</p>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        1. الاسم الكامل <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={e => setField('full_name', e.target.value)}
                        placeholder="الاسم الثلاثي أو الرباعي"
                        className={`w-full h-12 rounded-xl border bg-slate-50 px-4 text-sm font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${
                          errors.full_name ? 'border-red-400' : 'border-slate-200 focus:border-customBlue'
                        }`}
                      />
                      {errors.full_name && <p className="text-xs text-red-500 mt-1 font-bold">{errors.full_name}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        2. رقم الهاتف أو الواتساب <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={form.phone_or_whatsapp}
                        onChange={e => setField('phone_or_whatsapp', e.target.value)}
                        placeholder="+966 50 000 0000"
                        className={`w-full h-12 rounded-xl border bg-slate-50 px-4 text-sm font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${
                          errors.phone_or_whatsapp ? 'border-red-400' : 'border-slate-200 focus:border-customBlue'
                        }`}
                      />
                      {errors.phone_or_whatsapp && <p className="text-xs text-red-500 mt-1 font-bold">{errors.phone_or_whatsapp}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        3. البريد الإلكتروني <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        dir="ltr"
                        value={form.email}
                        onChange={e => setField('email', e.target.value)}
                        placeholder="name@example.com"
                        className={`w-full h-12 rounded-xl border bg-slate-50 px-4 text-sm font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${
                          errors.email ? 'border-red-400' : 'border-slate-200 focus:border-customBlue'
                        }`}
                      />
                      {errors.email && <p className="text-xs text-red-500 mt-1 font-bold">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        4. رابط حسابك المهني (لينكدان) <span className="text-slate-400 font-normal">(اختياري)</span>
                      </label>
                      <input
                        type="url"
                        dir="ltr"
                        value={form.linkedin_url || ''}
                        onChange={e => setField('linkedin_url', e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 focus:border-customBlue"
                      />
                    </div>
                  </motion.div>
                )}

                {/* ── ثانياً: التخصص والخبرة ── */}
                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 text-right"
                  >
                    <div>
                      <h3 className="text-lg font-black text-deepBlue">ثانيًا: التخصص والخبرة</h3>
                      <p className="text-xs text-slate-500 mt-1">تفاصيل مسارك المهني وخبرتك السابقة في التدريب</p>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        5. ما تخصصك الرئيسي؟ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.primary_specialty}
                        onChange={e => setField('primary_specialty', e.target.value)}
                        placeholder="مثال: مهندس ذكاء اصطناعي، علم البيانات، تسويق رقمي، أتمتة..."
                        className={`w-full h-12 rounded-xl border bg-slate-50 px-4 text-sm font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${
                          errors.primary_specialty ? 'border-red-400' : 'border-slate-200 focus:border-customBlue'
                        }`}
                      />
                      {errors.primary_specialty && <p className="text-xs text-red-500 mt-1 font-bold">{errors.primary_specialty}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        6. كم عدد سنوات خبرتك؟ <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {['أقل من سنتين', '2 إلى 4 سنوات', '5 إلى 8 سنوات', 'أكثر من 8 سنوات'].map(exp => (
                          <button
                            key={exp}
                            type="button"
                            onClick={() => setField('years_of_experience', exp)}
                            className={`py-3 px-3 rounded-xl border text-xs font-bold transition text-center ${
                              form.years_of_experience === exp
                                ? 'border-customBlue bg-customBlue/5 text-customBlue ring-2 ring-customBlue/20'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                            }`}
                          >
                            {exp}
                          </button>
                        ))}
                      </div>
                      {errors.years_of_experience && <p className="text-xs text-red-500 mt-1 font-bold">{errors.years_of_experience}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        7. هل سبق لك تقديم دورات تدريبية أو ورش عمل؟ <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3 max-w-sm">
                        <button
                          type="button"
                          onClick={() => setField('has_training_experience', true)}
                          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-bold transition ${
                            form.has_training_experience === true
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                          }`}
                        >
                          <Check size={16} />
                          نعم، سبق لي التدريب
                        </button>
                        <button
                          type="button"
                          onClick={() => setField('has_training_experience', false)}
                          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-bold transition ${
                            form.has_training_experience === false
                              ? 'border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-200'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                          }`}
                        >
                          لا، أرغب بالبدء معكم
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── ثالثاً: مجالات التدريب ── */}
                {currentStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 text-right"
                  >
                    <div>
                      <h3 className="text-lg font-black text-deepBlue">ثالثًا: مجالات التدريب</h3>
                      <p className="text-xs text-slate-500 mt-1">حدد مجالات الذكاء الاصطناعي وأنواع البرامج والفئات المستهدفة</p>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        8. ما مجالات الذكاء الاصطناعي التي تستطيع التدريب فيها؟ <span className="text-red-500">*</span>
                        <span className="text-slate-400 font-normal mr-2">(يمكن اختيار أكثر من مجال)</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {AI_TRAINING_FIELDS.map(f => {
                          const isChecked = form.ai_training_fields.includes(f)
                          return (
                            <button
                              key={f}
                              type="button"
                              onClick={() => toggleArrayItem('ai_training_fields', f)}
                              className={`flex items-center justify-between p-3 rounded-xl border text-right text-xs font-bold transition ${
                                isChecked
                                  ? 'border-customBlue bg-customBlue/5 text-customBlue ring-1 ring-customBlue'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                              }`}
                            >
                              <span>{f}</span>
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  isChecked ? 'border-customBlue bg-customBlue text-white' : 'border-slate-300'
                                }`}
                              >
                                {isChecked && <Check size={12} />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      {form.ai_training_fields.includes('أخرى') && (
                        <div className="mt-3">
                          <input
                            type="text"
                            value={form.other_ai_field || ''}
                            onChange={e => setField('other_ai_field', e.target.value)}
                            placeholder="يرجى تحديد المجال التدريبي الآخر..."
                            className={`w-full h-11 rounded-xl border bg-slate-50 px-4 text-xs font-semibold text-deepBlue outline-none transition focus:bg-white focus:border-customBlue ${
                              errors.other_ai_field ? 'border-red-400' : 'border-slate-200'
                            }`}
                          />
                          {errors.other_ai_field && <p className="text-xs text-red-500 mt-1 font-bold">{errors.other_ai_field}</p>}
                        </div>
                      )}
                      {errors.ai_training_fields && <p className="text-xs text-red-500 mt-1.5 font-bold">{errors.ai_training_fields}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        9. ما نوع البرامج التدريبية التي تستطيع تقديمها؟ <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {PROGRAM_TYPES.map(pt => {
                          const isChecked = form.training_program_types.includes(pt)
                          return (
                            <button
                              key={pt}
                              type="button"
                              onClick={() => toggleArrayItem('training_program_types', pt)}
                              className={`flex items-center justify-between p-3 rounded-xl border text-right text-xs font-bold transition ${
                                isChecked
                                  ? 'border-customBlue bg-customBlue/5 text-customBlue ring-1 ring-customBlue'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                              }`}
                            >
                              <span>{pt}</span>
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  isChecked ? 'border-customBlue bg-customBlue text-white' : 'border-slate-300'
                                }`}
                              >
                                {isChecked && <Check size={12} />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      {errors.training_program_types && <p className="text-xs text-red-500 mt-1.5 font-bold">{errors.training_program_types}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        10. ما الفئة التي تستطيع تدريبها؟ <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {TARGET_AUDIENCES.map(aud => {
                          const isChecked = form.target_audiences.includes(aud)
                          return (
                            <button
                              key={aud}
                              type="button"
                              onClick={() => toggleArrayItem('target_audiences', aud)}
                              className={`flex items-center justify-between p-3 rounded-xl border text-right text-xs font-bold transition ${
                                isChecked
                                  ? 'border-customBlue bg-customBlue/5 text-customBlue ring-1 ring-customBlue'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                              }`}
                            >
                              <span>{aud}</span>
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  isChecked ? 'border-customBlue bg-customBlue text-white' : 'border-slate-300'
                                }`}
                              >
                                {isChecked && <Check size={12} />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      {errors.target_audiences && <p className="text-xs text-red-500 mt-1.5 font-bold">{errors.target_audiences}</p>}
                    </div>
                  </motion.div>
                )}

                {/* ── رابعاً: آلية التعاون والتسعير ── */}
                {currentStep === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 text-right"
                  >
                    <div>
                      <h3 className="text-lg font-black text-deepBlue">رابعًا: آلية التعاون والتسعير</h3>
                      <p className="text-xs text-slate-500 mt-1">تفضيلات تقديم التدريب والمقابل المالي المتوقع</p>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        11. كيف تفضل تقديم التدريب؟ <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {DELIVERY_MODES.map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setField('delivery_mode', mode)}
                            className={`py-3 px-3 rounded-xl border text-xs font-bold transition text-center ${
                              form.delivery_mode === mode
                                ? 'border-customBlue bg-customBlue/5 text-customBlue ring-2 ring-customBlue/20'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="text-customBlue" size={18} />
                        <label className="text-xs font-black text-deepBlue">
                          12. ما المقابل المالي الذي تطلبه مقابل تقديم ساعة تدريبية؟
                          <span className="text-slate-500 font-normal mr-2">(إن وجد - اختياري)</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[11px] font-bold text-slate-500 mb-1">المبلغ المطلوب للساعة:</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={form.hourly_rate ?? ''}
                            onChange={e => setField('hourly_rate', e.target.value ? Number(e.target.value) : null)}
                            placeholder="مثال: 50"
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
                          />
                        </div>

                        <div>
                          <span className="block text-[11px] font-bold text-slate-500 mb-1">العملة:</span>
                          <select
                            value={form.currency}
                            onChange={e => setField('currency', e.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-deepBlue outline-none focus:border-customBlue"
                          >
                            {CURRENCIES.map(c => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {form.currency === 'OTHER' && (
                        <div className="mt-3">
                          <input
                            type="text"
                            value={form.currency_other || ''}
                            onChange={e => setField('currency_other', e.target.value)}
                            placeholder="حدد العملة الأخرى..."
                            className={`w-full h-10 rounded-xl border bg-white px-4 text-xs font-semibold text-deepBlue outline-none ${
                              errors.currency_other ? 'border-red-400' : 'border-slate-200 focus:border-customBlue'
                            }`}
                          />
                          {errors.currency_other && <p className="text-xs text-red-500 mt-1 font-bold">{errors.currency_other}</p>}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        13. هل لديك أي ملاحظات أو معلومات إضافية؟ <span className="text-slate-400 font-normal">(اختياري)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={form.additional_notes || ''}
                        onChange={e => setField('additional_notes', e.target.value)}
                        placeholder="أي مقترحات أو تفاصيل أخرى ترغب في مشاركتها مع إدارة المركز..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-deepBlue outline-none transition focus:bg-white focus:border-customBlue"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form Navigation Buttons */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                {currentStep > 1 ? (
                  <button
                    key="step-btn-prev"
                    type="button"
                    onClick={handlePrev}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <ArrowRight size={16} />
                    السابق
                  </button>
                ) : <div />}

                {currentStep < steps.length ? (
                  <button
                    key="step-btn-next"
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-customBlue/90 transition"
                  >
                    التالي
                    <ArrowLeft size={16} />
                  </button>
                ) : (
                  <button
                    key="step-btn-submit"
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {submitting ? (
                      <span>جاري إرسال الطلب...</span>
                    ) : (
                      <>
                        <Send size={16} />
                        إرسال استمارة المدرب
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
