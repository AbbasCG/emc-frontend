import { Star } from 'lucide-react'
import type { QuestionAnalytics } from '@/api/formsAnalyticsApi'

const pct = (v: number | null) => (v === null ? '—' : `${Number.isInteger(v) ? v : v.toFixed(1)}%`)

/** One labelled bar: the label and the value are text, the bar beside them only shows the share. */
function ShareBar({ label, count, percent, muted = false }: { label: string; count: number; percent: number | null; muted?: boolean }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1" title={`${label}: ${count} (${pct(percent)})`}>
      <span className={`truncate text-xs font-bold ${muted ? 'text-slate-400' : 'text-deepBlue'}`}>{label}</span>
      <span className="text-[11px] font-bold tabular-nums text-slate-500">{count} · {pct(percent)}</span>
      <span className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <span className={`block h-full rounded-full ${muted ? 'bg-slate-300' : 'bg-customBlue'}`} style={{ width: `${Math.max(0, Math.min(100, percent ?? 0))}%` }} />
      </span>
    </li>
  )
}

const KIND_NOTE: Record<string, string> = {
  count: 'إجابات نصية: تُعدّ هنا ولا تُعرض. اقرأها في جدول الإرسالات.',
  consent: 'عدد من وافقوا.',
  files: 'عدد الردود التي أُرفق فيها ملف.',
}

/** A question's summary: how many could and did answer it, then what they answered, by the kind of question. */
export default function QuestionAnalyticsCard({ question }: { question: QuestionAnalytics }) {
  const s = question.stats

  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 text-right shadow-md ring-1 ring-deepBlue/[0.06]" data-testid="question-analytics">
      <header>
        <h4 className="text-sm font-black leading-6 text-deepBlue">{question.label}</h4>
        <p className="mt-1 text-[11px] font-semibold text-slate-500">
          أجاب {question.answered} من {question.eligible}
          {question.answer_rate !== null && <> · نسبة الإجابة {pct(question.answer_rate)}</>}
          {question.removed && <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 font-black text-slate-500">محذوف من النموذج الحالي</span>}
        </p>
      </header>

      <div className="mt-4">
        {s.kind === 'choice' && (
          <>
            <ul className="grid gap-2.5">
              {s.options.map((o) => (
                <ShareBar key={o.value} label={o.retired ? `${o.label} (خيار سابق)` : o.label} count={o.count} percent={o.percent} muted={o.retired} />
              ))}
            </ul>
            {s.multiple && <p className="mt-3 text-[11px] font-semibold text-slate-400">يمكن اختيار أكثر من خيار، لذلك قد يتجاوز مجموع النسب 100%.</p>}
          </>
        )}

        {s.kind === 'numeric' && (
          <>
            <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
              <div>
                <p className="text-[10px] font-black text-slate-400">المتوسط</p>
                <p className="flex items-center gap-1 text-2xl font-black tabular-nums text-deepBlue">
                  {s.average ?? '—'}
                  {question.type === 'star_rating' && s.average !== null && <Star size={16} aria-hidden className="fill-customOrange text-customOrange" />}
                  {s.scale && s.average !== null && <span className="text-xs font-bold text-slate-400">/ {s.scale.max}</span>}
                </p>
              </div>
              <p className="text-[11px] font-bold text-slate-500">الأدنى {s.min ?? '—'} · الأعلى {s.max ?? '—'}</p>
            </div>
            {s.distribution && s.distribution.length > 0 && (
              <ul className="mt-4 grid gap-2.5">
                {s.distribution.map((d) => (
                  <ShareBar key={d.value} label={question.type === 'star_rating' ? `${d.value} نجوم` : d.value} count={d.count} percent={d.percent} />
                ))}
              </ul>
            )}
            {s.distribution === null && <p className="mt-3 text-[11px] font-semibold text-slate-400">القيم متنوعة جداً لعرض توزيعها.</p>}
          </>
        )}

        {s.kind === 'range' && (
          <p className="text-xs font-bold text-deepBlue">
            من <span className="tabular-nums" dir="ltr">{s.earliest ?? '—'}</span> إلى <span className="tabular-nums" dir="ltr">{s.latest ?? '—'}</span>
          </p>
        )}

        {(s.kind === 'count' || s.kind === 'consent' || s.kind === 'files') && (
          <p className="text-[11px] font-semibold text-slate-500">{KIND_NOTE[s.kind]}</p>
        )}
      </div>
    </article>
  )
}
