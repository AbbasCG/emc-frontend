import type { Ticket, TicketStatus } from '@/types/ticket'
import type { BoardColumn } from '@/types/ticketOps'
import { cn } from '@/lib/utils'
import { CategoryPill, DeadlineText, PriorityPill } from './TicketBadges'
import { RowActions, type RowAction } from './TicketTable'
import { STATUS_META, ageText } from './ticketOpsUi'

function Card({ t, onOpen, onAction, active }: { t: Ticket; onOpen: (id: number) => void; onAction: (a: RowAction, t: Ticket) => void; active: boolean }) {
  return (
    <li className={cn('rounded-2xl border bg-white p-3 shadow-sm transition hover:shadow-md', active ? 'border-customBlue' : 'border-deepBlue/[0.08]', t.is_delayed && 'border-s-4 border-s-rose-400')} data-testid="board-card" data-ticket-id={t.id}>
      <button type="button" onClick={() => onOpen(t.id)} aria-label={`فتح التذكرة ${t.ticket_number}`} className="block w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40">
        <span className="block font-mono text-[11px] font-black text-customBlue">{t.ticket_number}</span>
        <span className="mt-0.5 line-clamp-2 block text-[13px] font-black leading-snug text-deepBlue">{t.title}</span>
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityPill priority={t.priority} />
        <CategoryPill category={t.ticket_category} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-deepBlue/55">
        <span className="min-w-0 truncate">{t.assignee?.name ?? 'غير مُسنَدة'}</span>
        <span className="shrink-0">{ageText(t.created_at)}</span>
      </div>
      <div className="mt-1.5"><DeadlineText ticket={t} /></div>
      <div className="mt-2"><RowActions ticket={t} onAction={onAction} /></div>
    </li>
  )
}

/**
 * The same tickets, grouped by workflow status. Counts are exact; each column shows only its first
 * cards (most urgent first), so the board never loads an unbounded list. Moving a ticket between
 * columns is done with the explicit actions on the card (approve, reject, reassign), not by dragging:
 * each transition needs a reason, a deadline or an assignee, and the server decides if it is allowed.
 */
export function TicketKanbanBoard({
  columns,
  loading,
  activeId,
  onOpen,
  onAction,
  onShowAll,
}: {
  columns: BoardColumn[]
  loading: boolean
  activeId: number | null
  onOpen: (id: number) => void
  onAction: (a: RowAction, t: Ticket) => void
  onShowAll: (status: TicketStatus) => void
}) {
  return (
    <div className={cn('overflow-x-auto pb-2 transition-opacity', loading && 'opacity-60')} aria-busy={loading} data-testid="kanban-board">
      <div className="flex min-w-max gap-3">
        {columns.map((col) => {
          const meta = STATUS_META[col.status]
          const more = col.count - col.tickets.length

          return (
            <section key={col.status} aria-label={`${meta?.label ?? col.status}: ${col.count}`} className={cn('flex w-[17rem] shrink-0 flex-col rounded-3xl border-t-4 bg-slate-50/80 p-3', meta?.column ?? 'border-slate-300')} data-status={col.status}>
              <header className="mb-3 flex items-center justify-between gap-2 px-1">
                <h3 className="text-[13px] font-black text-deepBlue">{meta?.label ?? col.status}</h3>
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-[12px] font-black text-deepBlue ring-1 ring-deepBlue/10" data-testid="column-count">{col.count}</span>
              </header>

              {col.tickets.length === 0 ?
                <p className="rounded-2xl border border-dashed border-deepBlue/15 p-4 text-center text-[12px] font-bold text-deepBlue/40">لا توجد تذاكر</p>
              : <ul className="space-y-2.5">{col.tickets.map((t) => <Card key={t.id} t={t} onOpen={onOpen} onAction={onAction} active={activeId === t.id} />)}</ul>}

              {more > 0 ?
                <button type="button" onClick={() => onShowAll(col.status)} className="mt-3 rounded-xl bg-white px-3 py-2 text-[12px] font-black text-customBlue ring-1 ring-customBlue/25 hover:bg-customBlue/[0.06]">
                  عرض الباقي ({more}) في الجدول
                </button>
              : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
