import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  CheckCircle2,
  RotateCcw,
  MessageCircle,
  Zap,
  BookOpen,
  Clock,
  ArrowLeft,
  Calendar,
  Layers,
} from 'lucide-react'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { trackFunnelEvent, type FunnelEventProps } from '@/lib/funnelEvents'
import {
  questions,
  recommend,
  type PlacementAnswers,
  type PlacementResult,
} from '@/data/placement'
import { toLatinDigits } from '@/utils/publicDetailFormat'
import { fetchPublicWorkshopsPage, type PublicWorkshop } from '@/api/workshopsApi.public'
import { fetchCoursesFromApi } from '@/api/coursesApi.public'
import type { Course } from '@/types'
import { resolveCourseIsEnded } from '@/utils/courseEnded'
import { formatPrice } from '@/utils/course'
import { PROFESSIONAL_TRACKS } from '@/data/officialTracks'

const trackPlacement = trackFunnelEvent as (name: string, props?: FunnelEventProps) => void

function sendResultByEmail(_email: string, _result: PlacementResult): void {
  // Seam for future notification endpoint
}

export interface MatchedPlacementProgram {
  id: string
  title: string
  kind: 'workshop' | 'course' | 'track'
  badge: string
  badgeCls: string
  duration: string
  level: string
  delivery: string
  priceText: string
  instructor?: string | null
  description: string
  href: string
  ctaText: string
  matchPercentage: number
}

/**
 * Intelligent recommendation engine: dynamically scores live workshops, courses and tracks
 * according to the 5 placement answers (goal, background, time, field, coding).
 */
