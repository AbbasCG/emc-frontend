import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, MinusCircle, Search, XCircle } from 'lucide-react'
import { fetchPlacementTestAnswers, type PlacementTestAnswerRow } from '@/api/placementApi'
import type { ReviewSubject } from './PlacementAnswerReviewModal'
import { WrittenExamOverview } from '@/components/instructor/placement/WrittenExamOverview'

type AnswerFilter = 'all' | 'correct' | 'wrong' | 'skipped'

function outcomeOf(a: PlacementTestAnswerRow): 'correct' | 'wrong' | 'skipped' {
  if (!a.student_answer) return 'skipped'
  return a.is_correct ? 'correct' : 'wrong'
}

/** Read-only written-exam review — question navigator, filters, search, one
 *  question at a time. Extracted from PlacementAnswerReviewModal so it can be
 *  embedded either inside that standalone modal or as a tab in a larger
 *  assessment dashboard, without duplicating the fetch/filter/navigate logic. */
export function PlacementAnswerReviewBody({
  subject,
  showOverview = false,
}: {
  subject: ReviewSubject
  /** When true, renders the premium written-exam summary banner above stats */
  showOverview?: boolean
}) {
  const attemptId = subject.attemptId

  const [answers, setAnswers] = useState<PlacementTestAnswerRow[] | null>(null)
  // Starts loading whenever there is an attempt to fetch on mount — the effect below
  // no longer flips it synchronously.
  const [loading, setLoading] = useState(Boolean(attemptId))
  const [filter, setFilter] = useState<AnswerFilter>('all')
  const [search, setSearch] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)

  // Reset the review state during render when the reviewed attempt changes
  // (react.dev "adjusting state when a prop changes") instead of one commit later.
  const [seenAttemptId, setSeenAttemptId] = useState(attemptId)
  if (seenAttemptId !== attemptId) {
    setSeenAttemptId(attemptId)
    if (attemptId) {
      setAnswers(null)
      setFilter('all')
      setSearch('')
      setActiveIdx(0)
      setLoading(true)
    }
  }

  useEffect(() => {
    if (!attemptId) return
    let cancelled = false
    fetchPlacementTestAnswers(attemptId)
      .then((data) => { if (!cancelled) setAnswers(data) })
      .catch(() => { if (!cancelled) setAnswers([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [attemptId])

  const stats = useMemo(() => {
    if (!answers) return { correct: 0, wrong: 0, skipped: 0, total: 0 }
    let correct = 0, wrong = 0, skipped = 0
    for (const a of answers) {
      const o = outcomeOf(a)
      if (o === 'correct') correct++
      else if (o === 'wrong') wrong++
      else skipped++
    }
    return { correct, wrong, skipped, total: answers.length }
  }, [answers])

  const filteredIndices = useMemo(() => {
    if (!answers) return []
    const q = search.trim().toLowerCase()
    return answers
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => {
        if (filter !== 'all' && outcomeOf(a) !== filter) return false
        if (q && !a.question_text.toLowerCase().includes(q)) return false
        return true
      })
      .map(({ i }) => i)
  }, [answers, filter, search])

  // Snap the active question back into the visible set whenever the filter/search
  // result changes — adjusted during render (react.dev) rather than from an effect.
  // `seen` starts as `null` so the very first pass still runs, matching the effect
  // that used to fire on mount.
  const filteredKey = filteredIndices.join(',')
  const [seenFilteredKey, setSeenFilteredKey] = useState<string | null>(null)
  if (seenFilteredKey !== filteredKey) {
    setSeenFilteredKey(filteredKey)
    if (filteredIndices.length > 0 && !filteredIndices.includes(activeIdx)) {
      setActiveIdx(filteredIndices[0])
    }
  }

  const posInFiltered = filteredIndices.indexOf(activeIdx)
  const current = answers && activeIdx >= 0 ? answers[activeIdx] : null
  const pct = subject.score != null && subject.totalQuestions > 0
    ? Math.round((subject.score / subject.totalQuestions) * 100)
    : null

  function goRelative(delta: number) {
    if (posInFiltered < 0 || filteredIndices.length === 0) return
    const next = posInFiltered + delta
    if (next < 0 || next >= filteredIndices.length) return
    setActiveIdx(filteredIndices[next])
  }

  if (loading || !answers) {
    return (
      <div className="flex flex-1 flex-col">
        {showOverview && subject.row && <WrittenExamOverview row={subject.row} />}
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0077B6]/20 border-t-[#0077B6]" />
        </div>
      </div>
    )
  }

  if (answers.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        {showOverview && subject.row && <WrittenExamOverview row={subject.row} />}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-20 text-center">
          <AlertCircle className="h-8 w-8 text-slate-300" />
          <p className="text-[13px] font-bold text-deepBlue/50">لا توجد إجابات متاحة لهذا الاختبار.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {showOverview && subject.row && (
        <WrittenExamOverview row={subject.row} liveStats={stats} />
      )}

      {/* Sticky stats row */}
      <div className="grid shrink-0 grid-cols-3 gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:grid-cols-6 sm:px-6">
        <StatChip label="أسئلة" value={stats.total} color="text-[#0C2A4B]" />
        <StatChip label="صحيحة" value={stats.correct} color="text-emerald-600" />
        <StatChip label="خاطئة" value={stats.wrong} color="text-rose-600" />
        <StatChip label="متروكة" value={stats.skipped} color="text-slate-500" />
        <StatChip label="الدرجة" value={subject.score ?? '—'} color="text-[#0077B6]" />
        <StatChip label="النسبة" value={pct != null ? `${pct}%` : '—'} color="text-[#F28C00]" />
      </div>

      {/* Filters + search */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-6">
        {([
          ['all', 'الكل'], ['correct', 'صحيحة'], ['wrong', 'خاطئة'], ['skipped', 'متروكة'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${
              filter === key ? 'bg-[#0C2A4B] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="relative mr-auto w-full max-w-[220px] sm:w-[220px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#0C2A4B]/35" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في نص السؤال..."
            dir="rtl"
            className="h-8 w-full rounded-full border border-slate-200 bg-white pe-3 ps-8 text-[11px] font-semibold text-[#0C2A4B] outline-none focus:border-[#0077B6]/40"
          />
        </div>
      </div>

      {/* Question navigator — wraps to multiple rows instead of scrolling
          horizontally, and caps height with a vertical scroll for very long
          tests so it never forces the modal itself to widen or scroll sideways. */}
      <div className="flex max-h-24 shrink-0 flex-wrap gap-1.5 overflow-y-auto border-b border-slate-100 px-4 py-2.5 sm:px-6">
        {answers.map((a, i) => {
          const outcome = outcomeOf(a)
          const dimmed = !filteredIndices.includes(i)
          const isActive = i === activeIdx
          return (
            <button
              key={a.question_id}
              type="button"
              onClick={() => setActiveIdx(i)}
              disabled={dimmed}
              title={`سؤال ${i + 1}`}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black tabular-nums transition ${
                dimmed ? 'opacity-25' : ''
              } ${isActive ? 'ring-2 ring-offset-1 ring-[#0C2A4B]' : ''} ${
                outcome === 'correct' ? 'bg-emerald-100 text-emerald-700'
                : outcome === 'wrong' ? 'bg-rose-100 text-rose-700'
                : 'bg-slate-100 text-slate-500'
              }`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Active question card */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        {!current ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <AlertCircle className="h-7 w-7 text-slate-300" />
            <p className="text-[12px] font-bold text-deepBlue/45">لا توجد أسئلة مطابقة للفلاتر.</p>
          </div>
        ) : (
          <motion.div
            key={current.question_id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.16 }}
            className={`rounded-2xl border p-4 sm:p-5 ${
              outcomeOf(current) === 'correct' ? 'border-emerald-200 bg-emerald-50/50'
              : outcomeOf(current) === 'wrong' ? 'border-rose-200 bg-rose-50/40'
              : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-deepBlue/40">
                سؤال {activeIdx + 1} من {answers.length}
              </p>
              <OutcomeBadge outcome={outcomeOf(current)} />
            </div>
            <p dir="ltr" className="mt-2 text-right text-[16px] font-black leading-relaxed text-[#0F172A]">
              {current.question_text}
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(Object.entries(current.options) as [string, string][]).map(([key, text]) => {
                const isStudent = current.student_answer?.toLowerCase() === key.toLowerCase()
                const isCorrectOpt = current.correct_answer?.toLowerCase() === key.toLowerCase()
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold ${
                      isCorrectOpt ? 'border-emerald-300 bg-emerald-100/70 text-emerald-800'
                      : isStudent ? 'border-rose-300 bg-rose-100/70 text-rose-800'
                      : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-black/5 text-[10px] font-black uppercase">
                      {key}
                    </span>
                    <span dir="ltr" className="flex-1 text-right">{text}</span>
                    {isCorrectOpt && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                    {isStudent && !isCorrectOpt && <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />}
                  </div>
                )
              })}
            </div>

            {current.score_contribution != null && (
              <p className="mt-3 text-[11px] font-bold text-deepBlue/50">
                النقاط: <span className="font-mono tabular-nums text-deepBlue">{current.score_contribution}</span>
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => goRelative(-1)}
          disabled={posInFiltered <= 0}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-black text-deepBlue/70 transition hover:bg-slate-50 disabled:opacity-35"
        >
          <ChevronRight className="h-4 w-4" />
          السابق
        </button>
        <p className="font-mono text-[11px] font-black tabular-nums text-deepBlue/40">
          {posInFiltered >= 0 ? posInFiltered + 1 : 0} / {filteredIndices.length}
        </p>
        <button
          type="button"
          onClick={() => goRelative(1)}
          disabled={posInFiltered < 0 || posInFiltered >= filteredIndices.length - 1}
          className="flex items-center gap-1.5 rounded-xl bg-[#0C2A4B] px-4 py-2 text-[12px] font-black text-white transition hover:brightness-110 disabled:opacity-35"
        >
          التالي
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center">
      <p className={`font-mono text-[15px] font-black tabular-nums ${color}`}>{value}</p>
      <p className="mt-0.5 text-[9px] font-bold text-deepBlue/35">{label}</p>
    </div>
  )
}

function OutcomeBadge({ outcome }: { outcome: 'correct' | 'wrong' | 'skipped' }) {
  if (outcome === 'correct') {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> صحيحة
      </span>
    )
  }
  if (outcome === 'wrong') {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black text-rose-700">
        <XCircle className="h-3 w-3" /> خاطئة
      </span>
    )
  }
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
      <MinusCircle className="h-3 w-3" /> متروكة
    </span>
  )
}
