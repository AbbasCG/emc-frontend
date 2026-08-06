import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Award,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  MessageSquare,
  PlayCircle,
  ShieldAlert,
  X,
} from 'lucide-react'
import {
  fetchPlacementStatus,
  fetchPlacementTest,
  getLevelFromScore,
  PLACEMENT_LEVELS,
  startPlacementTest,
  submitPlacementTest,
  type PlacementQuestion,
  type PlacementSubmitResult,
  type PlacementTest,
} from '@/api/placementApi'
import toast from '@/lib/toast'
import { BackButton } from '@/components/shared/BackButton'
import { useExamLockdown } from '@/hooks/useExamLockdown'
import { bidiIsolateProps } from '@/utils/textDirection'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatTime(secs: number): string {
  return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`
}

type Phase = 'checking' | 'intro' | 'starting' | 'test' | 'result'

const LEVEL_GRADIENT: Record<string, string> = {
  beginner:           'from-slate-400 to-slate-500',
  elementary:         'from-blue-400 to-blue-500',
  pre_intermediate:   'from-cyan-500 to-teal-500',
  intermediate:       'from-emerald-500 to-green-600',
  upper_intermediate: 'from-amber-500 to-orange-500',
  advanced:           'from-violet-500 to-purple-600',
}

export default function PlacementTestPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>('checking')
  const [test, setTest] = useState<PlacementTest | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<PlacementSubmitResult | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(30 * 60)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const submittingRef = useRef(false)

  // ── Exam integrity lockdown — active only while a question is on screen ──
  const lockdown = useExamLockdown({
    active: phase === 'test',
    courseId,
    maxFullscreenExits: 3,
    onMaxExitsReached: () => {
      if (!submittingRef.current) void doSubmit('violations')
    },
  })

  // ── Step 1: check status on mount ───────────────────────────────
  useEffect(() => {
    if (!courseId) return
    void (async () => {
      try {
        const { status, attempt, can_take_written_test } = await fetchPlacementStatus(courseId)

        if (import.meta.env.DEV) {
          console.log('[placement-test page] status:', status, 'can_take:', can_take_written_test, 'attempt:', attempt)
        }

        // In-progress first: student is mid-test, load questions
        if (status === 'in_progress') {
          await loadInProgressTest(courseId)
          return
        }

        // Backend flag: student cannot start a new written test → result page
        if (!can_take_written_test) {
          void navigate(`/dashboard/student/courses/${courseId}/placement-result`, { replace: true })
          return
        }

        // Explicit terminal status → result page
        if (
          status === 'written_submitted' ||
          status === 'oral_booked' ||
          status === 'oral_completed' ||
          status === 'completed'
        ) {
          void navigate(`/dashboard/student/courses/${courseId}/placement-result`, { replace: true })
          return
        }

        // Attempt exists with any status (normalization gap guard) → result page
        if (attempt != null) {
          void navigate(`/dashboard/student/courses/${courseId}/placement-result`, { replace: true })
          return
        }

        // Safe: no attempt, can take test → show intro
        setPhase('intro')
      } catch {
        setPhase('intro')
      }
    })()
  }, [courseId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadInProgressTest(cid: string) {
    try {
      const t = await fetchPlacementTest(cid)
      if (t.questions.length === 0) {
        setPhase('intro')
        return
      }
      setTest(t)
      if (t.duration_minutes) setSecondsLeft(t.duration_minutes * 60)
      setPhase('test')
    } catch {
      setPhase('intro')
    }
  }

  // ── Step 3: student clicks start ────────────────────────────────
  async function handleStart() {
    if (!courseId) return
    setPhase('starting')
    setStartError(null)
    try {
      const result = await startPlacementTest(courseId)
      if (import.meta.env.DEV) {
        console.log('[placement/start normalized]', result)
        console.log('[placement/questions]', result.questions)
      }

      if (result.questions.length === 0) {
        await loadInProgressTest(courseId)
        setStartError('لم يتم تحميل أسئلة الاختبار من الخادم. يرجى المحاولة لاحقًا.')
        return
      }

      if (result.test) {
        setTest(result.test)
        if (result.test.duration_minutes) setSecondsLeft(result.test.duration_minutes * 60)
      }
      setPhase('test')
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string } } }
      const msg = axErr?.response?.data?.message
      setStartError(msg ?? 'تعذّر بدء الاختبار. حاول مجدداً.')
      setPhase('intro')
    }
  }

  // ── Timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!test || phase !== 'test') return
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (!submittingRef.current) void doSubmit('timeout')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [test, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  async function doSubmit(reason: 'manual' | 'timeout' | 'violations' = 'manual') {
    if (!courseId || !test || submittingRef.current) return
    submittingRef.current = true
    if (timerRef.current) clearInterval(timerRef.current)
    setSubmitting(true)
    setShowConfirm(false)
    try {
      const result = await submitPlacementTest(courseId, answers)
      if (reason === 'timeout') toast.warning('انتهى وقت الاختبار — تم الإرسال تلقائياً')
      else if (reason === 'violations') toast.error('تم إنهاء الاختبار تلقائياً بسبب تجاوز الحد المسموح من مخالفات الأمان.')
      else toast.success('تم تسليم الاختبار بنجاح')
      setSubmitResult(result)
      setPhase('result')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'تعذّر إرسال الاختبار. حاول مجدداً.')
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  // ── Checking screen ──────────────────────────────────────────────
  if (phase === 'checking') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-customBlue border-t-transparent" />
          <p className="font-semibold text-deepBlue/60">جاري التحقق من حالة الاختبار...</p>
        </div>
      </div>
    )
  }

  // ── Starting screen ──────────────────────────────────────────────
  if (phase === 'starting') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="font-semibold text-deepBlue/60">جاري تحضير الاختبار...</p>
        </div>
      </div>
    )
  }

  // ── Intro screen ─────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-4"
        >
          <BackButton to="/dashboard/student/courses" label="العودة إلى دوراتي" />
          {startError && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-right">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <p className="text-[13px] font-semibold leading-relaxed text-red-700">{startError}</p>
            </div>
          )}

          <div className="rounded-3xl border border-deepBlue/[0.07] bg-white p-8 shadow-[0_8px_40px_-16px_rgba(34,51,74,0.25)] text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
              <ClipboardCheck className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-[20px] font-black text-deepBlue">اختبار تحديد المستوى</h1>
            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-deepBlue/55">
              سيساعدنا هذا الاختبار على تحديد المستوى المناسب لك وضمان حصولك على تجربة تعليمية مثالية.
            </p>

            <div className="mt-6 space-y-2.5 text-right">
              {[
                'أجب على جميع الأسئلة بأفضل ما تستطيع',
                'لا يمكن العودة لتعديل الإجابات بعد التسليم',
                'سيتم احتساب الأسئلة غير المجابة كإجابات خاطئة',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-customBlue" />
                  <p className="text-[12px] font-semibold text-deepBlue/70">{tip}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleStart()}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-600 px-6 py-3.5 text-[14px] font-black text-white shadow-lg shadow-amber-400/25 transition hover:brightness-105"
            >
              <PlayCircle className="h-5 w-5" />
              ابدأ اختبار تحديد المستوى
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Result screen ────────────────────────────────────────────────
  if (phase === 'result' && submitResult) {
    const { score, total, percentage, estimated_level, level_label } = submitResult
    const gradient = LEVEL_GRADIENT[estimated_level] ?? 'from-customBlue to-deepBlue'
    const levelDef = PLACEMENT_LEVELS.find((l) => l.level === estimated_level) ?? getLevelFromScore(score, total)

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-5"
        >
          <div className="text-center">
            <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${gradient} shadow-xl`}>
              <Award className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-[22px] font-black text-deepBlue">نتيجة اختبار تحديد المستوى</h1>
            <p className="mt-1 text-[13px] font-semibold text-deepBlue/50">تم تسليم الاختبار بنجاح</p>
          </div>

          <div className={`overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-px shadow-xl`}>
            <div className="rounded-3xl bg-white p-6 text-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-deepBlue/40">درجاتك</p>
              <p className="mt-1 font-mono text-[52px] font-black tabular-nums leading-none text-deepBlue">
                {score}
                <span className="text-[24px] text-deepBlue/35">/{total}</span>
              </p>
              <div className="mx-auto mt-4 max-w-[180px]">
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-l ${gradient}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                  />
                </div>
                <p className="mt-1.5 font-mono text-[13px] font-black tabular-nums text-deepBlue/55">
                  {percentage}%
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-deepBlue/40">مستواك التقديري</p>
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-md`}>
                <Award className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-[20px] font-black text-deepBlue">{level_label}</p>
                <p className="text-[12px] font-semibold text-deepBlue/55">{levelDef.description}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to={`/dashboard/student/courses/${courseId}/oral-booking`}
              className="flex w-full items-center justify-center gap-2 rounded-3xl bg-gradient-to-l from-customBlue to-deepBlue px-6 py-4 text-[14px] font-black text-white shadow-lg shadow-deepBlue/20 transition hover:brightness-105"
            >
              <MessageSquare className="h-5 w-5" />
              حجز المقابلة الشفهية
            </Link>
            <Link
              to="/dashboard/student/courses"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-[13px] font-bold text-deepBlue/65 transition hover:bg-slate-50"
            >
              العودة إلى دوراتي
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Test screen ──────────────────────────────────────────────────
  if (!test) return null

  const questions = test.questions
  const total = questions.length
  const answeredCount = Object.keys(answers).length
  const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0
  const current: PlacementQuestion = questions[currentIdx]
  const isWarning = secondsLeft < 300
  const isFirst = currentIdx === 0
  const isLast = currentIdx === total - 1

  return (
    <div className="min-h-screen select-none pb-16" dir="rtl">
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
        {!lockdown.isFullscreen && (
          <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-amber-700">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              أنت خارج وضع ملء الشاشة — يُرجى العودة إليه لمتابعة الاختبار بأمان.
            </div>
            <button
              type="button"
              onClick={() => void lockdown.requestFullscreen()}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-black text-white transition hover:brightness-105"
            >
              العودة لملء الشاشة
            </button>
          </div>
        )}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-deepBlue/40">
              اختبار تحديد المستوى
            </p>
            <h1 className="line-clamp-1 text-[15px] font-black text-deepBlue">{test.title}</h1>
          </div>
          <div
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 font-mono text-[18px] font-black tabular-nums transition-colors ${
              isWarning
                ? 'animate-pulse bg-red-50 text-red-600'
                : 'bg-slate-50 text-deepBlue'
            }`}
          >
            <Clock className="h-4 w-4 shrink-0" />
            {formatTime(secondsLeft)}
          </div>
        </div>
        <div className="mx-auto mt-2 max-w-3xl">
          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-deepBlue/50">
            <span>{answeredCount} / {total} سؤال تمت الإجابة عليه</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-customBlue to-customBlue/70"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-8">
        {/* ── Question navigator dots ───────────────────────────── */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-2xl border border-customBlue/20 bg-customBlue/[0.07] px-3 py-1.5 text-[12px] font-black text-customBlue">
            السؤال {currentIdx + 1} من {total}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIdx(i)}
                aria-label={`السؤال ${i + 1}`}
                className={`h-6 w-6 rounded-full text-[9px] font-black transition ${
                  i === currentIdx
                    ? 'bg-customBlue text-white shadow-sm ring-2 ring-customBlue/30'
                    : answers[q.id]
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* ── Question card ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 18 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-deepBlue/[0.07] bg-white p-6 shadow-[0_8px_32px_-12px_rgba(34,51,74,0.16)] sm:p-8"
          >
            <p
              {...bidiIsolateProps(current.text)}
              className="select-none text-[18px] font-semibold leading-relaxed text-deepBlue sm:text-[21px]"
            >
              {current.text}
            </p>

            <div className="mt-7 space-y-3">
              {current.options.map((opt) => {
                const selected = answers[current.id] === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [current.id]: opt.key }))
                    }
                    className={`flex w-full select-none items-center gap-4 rounded-2xl border-2 px-5 py-4 text-right transition ${
                      selected
                        ? 'border-customBlue bg-customBlue/[0.06] shadow-md shadow-customBlue/10'
                        : 'border-slate-200 bg-white hover:border-customBlue/30 hover:bg-slate-50/80'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-black transition ${
                        selected ? 'bg-customBlue text-white' : 'bg-slate-100 text-deepBlue/55'
                      }`}
                    >
                      {opt.key}
                    </span>
                    <span
                      {...bidiIsolateProps(opt.text)}
                      className={`flex-1 text-[16px] font-semibold leading-relaxed ${
                        selected ? 'text-deepBlue' : 'text-deepBlue/75'
                      }`}
                    >
                      {opt.text}
                    </span>
                    {selected && (
                      <CheckCircle className="h-5 w-5 shrink-0 text-customBlue" />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Navigation ───────────────────────────────────────── */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-black text-deepBlue/65 transition hover:bg-slate-50 disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              className="flex items-center gap-2 rounded-2xl bg-customBlue px-7 py-2.5 text-[13px] font-black text-white shadow-md shadow-customBlue/25 transition hover:brightness-105 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              إنهاء الاختبار
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIdx((i) => Math.min(total - 1, i + 1))}
              className="flex items-center gap-1.5 rounded-2xl bg-deepBlue px-7 py-2.5 text-[13px] font-black text-white shadow-md transition hover:brightness-105"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {answeredCount < total && (
          <p className="mt-4 text-center text-[11px] font-semibold text-amber-600">
            {total - answeredCount} سؤال لم تُجب عليه بعد
          </p>
        )}
      </div>

      {/* ── Submit confirm modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between">
                <h2 className="text-[17px] font-black text-deepBlue">تأكيد تسليم الاختبار</h2>
                <button type="button" onClick={() => setShowConfirm(false)}>
                  <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                </button>
              </div>

              <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-deepBlue/55">أُجيب عليها</span>
                  <span className="font-black text-emerald-600">{answeredCount}</span>
                </div>
                <div className="mt-1 flex justify-between text-[13px]">
                  <span className="font-semibold text-deepBlue/55">لم يُجب عليها</span>
                  <span className="font-black text-amber-600">{total - answeredCount}</span>
                </div>
              </div>

              <p className="mb-6 text-[12px] font-semibold leading-relaxed text-deepBlue/60">
                الأسئلة غير المجابة ستُحتسب خاطئة. لا يمكن تعديل الإجابات بعد التسليم.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void doSubmit()}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-customBlue px-4 py-3 text-[13px] font-black text-white transition hover:brightness-105 disabled:opacity-50"
                >
                  {submitting ? 'جاري الإرسال...' : 'تسليم الاختبار'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-[13px] font-black text-deepBlue/65 transition hover:bg-slate-50"
                >
                  مراجعة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
