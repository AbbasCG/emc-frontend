import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import type { TicketPriority } from '@/types/ticket'
import type { TicketInsight } from '@/types/ticketOps'
import { apiMessage, changeTicketPriority } from '@/services/ticketOpsService'
import { useModalGuard } from '@/components/ui/modalGuard'
import toast from '@/lib/toast'
import { TICKET_PRIORITIES } from '@/utils/ticketFilters'
import { PriorityPill } from './TicketBadges'
import { PRIORITY_LABELS } from './ticketOpsUi'

/**
 * Change an open ticket's priority. Shown only when the server reports `change_priority` for this
 * user and ticket; the server checks it again on every request.
 *
 * A suggestion (from the insights) is advice with its reason. It is never applied for the person:
 * it only pre-selects the value, and nothing changes until they press the button.
 */
export function TicketPriorityControl({
  ticketId,
  current,
  suggestion,
  onChanged,
}: {
  ticketId: number
  current: TicketPriority
  suggestion?: TicketInsight['suggestedPriority']
  onChanged: () => void
}) {
  const [value, setValue] = useState<TicketPriority>(current)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unchanged = value === current
  useModalGuard('priority', { busy, dirty: !unchanged || reason.trim() !== '' })

  async function apply(next: TicketPriority) {
    if (busy || next === current) return
    setBusy(true)
    setError(null)
    try {
      await changeTicketPriority(ticketId, next, reason)
      toast.success(`تم تغيير الأولوية إلى ${PRIORITY_LABELS[next]}.`)
      setReason('')
      onChanged()
    } catch (e) {
      setError(apiMessage(e, 'تعذّر تغيير الأولوية.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="تغيير الأولوية" className="space-y-2.5 rounded-2xl border border-deepBlue/[0.07] bg-white p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[12px] font-black text-deepBlue">الأولوية</h4>
        <PriorityPill priority={current} />
      </div>

      {suggestion && suggestion.value !== current ?
        <div className="rounded-xl bg-violet-50 p-2.5 text-[12px] font-semibold leading-relaxed text-violet-900" data-testid="priority-suggestion">
          <p className="flex items-center gap-1.5 font-black"><Sparkles size={12} aria-hidden="true" /> اقتراح: رفع الأولوية إلى «{suggestion.label}»</p>
          <p className="mt-0.5 text-violet-900/80">{suggestion.reason}. القرار لك، ولن يتغير شيء قبل أن تضغط.</p>
          <button type="button" onClick={() => setValue(suggestion.value)} className="mt-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100">
            اختيار هذه الأولوية
          </button>
        </div>
      : null}

      <label className="block">
        <span className="sr-only">الأولوية الجديدة</span>
        <select value={value} onChange={(e) => setValue(e.target.value as TicketPriority)} className="w-full rounded-xl border border-deepBlue/10 bg-white px-3 py-2 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/15" aria-label="الأولوية الجديدة">
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
      </label>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        placeholder="سبب التغيير (اختياري)"
        aria-label="سبب تغيير الأولوية"
        className="w-full rounded-xl border border-deepBlue/10 bg-white px-3 py-2 text-[13px] font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/15"
      />
      {error ? <p role="alert" className="text-[12px] font-bold text-red-600">{error}</p> : null}
      <button type="button" disabled={busy || unchanged} aria-busy={busy} onClick={() => void apply(value)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customBlue px-3 py-2 text-[12px] font-black text-white transition hover:brightness-110 disabled:opacity-50">
        {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
        تغيير الأولوية
      </button>
    </section>
  )
}
