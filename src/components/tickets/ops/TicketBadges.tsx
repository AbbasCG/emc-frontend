import { AlertTriangle, CalendarClock, Clock, Lock } from 'lucide-react'
import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from '@/types/ticket'
import { cn } from '@/lib/utils'
import { CATEGORY_META, DEADLINE_TONE, PRIORITY_META, STATUS_META, deadlineState, formatDateTime } from './ticketOpsUi'

const PILL = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ring-inset'

export function StatusPill({ status, className }: { status: TicketStatus; className?: string }) {
  const meta = STATUS_META[status]
  if (!meta) return <span className={cn(PILL, 'bg-slate-100 text-slate-600 ring-slate-200', className)}>{status}</span>

  return (
    <span className={cn(PILL, meta.badge, className)} data-status={status}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

export function PriorityPill({ priority, className }: { priority: TicketPriority; className?: string }) {
  const meta = PRIORITY_META[priority]
  if (!meta) return null

  return (
    <span className={cn(PILL, meta.badge, className)} data-priority={priority}>
      {priority === 'CRITICAL' ? <AlertTriangle size={11} aria-hidden="true" /> : null}
      {meta.label}
    </span>
  )
}

export function CategoryPill({ category, className }: { category: TicketCategory; className?: string }) {
  const meta = CATEGORY_META[category]
  if (!meta) return null

  return <span className={cn(PILL, meta.badge, className)}>{meta.label}</span>
}

/** A small "internal" mark for content only staff may read. */
export function InternalMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800 ring-1 ring-inset ring-amber-200', className)}>
      <Lock size={10} aria-hidden="true" /> داخلية
    </span>
  )
}

/** The expected-resolution time of a ticket, toned by how near it is. Text, not only colour. */
export function DeadlineText({ ticket, className }: { ticket: Pick<Ticket, 'status' | 'expected_resolution_time' | 'is_delayed'>; className?: string }) {
  const state = deadlineState(ticket)
  if (state === 'none') return <span className={cn('text-[11px] font-bold', DEADLINE_TONE.none, className)}>بلا موعد</span>
  if (state === 'closed') {
    return <span className={cn('text-[11px] font-bold', DEADLINE_TONE.closed, className)}>{ticket.expected_resolution_time ? formatDateTime(ticket.expected_resolution_time) : '—'}</span>
  }

  const Icon = state === 'overdue' ? AlertTriangle : state === 'soon' ? Clock : CalendarClock

  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-black', DEADLINE_TONE[state], className)} data-deadline={state}>
      <Icon size={12} aria-hidden="true" />
      {state === 'overdue' ? 'متأخرة · ' : state === 'soon' ? 'قريبًا · ' : ''}
      {formatDateTime(ticket.expected_resolution_time)}
    </span>
  )
}
