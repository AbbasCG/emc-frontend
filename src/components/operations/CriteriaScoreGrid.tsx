import { EVALUATION_CRITERIA, averageScore, type CriteriaScores } from '@/data/evaluationCriteria'

/**
 * شبكة معايير التقييم العشرة — لكل معيار صف من عشر خانات (1..10) يُختار
 * بنقرة واحدة. مشتركة بين تقرير الاجتماع وتقرير الإثنين حتى يتوحد القياس.
 */

function ScoreScale({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
}) {
  return (
    <div dir="ltr" className="flex items-center gap-[3px]" role="radiogroup" aria-label="الدرجة من 1 إلى 10">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = value != null && n <= value
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            title={String(n)}
            onClick={() => onChange(value === n ? undefined : n)}
            className={`h-5 w-5 rounded-[5px] text-[9px] font-black leading-none transition-colors ${
              active
                ? n >= 9
                  ? 'bg-emerald-500 text-white'
                  : n >= 7
                    ? 'bg-customBlue text-white'
                    : 'bg-amber-400 text-white'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

export default function CriteriaScoreGrid({
  scores,
  onChange,
}: {
  scores: CriteriaScores
  onChange: (next: CriteriaScores) => void
}) {
  const avg = averageScore(scores)

  function setScore(key: string, value: number | undefined) {
    const next = { ...scores }
    if (value == null) delete next[key]
    else next[key] = value
    onChange(next)
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-black text-slate-400">المعايير العشرة (1 إلى 10)</p>
        {avg != null && (
          <span
            className={`rounded-lg px-2.5 py-1 text-[11px] font-black tabular-nums ${
              avg >= 9 ? 'bg-emerald-100 text-emerald-700' : avg >= 7 ? 'bg-sky/60 text-deepBlue' : 'bg-amber-100 text-amber-700'
            }`}
          >
            المتوسط {avg}/10
          </span>
        )}
      </div>
      <div className="grid gap-x-8 gap-y-2 lg:grid-cols-2">
        {EVALUATION_CRITERIA.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-xs font-bold text-ink-600">{c.label}</span>
            <ScoreScale value={scores[c.key]} onChange={(v) => setScore(c.key, v)} />
          </div>
        ))}
      </div>
    </div>
  )
}
