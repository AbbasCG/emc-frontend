import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchQuiz, submitQuizAnswers } from '@/api/advancedLmsApi'
import QuizCard from '@/components/platform/QuizCard'
import QuizResult from '@/components/platform/QuizResult'
import EmptyState from '@/components/dashboard/EmptyState'
import type { LmsQuiz, QuizAttemptResult } from '@/types/platform'

export default function QuizTakePage() {
  const { quizId } = useParams()
  const qid = Number(quizId) || 1
  const [quiz, setQuiz] = useState<LmsQuiz | null>(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<QuizAttemptResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const q = await fetchQuiz(qid)
      if (!cancelled) setQuiz(q)
    })()
    return () => {
      cancelled = true
    }
  }, [qid])

  const current = quiz?.questions[step]

  const progress = useMemo(() => {
    if (!quiz?.questions.length) return 0
    return Math.round((step / quiz.questions.length) * 100)
  }, [quiz, step])

  async function submit() {
    if (!quiz) return
    setSubmitting(true)
    const res = await submitQuizAnswers(quiz.id, answers)
    setResult(res)
    setSubmitting(false)
  }

  if (!quiz) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  if (result) {
    return (
      <div className="mx-auto max-w-3xl py-6">
        <QuizResult result={result} courseId={quiz.course_id} />
      </div>
    )
  }

  if (!current) {
    return <EmptyState title="لا أسئلة في هذا الاختبار" />
  }

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-accent-700">Quiz</p>
          <h1 className="text-2xl font-black text-deepBlue">{quiz.title}</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">درجة النجاح {quiz.passing_score}%</p>
        </div>
        <Link to="/dashboard/learning" className="text-xs font-black text-customBlue hover:underline">
          مسار التعلّم
        </Link>
      </motion.div>

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-l from-deepBlue to-customBlue"
          animate={{ width: `${progress}%` }}
        />
      </div>

      <QuizCard
        index={step}
        total={quiz.questions.length}
        question={current}
        selected={answers[current.id] ?? null}
        onSelect={(choice) => setAnswers((prev) => ({ ...prev, [current.id]: choice }))}
      />

      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-deepBlue shadow-sm disabled:opacity-40"
        >
          السابق
        </button>
        {step < quiz.questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(quiz.questions.length - 1, s + 1))}
            className="rounded-xl bg-customBlue px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-40"
          >
            التالي
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting || Object.keys(answers).length < quiz.questions.length}
            onClick={() => void submit()}
            className="rounded-xl bg-customOrange px-6 py-3 text-sm font-black text-white shadow-lg disabled:opacity-40"
          >
            إرسال الإجابات
          </button>
        )}
      </div>
    </div>
  )
}