function scorePlacementPrograms(
  answers: PlacementAnswers,
  workshops: PublicWorkshop[],
  courses: Course[],
): MatchedPlacementProgram[] {
  const { goal, background, time, field, coding } = answers
  const results: MatchedPlacementProgram[] = []

  // ── 1. Evaluate Live Workshops from API ──
  workshops.forEach((w) => {
    if (w.is_ended || w.status === 'cancelled') return

    let score = 55
    const title = (w.title || '').toLowerCase()
    const desc = (w.description || w.short_description || '').toLowerCase()
    const isFree = Boolean(w.is_free) || Number(w.price) === 0

    // Goal matching
    if (goal === 'explore') score += 35
    else if (goal === 'skill') score += 25
    else if (goal === 'shift') score += 15
    else if (goal === 'build') score += 20

    // Time matching
    if (time === 'under-2') score += 35
    else if (time === '2-5') score += 25
    else if (time === '6-10') score += 10
    else if (time === 'over-10') score += 5

    // Background matching
    if (background === 'none' || background === 'tools') score += 25
    else if (background === 'course') score += 15
    else if (background === 'professional') score += 10

    // Field matching
    if (field === 'daily-work') {
      if (title.includes('أدوات') || title.includes('إنتاجية') || title.includes('prompt') || title.includes('ذكاء') || desc.includes('أدوات')) score += 30
    } else if (field === 'data') {
      if (title.includes('بيانات') || title.includes('data') || title.includes('تحليل') || title.includes('excel') || title.includes('python') || desc.includes('بيانات')) score += 35
    } else if (field === 'engineering') {
      if (title.includes('هندسة') || title.includes('بايثون') || title.includes('نماذج') || title.includes('agent') || desc.includes('هندسة')) score += 35
    } else if (field === 'decision') {
      if (title.includes('إدارة') || title.includes('قيادة') || title.includes('أعمال') || title.includes('استراتيجية') || desc.includes('إدارة')) score += 30
    } else if (field === 'undecided') {
      if (title.includes('مدخل') || title.includes('مقدمة') || title.includes('أساسيات') || title.includes('ذكاء') || isFree) score += 25
    }

    // Coding level matching
    if (coding === 'none' && !title.includes('بايثون') && !title.includes('كود')) score += 15
    if ((coding === 'script' || coding === 'ship') && (title.includes('بايثون') || title.includes('python') || title.includes('بيانات'))) score += 20

    // Workshop status bonus
    if (w.registration_open) score += 15
    if (isFree) score += 10

    const durationText = w.duration_hours ? `${w.duration_hours} ساعات تدريبية` : 'ساعتان تفاعليتان'
    const priceText = isFree ? 'مجاناً بالكامل' : formatPrice(w.price)

    results.push({
      id: `workshop-${w.id}`,
      title: w.title,
      kind: 'workshop',
      badge: isFree ? 'ورشة عمل مجانية' : 'ورشة عمل تفاعلية',
      badgeCls: 'bg-amber-500/10 text-amber-700 border-amber-300',
      duration: durationText,
      level: background === 'none' ? 'مبتدئ / تأسيسي' : 'جميع المستويات',
      delivery: w.is_online ? 'عن بُعد (مباشر تفاعلي)' : 'حضوري في المركز',
      priceText,
      instructor: w.instructor_name || 'فريق خبراء EMC',
      description: w.short_description || w.description || 'ورشة تفاعلية مباشرة تركز على التطبيق العملي وبناء المهارة خطوة بخطوة مع شهادة حضور.',
      href: `/workshops/${w.slug}`,
      ctaText: isFree ? 'احجز مقعدك في الورشة مجاناً' : 'التسجيل في الورشة',
      matchPercentage: Math.min(Math.max(score, 78), 98),
    })
  })

  // ── 2. Evaluate Live Courses from API ──
  courses.forEach((c) => {
    if (resolveCourseIsEnded(c)) return

    let score = 50
    const title = (c.title || '').toLowerCase()
    const desc = (c.description || c.short_description || '').toLowerCase()
    const hours = Number(c.training_hours || 0)
    const isFree = c.type === 'free' || Boolean(c.is_free) || Number(c.price) === 0
    const rawKind = ((c.program_kind || c.program_type || (c as Record<string, unknown>).catalog_type || '') as string).toLowerCase()
    const isTrack = Boolean(c.learning_path) || Boolean(c.is_part_of_learning_path) || rawKind === 'path' || title.includes('مسار')

    // Goal matching
    if (goal === 'skill') score += 35
    else if (goal === 'shift') score += 25
    else if (goal === 'build') score += 30
    else if (goal === 'explore') score += 10

    // Time matching
    if (time === '2-5') score += 25
    else if (time === '6-10') score += 30
    else if (time === 'over-10') score += 25
    else if (time === 'under-2') score -= 15

    // Field matching
    if (field === 'daily-work' && (title.includes('أدوات') || title.includes('إنتاجية') || title.includes('ai') || desc.includes('أدوات'))) score += 30
    if (field === 'data' && (title.includes('بيانات') || title.includes('data') || title.includes('تحليل') || title.includes('excel') || title.includes('python'))) score += 35
    if (field === 'engineering' && (title.includes('هندسة') || title.includes('python') || title.includes('machine learning') || title.includes('agent'))) score += 35
    if (field === 'decision' && (title.includes('إدارة') || title.includes('قيادة') || title.includes('أعمال') || title.includes('استراتيجية'))) score += 30

    // Level matching
    if (coding === 'none' && !title.includes('python') && !title.includes('برمجة')) score += 15
    if ((coding === 'script' || coding === 'ship') && (title.includes('python') || title.includes('هندسة'))) score += 20

    const durationText = hours > 0 ? `${hours} ساعة تدريبية` : (c.duration || '4 - 6 أسابيع')
    const priceFormatted = isFree ? 'مجاناً' : formatPrice(c.price)

    results.push({
      id: `course-${c.id}`,
      title: c.title,
      kind: isTrack ? 'track' : 'course',
      badge: isTrack ? 'مسار تأهيل متكامل' : 'دورة تدريبية معتمدة',
      badgeCls: isTrack ? 'bg-indigo-500/10 text-indigo-700 border-indigo-300' : 'bg-customBlue/10 text-customBlue border-customBlue/30',
      duration: durationText,
      level: c.level || 'متوسط',
      delivery: c.is_online ? 'عن بُعد (مباشر ومسجل)' : 'حضوري',
      priceText: priceFormatted,
      instructor: c.instructor?.name || c.instructor_name || 'مدربو EMC المعتمدون',
      description: c.short_description || c.description || 'برنامج تدريبي تخصصي متدرج ينتهي بمشروع تطبيقي وشهادة معتمدة رسمياً.',
      href: `/courses/${c.slug}`,
      ctaText: 'تفاصيل البرنامج والتسجيل',
      matchPercentage: Math.min(Math.max(score, 75), 97),
    })
  })

  // ── 3. Evaluate Professional Tracks ──
  PROFESSIONAL_TRACKS.forEach((track) => {
    let score = 50
    const title = track.title.toLowerCase()
    const focus = track.focus.toLowerCase()

    if (goal === 'shift' || goal === 'build') score += 40
    if (time === 'over-10' || time === '6-10') score += 30
    if (time === 'under-2') score -= 30

    if (field === 'data' && (title.includes('بيانات') || focus.includes('بيانات'))) score += 35
    if (field === 'engineering' && (title.includes('مهندس') || focus.includes('python') || focus.includes('machine learning'))) score += 35
    if (field === 'daily-work' && title.includes('توليدي')) score += 25

    if (background === 'professional' || background === 'course') score += 20

    results.push({
      id: `track-${track.id}`,
      title: track.title,
      kind: 'track',
      badge: 'مسار احترافي معتمد (6-8 أشهر)',
      badgeCls: 'bg-indigo-500/10 text-indigo-700 border-indigo-300',
      duration: track.duration,
      level: 'متوسط إلى متقدم',
      delivery: 'عن بُعد + إشراف ومشاريع تطبيقية',
      priceText: track.price ? `${track.price} €` : 'منحة وتأهيل',
      instructor: 'نخبة من خبراء ومستشاري المركز',
      description: track.focus,
      href: track.landingSlug ? `/tracks/${track.landingSlug}` : '/learning-paths',
      ctaText: 'استكشف تفاصيل المسار والشهادة',
      matchPercentage: Math.min(Math.max(score, 72), 99),
    })
  })

  // Sort descending by match percentage
  return results.sort((a, b) => b.matchPercentage - a.matchPercentage)
}

