import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router'
import {
  Compass,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  MessageCircle,
  Zap,
  Sparkles,
  BookOpen,
} from 'lucide-react'
import type { Course } from '../../types'
import { fetchCoursesFromApi } from '../../api/coursesApi.public'
import { resolveCourseIsEnded } from '@/utils/courseEnded'
import { formatPrice } from '@/utils/course'
import { PROFESSIONAL_TRACKS } from '@/data/officialTracks'

interface QuestionOption {
  label: string
  sub?: string
  value: string
}

interface Question {
  id: string
  title: string
  subtitle: string
  options: QuestionOption[]
}

const QUESTIONS: Question[] = [
  {
    id: 'goal',
    title: 'ما هو هدفك التعليمي أو المهني الأساسي؟',
    subtitle: 'اختر الهدف الأكثر أولوية بالنسبة لك في هذه المرحلة',
    options: [
      { label: 'دخول مجال الذكاء الاصطناعي والتكنولوجيا', sub: 'مهارات المستقبل وأدوات الذكاء التوليدي والبيانات', value: 'ai' },
      { label: 'تطوير مساري الوظيفي والحصول على ترقية', sub: 'مهارات عملية نوعية ترفع قيمتك المهنية فوراً', value: 'career' },
      { label: 'حضور ورشة مجانية سريعة وبناء فكرة', sub: 'تجربة سريعة بدون أي التزام مالي أو زمني طويل', value: 'quick_workshop' },
      { label: 'تأهيل أكاديمي ومهني شامل وشهادة دولية', sub: 'مسار متكامل 6 أشهر مع مشروع تخرج معتمد', value: 'full_track' },
    ],
  },
  {
    id: 'time',
    title: 'كم ساعة تستطيع تخصيصها أسبوعياً للتعلم؟',
    subtitle: 'لنساعدك في اختيار برنامج يلائم جدولك اليومي',
    options: [
      { label: 'ساعتان إلى 4 ساعات أسبوعياً', sub: 'ورش عمل مسائية ومحاضرات مكثفة وسريعة', value: 'light' },
      { label: '5 إلى 10 ساعات أسبوعياً', sub: 'دورات تخصصية مع تطبيقات أسبوعية متدرجة', value: 'medium' },
      { label: 'أكثر من 10 ساعات (تفرغ كامل)', sub: 'معسكرات تدريبية ومسارات تأهيلية مكثفة', value: 'intensive' },
    ],
  },
  {
    id: 'level',
    title: 'ما هو مستواك الحالي في المجال؟',
    subtitle: 'لضمان أن يبدأ المنهج من النقطة المناسبة لك تماماً',
    options: [
      { label: 'مبتدئ تماماً (من الصفر)', sub: 'أحتاج أساسيات مبسطة وشرحاً عملياً خطوة بخطوة', value: 'beginner' },
      { label: 'لدي اطلاع وأساسيات سابقة', sub: 'أريد تعميق المهارة وتطبيق مشاريع واقعية', value: 'intermediate' },
      { label: 'متخصص / محترف', sub: 'أبحث عن أحدث أدوات الـ AI والتطبيقات المتقدمة', value: 'advanced' },
    ],
  },
]

export interface MatchedProgram {
  id: string | number
  title: string
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
  isTrack: boolean
}

/**
 * Intelligent recommendation engine: matches live courses and tracks from DB
 */
