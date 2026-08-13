import { useEffect, useState } from 'react'
import { ListChecks, Clock, CheckCircle2, RefreshCw, Award, X } from 'lucide-react'
import {
  fetchStudentQuizzes, fetchStudentFinalGrade, fetchStudentQuizTake, submitStudentQuiz,
  type StudentQuizSummary, type FinalGradeBreakdown, type StudentQuizTake,
} from '@/api/courseQuizApi'
import toast from '@/lib/toast'
import EmptyHint from './shared/EmptyHint'

const STATUS_AR: Record<string, string> = {
  active: 'متاح الآن', scheduled: 'قادم', closed: 'انتهى', draft: 'غير متاح', archived: 'غير متاح',
}
const STATUS_CLS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-amber-100 text-amber-700',
  closed: 'bg-slate-100 text-slate-500',
  draft: 'bg-slate-100 text-slate-400',
  archived: 'bg-slate-100 text-slate-400',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
}

// ─── Final grade breakdown card ──────────────────────────────────────────────

function FinalGradeCard({ breakdown }: { breakdown: FinalGradeBreakdown }) {
  if (breakdown.status === 'incomplete') {
    return (
      <div className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/40 p-5 text-center">
        <p className="text-[13px] font-black text-amber-700">النتيجة النهائية غير مكتملة بعد</p>
        <p className="mt-1 text-[11px] font-semibold text-amber-600/70">أكمل الاختبارات المطلوبة لعرض النتيجة النهائية</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Award className="h-4 w-4 text-[#0077B6]" />
        <h3 className="text-[14px] font-black text-deepBlue">النتيجة النهائية</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[11px] font-black text-deepBlue/50">الاختبارات القصيرة</p>
          <p className="mt-1 text-[22px] font-black text-deepBlue">{breakdown.quiz_component_score ?? '—'}%</p>
          <p className="mt-0.5 text-[10px] font-bold text-deepBlue/40">
            {breakdown.quiz_component_weight}% من النتيجة النهائية · المساهمة: {breakdown.quiz_contribution ?? 0} نقطة
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[11px] font-black text-deepBlue/50">الاختبار النهائي</p>
          <p className="mt-1 text-[22px] font-black text-deepBlue">{breakdown.final_exam_score ?? '—'}%</p>
          <p className="mt-0.5 text-[10px] font-bold text-deepBlue/40">
            {breakdown.final_exam_weight}% من النتيجة النهائية · المساهمة: {breakdown.final_exam_contribution ?? 0} نقطة
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-gradient-to-l from-[#0C2A4B] to-[#0077B6] p-4 text-center">
        <p className="text-[11px] font-black text-white/70">النتيجة النهائية</p>
        <p className="text-[28px] font-black text-white">{breakdown.final_course_score ?? '—'}%</p>
      </div>

      {breakdown.quiz_breakdown.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] font-black text-deepBlue/40">تفاصيل الاختبارات القصيرة</p>
          {breakdown.quiz_breakdown.map((q) => (
            <div key={q.quiz_id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-deepBlue/70">
              <span>{q.title}</span>
              <span>{q.score ?? '—'}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Take-quiz modal ──────────────────────────────────────────────────────────

function TakeQuizModal({ quizId, onClose, onSubmitted }: { quizId: number; onClose: () => void; onSubmitted: () => void }) {
  const [take, setTake] = useState<StudentQuizTake | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const t = await fetchStudentQuizTake(quizId)
        if (alive) setTake(t)
      } catch (err) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        toast.error(msg ?? 'تعذّر تحميل الاختبار')
        onClose()
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [quizId])

  async function submit() {
    if (!take) return
    setSubmitting(true)
    try {
      const result = await submitStudentQuiz(quizId, answers)
      toast.success(`تم التقديم — النتيجة: ${result.score}%`)
      onSubmitted()
      onClose()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'تعذّر تقديم الاختبار')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-black text-deepBlue">{take?.title ?? 'الاختبار'}</h3>
          <button type="button" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}</div>
        ) : take ? (
          <div className="space-y-4">
            {take.questions.map((q, idx) => (
              <div key={q.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[13px] font-black text-deepBlue">{idx + 1}. {q.question}</p>
                <div className="mt-2 space-y-1.5">
                  {(q.options ?? []).map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-[12px] font-bold text-deepBlue/70">
                      <input
                        type="radio" name={`q-${q.id}`} value={opt}
                        checked={answers[String(q.id)] === opt}
                        onChange={() => setAnswers((prev) => ({ ...prev, [String(q.id)]: opt }))}
                        className="h-4 w-4"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button" disabled={submitting} onClick={() => void submit()}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-deepBlue text-[13px] font-black text-white disabled:opacity-40"
            >
              {submitting ? 'جارِ التقديم...' : 'تقديم الإجابات'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Quiz card ────────────────────────────────────────────────────────────────

function QuizRow({ quiz, onOpen }: { quiz: StudentQuizSummary; onOpen: () => void }) {
  const exhausted = quiz.attempts_used >= quiz.max_attempts
  const canTake = quiz.status === 'active' && !exhausted

  return (
    <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-black text-deepBlue">{quiz.title}</p>
          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${STATUS_CLS[quiz.status]}`}>{STATUS_AR[quiz.status]}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-[10px] font-bold text-deepBlue/45">
          <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" /> {quiz.questions_count} سؤال</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> يغلق: {fmtDate(quiz.closes_at)}</span>
          <span>محاولات: {quiz.attempts_used}/{quiz.max_attempts}</span>
          {quiz.completed && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> أفضل نتيجة: {quiz.best_score}%</span>}
        </div>
      </div>
      <button
        type="button"
        disabled={!canTake && !quiz.completed}
        onClick={onOpen}
        className="h-9 shrink-0 rounded-2xl bg-[#0077B6] px-4 text-[11px] font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {quiz.completed ? (exhausted ? 'عرض النتيجة' : 'إعادة المحاولة') : canTake ? 'ابدأ الاختبار' : 'غير متاح'}
      </button>
    </div>
  )
}

// ─── Tab ────────────────────────────────────────────────────────────────────

export default function QuizzesTab({ courseId }: { courseId: number }) {
  const [quizzes, setQuizzes] = useState<StudentQuizSummary[]>([])
  const [grade, setGrade] = useState<FinalGradeBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [q, g] = await Promise.all([fetchStudentQuizzes(courseId), fetchStudentFinalGrade(courseId)])
      setQuizzes(q)
      setGrade(g)
    } catch {
      toast.error('تعذّر تحميل الاختبارات القصيرة')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [courseId])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
        {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-3xl bg-slate-100" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-deepBlue">الاختبارات القصيرة</h2>
        <button type="button" onClick={() => void load()} className="flex items-center gap-1 text-[11px] font-black text-deepBlue/40 hover:text-deepBlue">
          <RefreshCw className="h-3.5 w-3.5" /> تحديث
        </button>
      </div>

      {grade && <FinalGradeCard breakdown={grade} />}

      {quizzes.length === 0 ? (
        <EmptyHint icon={ListChecks} title="لا توجد اختبارات قصيرة" description="سيظهر هنا أي اختبار قصير يضيفه المدرب" />
      ) : (
        <div className="space-y-2">
          {quizzes.map((q) => (
            <QuizRow key={q.id} quiz={q} onOpen={() => setActiveQuizId(q.id)} />
          ))}
        </div>
      )}

      {activeQuizId && (
        <TakeQuizModal
          quizId={activeQuizId}
          onClose={() => setActiveQuizId(null)}
          onSubmitted={() => void load()}
        />
      )}
    </div>
  )
}