export default function PlacementTest() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<PlacementAnswers>({})
  const [result, setResult] = useState<PlacementResult | null>(null)
  const [email, setEmail] = useState('')

  // Live data from backend
  const [workshops, setWorkshops] = useState<PublicWorkshop[]>([])
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    // Fetch live workshops
    fetchPublicWorkshopsPage({ per_page: 30 })
      .then((res) => {
        if (res && res.workshops) setWorkshops(res.workshops)
      })
      .catch(() => setWorkshops([]))

    // Fetch live courses
    fetchCoursesFromApi()
      .then((res) => {
        if (Array.isArray(res)) setCourses(res)
      })
      .catch(() => setCourses([]))
  }, [])

  const question = questions[step]
  const total = questions.length
  const isLastQuestion = step === total - 1
  const currentAnswer = answers[question.id]

  function handleSelect(value: string) {
    if (Object.keys(answers).length === 0) trackPlacement('placement_test_start')
    setAnswers({ ...answers, [question.id]: value })
  }

  function handleNext() {
    if (!currentAnswer) return
    if (!isLastQuestion) {
      setStep(step + 1)
      return
    }
    const outcome = recommend(answers)
    setResult(outcome)
    trackPlacement('placement_test_complete', {
      recommended_level: outcome.level,
      recommended_product: outcome.cta.href,
    })
  }

  function handleBack() {
    if (step > 0) setStep(step - 1)
  }

  function handleRestart() {
    setAnswers({})
    setResult(null)
    setStep(0)
    setEmail('')
  }

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!result) return
    sendResultByEmail(email, result)
  }

  // Scored matching recommendations based on answered questions
  const matchedPrograms = useMemo(() => {
    if (!result) return []
    return scorePlacementPrograms(answers, workshops, courses)
  }, [result, answers, workshops, courses])

  const topMatch = matchedPrograms[0]
  const alternatives = matchedPrograms.slice(1, 4)

  return (
    <section id="placement" className="mt-16 scroll-mt-28 text-right">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-customBlue/20 bg-customBlue/5 px-3.5 py-1 text-xs font-black text-customBlue mb-2">
            <Sparkles size={13} className="text-customOrange" />
            <span>تحديد نقطة الانطلاق والتوجيه المهني</span>
          </div>
          <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">حدّد نقطة انطلاقك</h2>
        </div>

        {result && (
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-customBlue transition"
          >
            <RotateCcw size={13} />
            <span>إعادة تحديد الأهداف</span>
          </button>
        )}
      </div>

      <p className="max-w-2xl text-sm font-semibold leading-8 text-ink-500">
        خمسة أسئلة تفاعلية يحللها النظام مباشرة لترشيح الورشة والبرنامج الأنسب لاحتياجك الفعلي من قاعدة بيانات المركز فوراً.
      </p>

      <div aria-hidden className="emc-hairline mt-8" />

      {result === null ? (
        <div className="mt-8 max-w-2xl">
          {/* Progress Latin numerals */}
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-xs font-black text-ocean">
              السؤال {toLatinDigits(step + 1)} من {toLatinDigits(total)}
            </p>
            <p className="text-xs font-bold text-ink-400">{question.name}</p>
          </div>
          <div aria-hidden className="mt-3 h-0.5 w-full bg-line">
            <div
              className="h-0.5 bg-customOrange transition-all duration-250 ease-emc"
              style={{ width: `${((step + 1) / total) * 100}%` }}
            />
          </div>

          <fieldset className="mt-7">
            <legend className="font-display text-lg font-black leading-snug text-navy">
              {question.title}
            </legend>

            <div className="mt-5 grid gap-3">
              {question.options.map((option) => {
                const id = `placement-${question.id}-${option.value}`
                const checked = currentAnswer === option.value

                return (
                  <label
                    key={option.value}
                    htmlFor={id}
                    className={[
                      'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-bold transition duration-250 ease-emc',
                      checked
                        ? 'border-customBlue bg-brand-50 text-navy ring-1 ring-customBlue'
                        : 'border-line bg-white text-ink-500 hover:border-ice hover:bg-paper',
                    ].join(' ')}
                  >
                    <input
                      id={id}
                      type="radio"
                      name={`placement-${question.id}`}
                      value={option.value}
                      checked={checked}
                      onChange={() => handleSelect(option.value)}
                      className="emc-focus-ring h-4 w-4 shrink-0 accent-customBlue"
                    />
                    <span>{option.label}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleNext}
              disabled={!currentAnswer}
              className="emc-focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-customOrange px-8 text-sm font-black text-white transition duration-250 ease-emc hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto shadow-md shadow-customOrange/20"
            >
              {isLastQuestion ? 'اعرض الورشات والبرامج المقترحة' : 'التالي'}
              <ArrowLeftIcon size={16} />
            </button>
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="emc-focus-ring inline-flex h-12 w-full items-center justify-center rounded-xl border border-line px-8 text-sm font-black text-ink-500 transition duration-250 ease-emc hover:border-ice hover:text-navy sm:w-auto"
              >
                السابق
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Dynamic Matching Results UI (Same as Smart Path Finder) */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-8 max-w-3xl"
          role="status"
          aria-live="polite"
        >
          {/* Institutional Station Level Banner */}
          <div className="mb-6 rounded-2xl border border-customBlue/20 bg-customBlue/5 p-5 text-right">
            <div className="flex items-center gap-2">
              <span className="font-latin text-xs font-black tracking-widest text-customBlue uppercase px-2.5 py-0.5 rounded-full bg-white border border-customBlue/20">
                {toLatinDigits(result.level)}
              </span>
              <h3 className="font-display text-lg font-black text-deepBlue">
                المحطة الموصى بها رسمياً: {result.title}
              </h3>
            </div>
            <p className="mt-2 text-xs sm:text-sm font-semibold leading-relaxed text-ink-500">
              {result.reason}
            </p>
          </div>

          {/* Primary Top Matched Workshop / Program Card */}
          {topMatch ? (
            <div className="rounded-3xl border-2 border-customOrange/40 bg-gradient-to-br from-white via-amber-50/20 to-sky-50/20 p-6 sm:p-8 shadow-lg shadow-customOrange/5 relative overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-20 -left-20 h-48 w-48 rounded-full bg-customOrange/10 blur-3xl"
              />

              {/* Status Header */}
              <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1 text-xs font-black text-white shadow-sm">
                  <CheckCircle2 size={13} />
                  <span>تطابق بنسبة {topMatch.matchPercentage}% مع إجاباتك</span>
                </span>

                <span className={`rounded-lg border px-3 py-1 text-xs font-black ${topMatch.badgeCls}`}>
                  {topMatch.badge}
                </span>
              </div>

              {/* Pills Bar */}
              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-bold text-slate-700">
                <span className="inline-flex items-center gap-1 rounded-lg bg-deepBlue/5 px-2.5 py-1 text-deepBlue">
                  <Clock size={12} className="text-customBlue" />
                  <span>{topMatch.duration}</span>
                </span>

                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
                  🎯 {topMatch.level}
                </span>

                <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-sky-800">
                  🌐 {topMatch.delivery}
                </span>

                <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-amber-800 border border-amber-200">
                  💰 {topMatch.priceText}
                </span>

                {topMatch.instructor && (
                  <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-purple-800">
                    👤 {topMatch.instructor}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="font-display text-xl sm:text-2xl font-black text-deepBlue leading-snug mb-3">
                {topMatch.title}
              </h3>

              <p className="text-sm font-medium leading-relaxed text-slate-600 mb-6">
                {topMatch.description}
              </p>

              {/* Direct Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-slate-200/70">
                <Link
                  to={topMatch.href}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-customOrange/25 hover:bg-customOrange/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Zap size={16} />
                  <span>{topMatch.ctaText}</span>
                  <ArrowLeft size={16} />
                </Link>

                <a
                  href={`https://wa.me/3197010204555?text=${encodeURIComponent(
                    `مرحباً مركز EMC، بعد إجراء تقييم تحديد نقطة الانطلاق، تم ترشيح برنامج "${topMatch.title}" بنسبة توافق ${topMatch.matchPercentage}%. أود الاستفسار عن المواعيد والتسجيل.`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  <MessageCircle size={16} className="text-emerald-600" />
                  <span>استشر المشرف عبر واتساب</span>
                </a>
              </div>
            </div>
          ) : (
            /* Fallback generic CTA */
            <div className="rounded-2xl border border-line bg-white p-6 text-right">
              <Link
                to={result.cta.href}
                className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-7 py-3 text-sm font-black text-white hover:bg-customOrange/90"
              >
                <span>{result.cta.label}</span>
                <ArrowLeftIcon size={16} />
              </Link>
            </div>
          )}

          {/* Alternative Matched Programs */}
          {alternatives.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200/80">
              <h4 className="text-sm font-black text-deepBlue mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-customBlue" />
                <span>خيارات وورشات أخرى مقترحة تناسب إجاباتك:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {alternatives.map((alt) => (
                  <div
                    key={alt.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:shadow-md hover:border-customBlue/40 text-right"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${alt.badgeCls}`}>
                          {alt.badge}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          توافق {alt.matchPercentage}%
                        </span>
                      </div>

                      <h5 className="text-xs sm:text-sm font-black text-deepBlue line-clamp-2 mb-1.5 leading-snug">
                        {alt.title}
                      </h5>

                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">
                        {alt.description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                      <span className="font-bold text-slate-500 text-[11px]">
                        ⏱ {alt.duration}
                      </span>
                      <Link
                        to={alt.href}
                        className="font-black text-customBlue hover:text-customOrange inline-flex items-center gap-1 text-[11px] transition"
                      >
                        <span>التفاصيل</span>
                        <ArrowLeft size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-line">
            <button
              type="button"
              onClick={handleRestart}
              className="emc-cta-line emc-focus-ring text-xs sm:text-sm font-bold text-ink-500"
            >
              أعد تحديد نقطة انطلاقك وإجابة الأسئلة
              <ArrowLeftIcon size={14} />
            </button>

            <Link
              to="/workshops"
              className="text-xs font-bold text-customBlue hover:text-customOrange transition inline-flex items-center gap-1"
            >
              <span>تصفّح جدول كافة الورش القادمة</span>
              <ArrowLeft size={13} />
            </Link>
          </div>

          <div aria-hidden className="emc-hairline mt-8" />

          {/* Optional: Send result by email */}
          <form onSubmit={handleEmailSubmit} className="mt-8">
            <label htmlFor="placement-email" className="block text-sm font-black text-navy">
              أرسل النتيجة والترشيحات إلى بريدي
            </label>
            <p className="mt-1 text-xs font-bold text-ink-400">
              اختياري. نتيجتك ظاهرة أمامك كاملة، والبريد يحفظ لك الترشيحات وروابط التسجيل.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                id="placement-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                className="emc-focus-ring h-12 w-full rounded-xl border border-line bg-white px-4 text-sm font-bold text-navy outline-none transition duration-250 ease-emc placeholder:font-semibold placeholder:text-ink-300 focus:border-customBlue sm:max-w-sm"
              />
              <button
                type="submit"
                disabled={email.trim() === ''}
                className="emc-focus-ring inline-flex h-12 shrink-0 items-center justify-center rounded-xl border border-navy px-6 text-sm font-black text-navy transition duration-250 ease-emc hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                أرسل
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </section>
  )
}
