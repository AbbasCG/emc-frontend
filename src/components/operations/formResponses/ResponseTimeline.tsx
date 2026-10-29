import { useEffect, useState } from 'react'
import { parseFormActionError } from '@/api/formsAdminApi'
import { fetchResponseHistory } from '@/api/formsResponsesApi'
import type { CorrectionLine, HistoryLine } from '@/api/formsResponsesApi'
import { formatDateTime } from '@/utils/dateTime'

const show = (display: string | null, raw: string | string[] | null): string => display ?? (Array.isArray(raw) ? raw.join('، ') : raw ?? '')

function Correction({ c }: { c: CorrectionLine }) {
  const before = show(c.previous_display, c.previous)
  const after = show(c.new_display, c.new)

  return (
    <li className="rounded-lg bg-slate-50 p-2.5 text-[11px]" data-testid="correction">
      <p className="font-black text-deepBlue">{c.question_label ?? `سؤال ${c.question_id}`}</p>
      <p className="mt-1 break-words font-semibold">
        <span className="text-slate-500">قبل: </span>
        <span className="rounded bg-red-50 px-1 text-red-800 line-through">{before || 'فارغ'}</span>
        <span className="mx-1.5 text-slate-400" aria-hidden>←</span>
        <span className="text-slate-500">بعد: </span>
        <span className="rounded bg-emerald-50 px-1 text-emerald-800">{after || 'فارغ'}</span>
      </p>
      {c.reason && <p className="mt-1 font-bold text-slate-600">السبب: {c.reason}</p>}
    </li>
  )
}

function Line({ line }: { line: HistoryLine }) {
  const who = line.actor?.name ?? (line.type === 'submitted' ? 'المشارك' : 'موظف سابق')
  let detail: string | null = null
  if (line.type === 'status_changed') detail = `${line.from ?? '—'} ← ${line.to ?? '—'}`
  else if (line.type === 'assigned') detail = line.from ? `من ${line.from} إلى ${line.to}` : `إلى ${line.to}`
  else if (line.type === 'unassigned') detail = line.from ? `كان مُسنَداً إلى ${line.from}` : null

  return (
    <li className="relative ps-5" data-testid="history-line" data-type={line.type}>
      <span aria-hidden className="absolute start-0 top-1.5 h-2.5 w-2.5 rounded-full bg-customBlue" />
      <p className="text-sm font-black text-deepBlue">{line.label}{detail ? <span className="font-bold text-slate-600"> · {detail}</span> : null}</p>
      <p className="text-[11px] font-bold text-slate-500">{who} · {formatDateTime(line.created_at)}</p>
      {line.corrections.length > 0 && (
        <ul className="mt-2 grid gap-1.5">{line.corrections.map((c) => <Correction key={c.id} c={c} />)}</ul>
      )}
    </li>
  )
}

/**
 * The response's own history, oldest first: when it arrived, every status change and assignment, the notes that were added and
 * every correction with the value before and after. For reviewers only; the server refuses anyone else.
 */
export default function ResponseTimeline({ formId, responseId, version }: { formId: number; responseId: number; version: number }) {
  const [lines, setLines] = useState<HistoryLine[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchResponseHistory(formId, responseId)
        if (!cancelled) { setLines(next); setError(null) }
      } catch (e) {
        if (!cancelled) setError(parseFormActionError(e))
      }
    })()
    return () => { cancelled = true }
  }, [formId, responseId, version, attempt])

  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
        {error}
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="rounded-lg bg-white px-3 py-1 font-black text-red-700 ring-1 ring-red-200">إعادة المحاولة</button>
      </div>
    )
  }
  if (lines === null) return <p className="text-xs font-bold text-slate-500">جارٍ تحميل السجل...</p>

  return <ol className="grid gap-4 border-s-2 border-slate-100 ps-3" data-testid="response-history">{lines.map((l) => <Line key={`${l.type}-${l.id}`} line={l} />)}</ol>
}
