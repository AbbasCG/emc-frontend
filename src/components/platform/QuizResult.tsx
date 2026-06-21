import { motion } from 'framer-motion'
import { Award, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { QuizAttemptResult } from '@/types/platform'

type Props = {
  result: QuizAttemptResult
  courseId?: number | string
}

export default function QuizResult({ result, courseId = 1 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
    >
      <div
        className={[
          'relative px-8 py-10 text-white',
          result.passed
            ? 'bg-gradient-to-bl from-emerald-600 via-customBlue to-deepBlue'
            : 'bg-gradient-to-bl from-deepBlue via-ocean to-night',
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white/70">نتيجة الاختبار</p>
            <h2 className="mt-2 text-3xl font-black">{result.passed ? 'تم الاجتياز' : 'لم يتم الاجتياز'}</h2>
            <p className="mt-3 max-w-md text-sm font-bold text-white/85">
              درجتك {result.score}% — درجة النجاح {result.passing_score}%
            </p>
          </div>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            {result.passed ? <Award size={28} /> : <TrendingUp size={28} />}
          </span>
        </div>
      </div>
      <div className="grid gap-6 p-8 md:grid-cols-3">
        <div className="rounded-xl bg-[#F6F8FB] p-4 ring-1 ring-slate-100">
          <p className="text-[11px] font-black text-slate-400">إجابات صحيحة</p>
          <p className="mt-2 text-2xl font-black text-deepBlue">
            {result.correct_count}/{result.total}
          </p>
        </div>
        <div className="rounded-xl bg-[#F6F8FB] p-4 ring-1 ring-slate-100">
          <p className="text-[11px] font-black text-slate-400">الدرجة</p>
          <p className="mt-2 text-2xl font-black text-deepBlue">{result.score}%</p>
        </div>
        <div className="flex items-center justify-center">
          <Link
            to={`/dashboard/courses/${courseId}/modules`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-deepBlue px-4 py-3 text-sm font-black text-white shadow-lg transition hover:bg-deepBlue/90"
          >
            العودة إلى الوحدات
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
