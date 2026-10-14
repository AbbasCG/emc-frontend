import { CheckCircle2, CircleDot, Lock, MessageSquare, Send, TriangleAlert, XCircle } from 'lucide-react'
import type { TicketActivityLog } from '@/types/ticket'
import { cn } from '@/lib/utils'
import { InternalMark } from './TicketBadges'
import { STATUS_LABELS, TIMELINE_META, formatDateTime } from './ticketOpsUi'

const TONE = {
  info: { dot: 'bg-sky-100 text-sky-700', icon: CircleDot },
  good: { dot: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  bad: { dot: 'bg-rose-100 text-rose-700', icon: XCircle },
  warn: { dot: 'bg-amber-100 text-amber-700', icon: TriangleAlert },
  note: { dot: 'bg-slate-100 text-slate-600', icon: MessageSquare },
} as const

/** The chronological history of a ticket, oldest first, from the activity log the server sent for THIS viewer. */
export function TicketActivityTimeline({ logs }: { logs: TicketActivityLog[] }) {
  // Stable order: by time, then by id, so entries logged in the same second never swap places.
  const ordered = [...logs].sort((a, b) => Date.parse(a.logged_at) - Date.parse(b.logged_at) || a.id - b.id)

  if (ordered.length === 0) {
    return <p className="rounded-xl bg-slate-50 p-4 text-center text-[12px] font-bold text-deepBlue/50">لا يوجد سجل نشاط لهذه التذكرة بعد.</p>
  }

  return (
    <ol className="relative space-y-4" aria-label="سجل نشاط التذكرة" data-testid="ticket-timeline">
      {ordered.map((log) => {
        const meta = TIMELINE_META[log.action] ?? { label: log.action, tone: 'info' as const }
        const tone = TONE[meta.tone]
        const Icon = log.action === 'INTERNAL_NOTE' ? Lock : log.action === 'SUBMITTED' ? Send : tone.icon
        const changed = log.previous_state && log.new_state && log.previous_state !== log.new_state

        return (
          <li key={log.id} className="flex gap-3" data-action={log.action}>
            <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full', tone.dot)}>
              <Icon size={13} aria-hidden="true" />
            </span>
            <div className={cn('min-w-0 flex-1 rounded-2xl border px-3.5 py-2.5', log.action === 'INTERNAL_NOTE' ? 'border-amber-200 bg-amber-50/60' : 'border-deepBlue/[0.07] bg-white')}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[12px] font-black text-deepBlue">{meta.label}</span>
                {log.action === 'INTERNAL_NOTE' ? <InternalMark /> : null}
                {changed && log.action !== 'PRIORITY_CHANGED' ?
                  <span className="text-[11px] font-semibold text-deepBlue/45">{STATUS_LABELS[log.previous_state!] ?? log.previous_state} ← {STATUS_LABELS[log.new_state!] ?? log.new_state}</span>
                : null}
                <time dateTime={log.logged_at} className="ms-auto text-[11px] font-semibold text-deepBlue/45">{formatDateTime(log.logged_at)}</time>
              </div>
              {log.details ? <p className="mt-1 whitespace-pre-wrap break-words text-[12px] font-semibold leading-relaxed text-deepBlue/75">{log.details}</p> : null}
              {log.performed_by_name ? <p className="mt-1 text-[11px] font-bold text-deepBlue/45">{log.performed_by_name}</p> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
