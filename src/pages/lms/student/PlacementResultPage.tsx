import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Download,
  ExternalLink,
  Lock,
  MessageSquare,
  Mic,
  RefreshCw,
  User,
} from 'lucide-react'
import {
  fetchPlacementStatus,
  getLevelFromScore,
  type OralBooking,
  type PlacementAttempt,
} from '@/api/placementApi'
import { downloadCalendarEventIcs } from '@/api/calendarApi'
import { BackButton } from '@/components/shared/BackButton'
import { fmtDate, formatStudentTimeFromIso, formatStudentDateTimeRange } from '@/components/lms/lmsFormatters'
import toast from '@/lib/toast'

const ORAL_BOOKING_STATUS_LABEL: Record<string, string> = {
  booked: 'في انتظار المدرب',
  completed: 'اكتملت المقابلة',
  cancelled_by_instructor: 'ألغى المدرب الموعد',
  cancelled_by_student: 'تم إلغاء الموعد',
  no_show: 'لم يحضر الطالب',
}

/* ── CEFR level ladder ──────────────────────────────────────────────────────── */

const CEFR_LADDER = [
  { key: 'beginner',           cefr: 'Starter', arabic: 'مبتدئ',          dotColor: 'bg-slate-400',   textColor: 'text-slate-500'   },
  { key: 'elementary',         cefr: 'A1',      arabic: 'ابتدائي',         dotColor: 'bg-blue-400',    textColor: 'text-blue-500'    },
  { key: 'pre_intermediate',   cefr: 'A2',      arabic: 'ما قبل المتوسط',  dotColor: 'bg-customBlue',  textColor: 'text-customBlue'  },
  { key: 'intermediate',       cefr: 'B1',      arabic: 'متوسط',           dotColor: 'bg-emerald-500', textColor: 'text-emerald-600' },
  { key: 'upper_intermediate', cefr: 'B2',      arabic: 'فوق المتوسط',     dotColor: 'bg-amber-500',   textColor: 'text-amber-600'   },
  { key: 'advanced',           cefr: 'C1',      arabic: 'متقدم',           dotColor: 'bg-violet-500',  textColor: 'text-violet-600'  },
  { key: '_ielts',             cefr: 'IELTS',   arabic: '',                dotColor: 'bg-yellow-400',  textColor: 'text-yellow-600'  },
] as const

