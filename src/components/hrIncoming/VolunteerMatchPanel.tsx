import { useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, Loader2, Lock, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import {
  classifyIncomingError,
  fetchVolunteerMatches,
  type MatchResult,
  type VolunteerMatch,
} from '@/api/hrIncomingRequestsApi'
import { cn } from '@/lib/utils'
import { MIN_SCORE_OPTIONS, scoreTone } from './hrIncomingUi'

type Phase = 'idle' | 'loading' | 'done' | 'forbidden' | 'error'

function CandidateCard({ c }: { c: VolunteerMatch }) {
  const tone = scoreTone(c.score)

  return (
    <li data-testid="match-candidate" className="space-y-2.5 rounded-2xl border border-deepBlue/[0.07] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-deepBlue">{c.name}</p>
          <p className="text-[11px] font-bold text-deepBlue/50">{c.statusLabel}{c.desiredDepartment ? ` · ${c.desiredDepartment}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-black ring-1', tone.badge)} data-testid="match-label">{c.label}</span>
          <span className="rounded-full bg-deepBlue/[0.06] px-2.5 py-1 text-[11px] font-black text-deepBlue" data-testid="match-score" aria-label={`الدرجة ${c.score} من 100`}>{c.score}/100</span>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-deepBlue/[0.07]" aria-hidden="true">
        <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${c.score}%` }} />
      </div>

      {c.matchedSkills.length > 0 ?
        <div className="flex flex-wrap items-center gap-1.5" data-testid="matched-skills">
          <span className="text-[11px] font-black text-emerald-700">مهارات مطابقة:</span>
          {c.matchedSkills.map((s) => <span key={s} className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{s}</span>)}
        </div>
      : null}
      {c.missingSkills.length > 0 ?
        <div className="flex flex-wrap items-center gap-1.5" data-testid="missing-skills">
          <span className="text-[11px] font-black text-amber-800">مهارات ناقصة:</span>
          {c.missingSkills.map((s) => <span key={s} className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">{s}</span>)}
        </div>
      : null}

      {c.reasons.length > 0 ?
        <ul className="list-disc space-y-0.5 ps-5 text-xs font-semibold leading-relaxed text-deepBlue/70">
          {c.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      : null}
      {c.warnings.length > 0 ?
        <ul className="space-y-0.5 text-[11px] font-bold text-amber-800">
          {c.warnings.map((w) => <li key={w} className="flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />{w}</li>)}
        </ul>
      : null}

      <Link to={c.url} className="inline-flex items-center gap-1.5 rounded-xl border border-customBlue/30 px-3.5 py-2 text-xs font-black text-customBlue transition hover:bg-customBlue/[0.06]">
        {c.actionLabel === 'مراجعة المرشح' ? 'مراجعة الطلب' : c.actionLabel}
      </Link>
    </li>
  )
}

/**
 * «المرشحون المحتملون». Matching runs on the server when HR asks for it and is not stored:
 * the client never downloads the applications and never scores anything itself.
 */
export function VolunteerMatchPanel({
  requestId,
  canMatch,
  canCreateDraft,
  hasDraft,
  onDraft,
  onResult,
}: {
  requestId: number
  canMatch: boolean
  canCreateDraft: boolean
  hasDraft: boolean
  onDraft: () => void
  onResult: (found: number) => void
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [minScore, setMinScore] = useState(45)
  const [result, setResult] = useState<MatchResult | null>(null)

  async function run(score: number = minScore) {
    setPhase('loading')
    try {
      const res = await fetchVolunteerMatches(requestId, score)
      setResult(res)
      setPhase('done')
      onResult(res.candidates.length)
    } catch (e) {
      setPhase(classifyIncomingError(e) === 'forbidden' ? 'forbidden' : 'error')
    }
  }

  function changeMin(value: number) {
    setMinScore(value)
    if (phase === 'done' || phase === 'error') void run(value)
  }

  return (
    <section aria-label="المرشحون المحتملون" className="space-y-3 rounded-3xl border border-deepBlue/[0.07] bg-slate-50/60 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-deepBlue">المرشحون المحتملون</h3>
        {canMatch ?
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`min-score-${requestId}`}>الحد الأدنى للدرجة</label>
            <select id={`min-score-${requestId}`} value={minScore} onChange={(e) => changeMin(Number(e.target.value))} className="rounded-xl border border-deepBlue/10 bg-white px-2.5 py-2 text-xs font-bold text-deepBlue">
              {MIN_SCORE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              type="button"
              onClick={() => void run()}
              disabled={phase === 'loading'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue px-3.5 py-2 text-xs font-black text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
            >
              {phase === 'loading' ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : phase === 'done' ? <RefreshCw size={13} aria-hidden="true" /> : <Search size={13} aria-hidden="true" />}
              {phase === 'done' || phase === 'error' ? 'إعادة البحث' : 'البحث عن مرشحين'}
            </button>
          </div>
        : null}
      </header>

      {!canMatch ?
        <p className="flex items-center gap-2 text-xs font-bold text-deepBlue/55"><Lock size={13} aria-hidden="true" /> البحث عن مرشحين متاح لفريق الموارد البشرية فقط.</p>
      : phase === 'idle' ?
        <p className="text-xs font-bold text-deepBlue/55">لم يتم البحث عن مرشحين بعد. يقارن البحث الطلب بطلبات التطوع الحالية ويُظهر سبب كل ترشيح.</p>
      : phase === 'loading' ?
        <p role="status" className="flex items-center gap-2 text-xs font-bold text-deepBlue/60"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> جاري البحث…</p>
      : phase === 'forbidden' ?
        <p role="alert" className="flex items-center gap-2 text-xs font-bold text-red-700"><Lock size={13} aria-hidden="true" /> لا تملك صلاحية البحث عن مرشحين.</p>
      : phase === 'error' ?
        <p role="alert" className="flex items-center gap-2 text-xs font-bold text-red-700"><ShieldAlert size={13} aria-hidden="true" /> تعذّر البحث عن مرشحين. اضغط «إعادة البحث».</p>
      : result ?
        <div className="space-y-3">
          {result.candidates.length > 0 ?
            <>
              <p className="text-xs font-black text-emerald-700" role="status">تم العثور على {result.candidates.length} مرشح محتمل</p>
              <ul className="space-y-3">{result.candidates.map((c) => <CandidateCard key={c.id} c={c} />)}</ul>
            </>
          : <div className="space-y-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-4" data-testid="no-matches">
              <p className="text-sm font-black text-amber-900" role="status">لم يتم العثور على مرشح مناسب</p>
              <p className="text-xs font-semibold leading-relaxed text-amber-900/80">لا توجد طلبات تطوع حالية تطابق هذا الطلب بالدرجة المحددة. يمكنك إنشاء مسودة فرصة تطوعية ومراجعتها قبل أي نشر مستقبلي.</p>
              {canCreateDraft && !hasDraft ?
                <button type="button" onClick={onDraft} className="rounded-xl bg-customOrange px-4 py-2 text-xs font-black text-white shadow-sm transition hover:brightness-105">
                  إنشاء مسودة فرصة
                </button>
              : null}
            </div>}

          {result.meta.limitations.length > 0 ?
            <details className="text-[11px] font-semibold text-deepBlue/55">
              <summary className="cursor-pointer font-black">ما الذي لا تغطيه الدرجة؟</summary>
              <ul className="mt-1 list-disc space-y-0.5 ps-5">{result.meta.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
            </details>
          : null}
          <p className="text-[10px] font-bold text-deepBlue/40">نتائج مباشرة وغير محفوظة · تُقيَّم {result.meta.evaluated} طلبًا</p>
        </div>
      : null}
    </section>
  )
}