function scorePrograms(
  answers: Record<string, string>,
  courses: Course[],
): MatchedProgram[] {
  const { goal, time, level } = answers
  const results: MatchedProgram[] = []

  // 1. Evaluate live courses from database
  courses.forEach((c) => {
    // Skip ended courses
    if (resolveCourseIsEnded(c)) return

    let score = 50 // Base match score
    const title = (c.title || '').toLowerCase()
    const desc = (c.description || c.short_description || '').toLowerCase()
    const hours = Number(c.training_hours || 0)
    const isFree = c.type === 'free' || Boolean(c.is_free) || Number(c.price) === 0
    const rawKind = ((c.program_kind || c.program_type || (c as Record<string, unknown>).catalog_type || '') as string).toLowerCase()
    const isWorkshop = rawKind === 'workshop' || title.includes('ورشة') || title.includes('ندوة') || (hours > 0 && hours <= 6)
    const isTrack = Boolean(c.learning_path) || Boolean(c.is_part_of_learning_path) || rawKind === 'path' || title.includes('مسار') || hours >= 40

    // Goal matching
    if (goal === 'quick_workshop') {
      if (isWorkshop) score += 35
      if (isFree) score += 20
    } else if (goal === 'ai') {
      if (title.includes('ذكاء') || title.includes('ai') || desc.includes('ذكاء') || desc.includes('بيانات')) score += 35
    } else if (goal === 'career') {
      if (!isWorkshop || hours >= 12) score += 25
      if (c.certificate) score += 15
    } else if (goal === 'full_track') {
      if (isTrack) score += 40
      if (hours >= 20) score += 20
    }

    // Time commitment matching
    if (time === 'light') {
      if (isWorkshop || hours <= 8) score += 25
      else if (hours > 30) score -= 20
    } else if (time === 'medium') {
      if (hours >= 10 && hours <= 30) score += 25
    } else if (time === 'intensive') {
      if (hours >= 20 || isTrack) score += 30
    }

    // Level matching
    if (level === 'beginner') {
      if (c.level?.toLowerCase().includes('مبتدئ') || title.includes('أساسيات') || title.includes('placement') || title.includes('fundamentals')) {
        score += 25
      }
    } else if (level === 'intermediate' || level === 'advanced') {
      if (!title.includes('أساسيات') && !title.includes('placement')) {
        score += 15
      }
    }

    const durationText = hours > 0 ? `${hours} ساعة تدريبية` : (c.duration || 'مرن')
    const priceFormatted = isFree ? 'مجاناً' : formatPrice(c.price)

    results.push({
      id: `course-${c.id}`,
      title: c.title,
      badge: isWorkshop ? 'ورشة عمل تفاعلية' : isTrack ? 'مسار تأهيل شامل' : 'دورة تخصصية معتمدة',
      badgeCls: isWorkshop ? 'bg-amber-500/10 text-amber-700 border-amber-300' : isTrack ? 'bg-indigo-500/10 text-indigo-700 border-indigo-300' : 'bg-customBlue/10 text-customBlue border-customBlue/30',
      duration: durationText,
      level: c.level || (level === 'beginner' ? 'مبتدئ' : 'جميع المستويات'),
      delivery: c.is_online ? 'عن بُعد (مباشر تفاعلي)' : (c.location || 'حضوري في المركز'),
      priceText: priceFormatted,
      instructor: c.instructor?.name || c.instructor_name || null,
      description: c.short_description || c.description || 'برنامج تطبيقي مباشر مصمم لبناء مهارات عملية مواكبة لسوق العمل مع شهادة معتمدة.',
      href: `/courses/${c.slug}`,
      ctaText: isFree ? 'سجل مجاناً في البرنامج' : 'تفاصيل والتسجيل في الدورة',
      matchPercentage: Math.min(Math.max(score, 75), 98),
      isTrack: false,
    })
  })

  // 2. Evaluate official professional tracks
  PROFESSIONAL_TRACKS.forEach((track) => {
    let score = 55
    const title = track.title.toLowerCase()
    const focus = track.focus.toLowerCase()

    if (goal === 'full_track') score += 40
    if (goal === 'career') score += 30
    if (goal === 'ai' && (title.includes('ذكاء') || focus.includes('ذكاء') || focus.includes('python'))) score += 35

    if (time === 'intensive') score += 25
    if (time === 'light') score -= 25

    if (level === 'advanced' || level === 'intermediate') score += 15

    results.push({
      id: `track-${track.id}`,
      title: track.title,
      badge: 'مسار احترافي معتمد دولياً',
      badgeCls: 'bg-indigo-500/10 text-indigo-700 border-indigo-300',
      duration: track.duration,
      level: 'متوسط إلى متقدم',
      delivery: 'عن بُعد + إشراف ومشاريع تطبيقية',
      priceText: track.price ? `${track.price} €` : 'منحة وتأهيل',
      instructor: 'نخبة من خبراء ومستشاري المركز',
      description: track.focus,
      href: track.landingSlug ? `/tracks/${track.landingSlug}` : '/courses',
      ctaText: 'استكشف تفاصيل المسار والشهادة',
      matchPercentage: Math.min(Math.max(score, 70), 99),
      isTrack: true,
    })
  })

  // Sort descending by matchPercentage
  return results.sort((a, b) => b.matchPercentage - a.matchPercentage)
}