function LevelLadder({ activeKey, score, total }: { activeKey: string; score: number; total: number }) {
  const activeIdx = CEFR_LADDER.findIndex((l) => l.key === activeKey)
  const active    = activeIdx >= 0 ? CEFR_LADDER[activeIdx] : null

  return (
    <div>
      {/* Horizontal track */}
      <div dir="ltr" className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-stretch">
          {CEFR_LADDER.map((lvl, i) => {
            const isPast   = i < activeIdx
            const isActive = i === activeIdx
            const isFuture = i > activeIdx

            return (
              <div key={lvl.key} className="flex flex-1 flex-col items-center" style={{ minWidth: isActive ? 72 : 52 }}>
                {/* CEFR label top */}
                <p className={`mb-2 text-[10px] font-black tracking-wide transition-colors ${
                  isActive ? lvl.textColor : isFuture ? 'text-slate-200' : 'text-slate-400'
                }`}>
                  {lvl.cefr}
                </p>

                {/* Track row — fixed height so all nodes stay on the same horizontal line */}
                <div className="flex h-10 w-full items-center">
                  {/* Left connector */}
                  {i > 0 && (
                    <div className={`h-[3px] flex-1 ${i <= activeIdx ? 'bg-slate-300' : 'bg-slate-100'}`} />
                  )}

                  {/* Node */}
                  {isActive ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                      className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${lvl.dotColor} shadow-lg`}
                    >
                      <Check className="h-4 w-4 font-black text-white" strokeWidth={3} />
                      <span className={`absolute -top-1.5 -right-1.5 flex h-4 w-4 animate-ping rounded-full opacity-40 ${lvl.dotColor}`} />
                    </motion.div>
                  ) : (
                    <div className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                      isPast ? 'border-slate-300 bg-slate-100' : `border-slate-200 bg-white ${lvl.key === '_ielts' ? 'border-dashed' : ''}`
                    }`} />
                  )}

                  {/* Right connector */}
                  {i < CEFR_LADDER.length - 1 && (
                    <div className={`h-[3px] flex-1 ${i < activeIdx ? 'bg-slate-300' : 'bg-slate-100'}`} />
                  )}
                </div>

                {/* Arabic label bottom */}
                <p className={`mt-2 text-center text-[8px] leading-tight ${
                  isActive ? `font-black ${lvl.textColor}` : isFuture ? 'text-slate-200' : 'font-semibold text-slate-400'
                }`}>
                  {lvl.arabic}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Active level annotation */}
      {active && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-[12px] font-black ${active.dotColor} text-white shadow-md`}>
            <span className="font-mono tabular-nums">{score}/{total}</span>
            <span className="opacity-60">·</span>
            {active.cefr}
          </span>
          {active.arabic && (
            <span className="text-[13px] font-black text-deepBlue">{active.arabic}</span>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Gradient per level key ─────────────────────────────────────────────────── */

const LEVEL_GRADIENT: Record<string, string> = {
  beginner:           'from-slate-400 to-slate-500',
  elementary:         'from-blue-400 to-blue-500',
  pre_intermediate:   'from-customBlue to-[#1a7aad]',
  intermediate:       'from-emerald-500 to-green-600',
  upper_intermediate: 'from-amber-500 to-orange-500',
  advanced:           'from-violet-500 to-purple-600',
}

/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function PlacementResultPage() {
  const { courseId }  = useParams<{ courseId: string }>()
  const navigate      = useNavigate()

  const [attempt, setAttempt]             = useState<PlacementAttempt | null>(null)
  const [oralBooking, setOralBooking]     = useState<OralBooking | null>(null)
  const [canStartLearning, setCanStart]   = useState(false)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(false)
  const [retryCount, setRetryCount]       = useState(0)

  // Re-arm the loading state during render when the query changes (react.dev
  // "adjusting state when a prop changes") — the initial state already carries the
  // first pass's values, so the effect below never touches state synchronously.
  const [seenQuery, setSeenQuery] = useState({ courseId, retryCount })
  if (seenQuery.courseId !== courseId || seenQuery.retryCount !== retryCount) {
    setSeenQuery({ courseId, retryCount })
    if (courseId) {
      setLoading(true)
      setError(false)
    }
  }

  useEffect(() => {
    if (!courseId) return
    void (async () => {
      try {
        const { status, attempt: a, oral_booking: ob, can_start_learning: csl, can_take_written_test: canTake } =
          await fetchPlacementStatus(courseId)

        if (import.meta.env.DEV) {
          console.log('[placement/result] status:', status, 'attempt:', a, 'oral_booking:', ob, 'canTake:', canTake)
        }

        // Attempt present → always show result, regardless of status
        if (a) {
          setAttempt(a)
          setOralBooking(ob ?? null)
          setCanStart(csl ?? false)
          setLoading(false)
          return
        }

        // Only redirect to test page when written test has not been taken yet
        if (canTake && (status === 'not_started' || status === 'placement_required')) {
          setLoading(false)
          void navigate(`/dashboard/student/courses/${courseId}/placement-test`, { replace: true })
          return
        }

        // Normalization gap: status exists but no attempt object
        setError(true)
        setLoading(false)
      } catch {
        setError(true)
        setLoading(false)
      }
    })()
  }, [courseId, navigate, retryCount])

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-customBlue border-t-transparent" />
          <p className="text-[13px] font-semibold text-deepBlue/55">جاري تحميل النتيجة...</p>
        </div>
      </div>
    )
  }

  /* ── Error / no attempt ──────────────────────────────────────────────── */
  if (error || !attempt) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6" dir="rtl">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-[16px] font-black text-deepBlue">تعذّر تحميل النتيجة</p>
          <p className="mt-2 text-[13px] font-semibold leading-relaxed text-deepBlue/50">
            لم نتمكن من استرداد بيانات الاختبار. تحقق من اتصالك وأعد المحاولة.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setRetryCount((n) => n + 1)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-customBlue px-6 py-3 text-[13px] font-black text-white transition hover:brightness-105"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>
            <Link
              to="/dashboard/student/courses"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-[13px] font-bold text-deepBlue/65 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              العودة إلى دوراتي
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ── Derived values ──────────────────────────────────────────────────── */

  const score = attempt.written_score ?? 0
  const total = attempt.total_questions ?? 70
  const pct   = attempt.percentage ?? (total > 0 ? Math.round((score / total) * 100) : 0)

  const level    = getLevelFromScore(score, total)
  const gradient = LEVEL_GRADIENT[level.level] ?? 'from-customBlue to-deepBlue'
  const lvKey    = level.level

  // Step conditions — per spec
  const hasOralBooking = oralBooking != null
  const isFinalDone    =
    (oralBooking?.final_level != null && oralBooking.final_level !== '') ||
    (attempt.final_level     != null && attempt.final_level     !== '')
  const oralCompleted = oralBooking?.status === 'completed'
  const canLearn = canStartLearning

  const steps = [
    { label: 'نتيجة الاختبار الكتابي',     done: true,           Icon: ClipboardCheck },
    { label: 'حجز المقابلة الشفوية',        done: hasOralBooking, Icon: MessageSquare  },
    { label: 'المقابلة الشفوية مكتملة',     done: oralCompleted,  Icon: Mic            },
    { label: 'اعتماد المستوى النهائي',      done: isFinalDone,    Icon: Award          },
    { label: 'بدء التعلم',                  done: canLearn,       Icon: BookOpen       },
  ]

  const finalLevelStr = oralBooking?.final_level ?? attempt.final_level

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10" dir="rtl">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${gradient} shadow-xl`}>
          <Award className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-[22px] font-black text-deepBlue">نتيجة اختبار تحديد المستوى</h1>
        {attempt.submitted_at && (
          <p className="mt-1 text-[12px] font-semibold text-deepBlue/45">
            تاريخ الإكمال: {fmtDate(attempt.submitted_at)}
          </p>
        )}
      </motion.div>

      {/* ── Score card ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className={`overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-px shadow-xl`}
      >
        <div className="rounded-3xl bg-white p-7 text-center">
          <p className="text-[12px] font-black uppercase tracking-widest text-deepBlue/40">النتيجة</p>
          <p className="mt-1 font-mono text-[52px] font-black tabular-nums leading-none text-deepBlue">
            {score}
            <span className="text-[26px] text-deepBlue/35">/{total}</span>
          </p>
          <div className="mx-auto mt-4 max-w-[200px]">
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-l ${gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[13px] font-black tabular-nums text-deepBlue/55">
              النسبة: {pct}%
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── CEFR level ladder ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="rounded-3xl border border-deepBlue/[0.07] bg-white p-6 shadow-[0_4px_24px_-8px_rgba(12,42,75,0.12)]"
      >
        <p className="mb-5 text-[10px] font-black uppercase tracking-widest text-deepBlue/40">
          مستوى اللغة التقديري
        </p>
        <LevelLadder activeKey={lvKey} score={score} total={total} />
        <p className="mt-4 text-center text-[12px] font-semibold text-deepBlue/45">
          {level.description}
        </p>
      </motion.div>

      {/* ── Steps progress ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="rounded-3xl border border-deepBlue/[0.07] bg-white p-6 shadow-[0_4px_24px_-8px_rgba(12,42,75,0.12)]"
      >
        <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-deepBlue/40">
          مراحل التقييم
        </p>
        <ol className="space-y-2.5">
          {steps.map(({ label, done, Icon }, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${done ? 'bg-emerald-50' : 'bg-slate-50'}`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${done ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                {done ? <Icon className="h-4 w-4 text-white" /> : <Lock className="h-4 w-4 text-slate-400" />}
              </div>
              <span className={`flex-1 text-[13px] font-semibold ${done ? 'text-deepBlue' : 'text-deepBlue/40'}`}>
                {label}
              </span>
              {done && <CheckCircle className="h-4 w-4 text-emerald-500" />}
            </li>
          ))}
        </ol>
      </motion.div>

      {/* ── CTA section ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="space-y-3"
      >
        {/* Case A: no oral booking yet → prompt to book */}
        {!hasOralBooking && (
          <div className="rounded-3xl border border-customBlue/20 bg-gradient-to-br from-customBlue/[0.05] to-deepBlue/[0.03] p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-customBlue/10">
                <MessageSquare className="h-5 w-5 text-customBlue" />
              </div>
              <div>
                <p className="text-[13px] font-black text-deepBlue">الخطوة التالية</p>
                <p className="mt-0.5 text-[12px] font-semibold leading-relaxed text-deepBlue/55">
                  احجز المقابلة الشفوية مع المدرب لتأكيد مستواك النهائي.
                </p>
              </div>
            </div>
            <Link
              to={`/dashboard/student/courses/${courseId}/oral-booking`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-customBlue to-deepBlue px-6 py-4 text-[14px] font-black text-white shadow-lg shadow-deepBlue/20 transition hover:brightness-105"
            >
              <MessageSquare className="h-5 w-5" />
              حجز المقابلة الشفوية
            </Link>
          </div>
        )}

        {/* Case B: oral booking exists, final level not yet approved */}
        {hasOralBooking && !isFinalDone && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <p className="font-black text-deepBlue">تم حجز المقابلة الشفوية</p>
              <span className="mr-auto rounded-xl bg-amber-200 px-2.5 py-1 text-[10px] font-black text-amber-700">
                {ORAL_BOOKING_STATUS_LABEL[oralBooking.status ?? ''] ?? 'في انتظار المدرب'}
              </span>
            </div>

            {/* Booking details */}
            <div className="space-y-2.5 rounded-2xl border border-amber-200/70 bg-white/70 px-4 py-3.5">
              {oralBooking.instructor_name && (
                <div className="flex items-center gap-2.5 text-[12px] font-semibold text-deepBlue/70">
                  <User className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>المدرب: <span className="font-black text-deepBlue">{oralBooking.instructor_name}</span></span>
                </div>
              )}
              {oralBooking.starts_at && (
                <div className="flex items-center gap-2.5 text-[12px] font-semibold text-deepBlue/70">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>{fmtDate(oralBooking.starts_at)}</span>
                </div>
              )}
              {(oralBooking.starts_at || oralBooking.ends_at) && (
                <div className="flex items-center gap-2.5 text-[12px] font-semibold text-deepBlue/70">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="font-mono tabular-nums">
                    {oralBooking.ends_at
                      ? formatStudentDateTimeRange(oralBooking.starts_at, oralBooking.ends_at)
                      : formatStudentTimeFromIso(oralBooking.starts_at)}
                  </span>
                </div>
              )}

              {/* Meeting link — never left blank */}
              <div className="pt-1">
                {oralBooking.meeting_link ? (
                  <a
                    href={oralBooking.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-customBlue to-deepBlue px-4 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:brightness-105"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    الانضمام إلى الاجتماع
                  </a>
                ) : (
                  <p className="rounded-xl bg-white px-3 py-2 text-center text-[11px] font-bold text-amber-700">
                    سيتم إضافة رابط الاجتماع قريباً
                  </p>
                )}
              </div>

              {/* Calendar action */}
              {oralBooking.calendar_event_id != null && (
                <button
                  type="button"
                  onClick={() => {
                    void downloadCalendarEventIcs(
                      oralBooking.calendar_event_id!,
                      'oral-assessment.ics',
                    ).catch(() => toast.error('تعذّر تنزيل ملف التقويم'))
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-[11px] font-black text-amber-700 transition hover:bg-amber-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  إضافة إلى التقويم (ICS)
                </button>
              )}
            </div>

            <p className="mt-3 text-center text-[11px] font-semibold text-amber-700/70">
              أُرسلت تفاصيل الموعد ودعوة التقويم إلى بريدك الإلكتروني.
            </p>
            <p className="mt-1.5 text-center text-[12px] font-semibold text-amber-700/70">
              ستُفعَّل الدورة بعد اعتماد مستواك من المدرب
            </p>
          </div>
        )}

        {/* Case C: final level approved */}
        {isFinalDone && finalLevelStr && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-3 text-[16px] font-black text-deepBlue">
              مستواك النهائي: {finalLevelStr}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-deepBlue/55">
              يمكنك الآن الانضمام إلى المجموعة المناسبة وبدء التعلم
            </p>
            <Link
              to="/dashboard/student/courses"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-[13px] font-black text-white transition hover:brightness-105"
            >
              <BookOpen className="h-4 w-4" />
              ابدأ التعلم
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Case C without final level string (oral completed but level not set) */}
        {isFinalDone && !finalLevelStr && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-2 font-black text-deepBlue">المقابلة الشفوية مكتملة</p>
            <p className="mt-1 text-[12px] font-semibold text-deepBlue/55">
              سيتم إشعارك بمستواك النهائي قريباً
            </p>
          </div>
        )}

        <BackButton
          to="/dashboard/student/courses"
          label="العودة إلى دوراتي"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-[13px] font-bold text-deepBlue/65 transition hover:bg-slate-50"
        />
      </motion.div>
    </div>
  )
}