export default function HomePathFinder() {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isCompleted, setIsCompleted] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    fetchCoursesFromApi()
      .then((res) => setCourses(res))
      .catch(() => setCourses([]))
  }, [])

  const currentQ = QUESTIONS[stepIndex]

  const handleSelect = (val: string) => {
    const updated = { ...answers, [currentQ.id]: val }
    setAnswers(updated)

    if (stepIndex < QUESTIONS.length - 1) {
      setStepIndex((prev) => prev + 1)
    } else {
      setIsCompleted(true)
    }
  }

  const handleReset = () => {
    setAnswers({})
    setStepIndex(0)
    setIsCompleted(false)
  }

  const matchedPrograms = useMemo(() => {
    if (!isCompleted) return []
    return scorePrograms(answers, courses)
  }, [isCompleted, answers, courses])

  const topMatch = matchedPrograms[0] || null
  const alternatives = matchedPrograms.slice(1, 3)

  return (
    <section
      id="path-finder"
      dir="rtl"
      className="relative overflow-hidden bg-[#FBFAF7] py-16 sm:py-24 border-b border-slate-200/60"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-customBlue/20 bg-customBlue/5 px-4 py-1 text-xs font-bold text-customBlue mb-3">
            <Compass size={14} className="text-customOrange" />
            <span>محدد المسار التفاعلي الذكي</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-deepBlue">
            حائر من أين تبدأ؟ <span className="text-customBlue">اكتشف البرنامج الأنسب لك</span>
          </h2>
          <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            يقوم النظام بفحص كافة الورش والدورات والمسارات المتاحة في قاعدة بيانات المركز، وترشيح البرنامج الأنسب لهدفك ومستواك.
          </p>
        </div>

        {/* Interactive Box */}
        <div className="rounded-3xl bg-white p-6 sm:p-10 shadow-xl border border-slate-100 relative overflow-hidden">
          {!isCompleted ? (
            <div>
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>السؤال {stepIndex + 1} من {QUESTIONS.length}</span>
                  <span>{Math.round(((stepIndex + 1) / QUESTIONS.length) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className="h-full bg-customOrange"
                    initial={{ width: '33%' }}
                    animate={{ width: `${((stepIndex + 1) / QUESTIONS.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Question */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQ.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6 text-right"
                >
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-deepBlue">
                      {currentQ.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{currentQ.subtitle}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {currentQ.options.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className="group flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/60 text-right transition-all duration-200 hover:border-customBlue hover:bg-white hover:shadow-md hover:ring-2 hover:ring-customBlue/15"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm sm:text-base font-bold text-deepBlue group-hover:text-customBlue transition">
                            {opt.label}
                          </span>
                          {opt.sub && (
                            <span className="mt-1 block text-xs text-slate-500">
                              {opt.sub}
                            </span>
                          )}
                        </div>
                        <div className="mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 group-hover:border-customBlue group-hover:bg-customBlue group-hover:text-white transition">
                          <ArrowLeft size={16} />
                        </div>
                      </button>
                    ))}
                  </div>

                  {stepIndex > 0 && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                      >
                        ← الرجوع للسؤال السابق
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            /* Result Screen */
            topMatch && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="text-right"
              >
                <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={14} />
                    <span>تم تحليل إجاباتك! البرنامج الأعلى تطابقاً في المنظومة:</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-deepBlue transition"
                  >
                    <RotateCcw size={13} />
                    <span>إعادة الاختبار</span>
                  </button>
                </div>

                {/* Primary Top Recommendation Card */}
                <div className="rounded-2xl border-2 border-customBlue/30 bg-gradient-to-br from-white via-sky-50/25 to-orange-50/20 p-6 sm:p-8 shadow-sm">
                  {/* Top Badges Bar */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-black text-white shadow-sm">
                      <Sparkles size={12} />
                      <span>تطابق بنسبة {topMatch.matchPercentage}%</span>
                    </span>

                    <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${topMatch.badgeCls}`}>
                      {topMatch.badge}
                    </span>

                    <span className="rounded-lg bg-deepBlue/5 px-2.5 py-1 text-xs font-bold text-deepBlue">
                      ⏱ {topMatch.duration}
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      🎯 {topMatch.level}
                    </span>

                    <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800">
                      🌐 {topMatch.delivery}
                    </span>

                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                      💰 {topMatch.priceText}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl sm:text-2xl font-black text-deepBlue leading-snug mb-2">
                    {topMatch.title}
                  </h3>

                  {topMatch.instructor && (
                    <p className="text-xs font-bold text-customBlue mb-3">
                      تقديم: {topMatch.instructor}
                    </p>
                  )}

                  {/* Description */}
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {topMatch.description}
                  </p>

                  {/* Action CTAs */}
                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200/60">
                    <Link
                      to={topMatch.href}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-customOrange/25 hover:bg-customOrange/90 transition transform hover:-translate-y-0.5"
                    >
                      <Zap size={16} />
                      <span>{topMatch.ctaText}</span>
                      <ArrowLeft size={16} />
                    </Link>

                    <a
                      href={`https://wa.me/3197010204555?text=${encodeURIComponent(
                        `مرحباً مركز EMC، بعد إجراء اختبار محدد المسار التفاعلي، تم ترشيح برنامج "${topMatch.title}". أود الحصول على تفاصيل التسجيل والمواعيد.`,
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

                {/* Alternative Programs Options */}
                {alternatives.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-black text-deepBlue mb-4 flex items-center gap-2">
                      <BookOpen size={16} className="text-customBlue" />
                      <span>خيارات وبدائل أخرى مناسبة لتفضيلاتك:</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {alternatives.map((alt) => (
                        <div
                          key={alt.id}
                          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:bg-white hover:shadow-md hover:border-customBlue/40"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${alt.badgeCls}`}>
                                {alt.badge}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                توافق {alt.matchPercentage}%
                              </span>
                            </div>

                            <h5 className="text-xs sm:text-sm font-black text-deepBlue line-clamp-2 mb-1.5">
                              {alt.title}
                            </h5>

                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {alt.description}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                            <span className="font-bold text-slate-500 text-[11px]">
                              {alt.duration}
                            </span>
                            <Link
                              to={alt.href}
                              className="font-bold text-customBlue hover:text-deepBlue inline-flex items-center gap-1 text-[11px]"
                            >
                              <span>عرض التفاصيل</span>
                              <ArrowLeft size={12} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )
          )}
        </div>
      </div>
    </section>
  )
}
