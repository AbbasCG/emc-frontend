import type { Ticket, TicketStatus } from '@/types/ticket'
import type { BoardColumn } from '@/types/ticketOps'
import StatusBoard from '@/components/ui/StatusBoard'
import { cn } from '@/lib/utils'
import { CategoryPill, DeadlineText, PriorityPill } from './TicketBadges'
import { RowActions, type RowAction } from './TicketTable'
import { STATUS_META, ageText } from './ticketOpsUi'

function Card({ t, onOpen, onAction, onConfirmed, active }: { t: Ticket; onOpen: (id: number) => void; onAction: (a: RowAction, t: Ticket) => void; onConfirmed?: () => void; active: boolean }) {
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
      <div className="mt-2"><RowActions ticket={t} onAction={onAction} onConfirmed={onConfirmed} /></div>
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
  onConfirmed,
  onShowAll,
}: {
  columns: BoardColumn[]
  loading: boolean
  activeId: number | null
  onOpen: (id: number) => void
  onAction: (a: RowAction, t: Ticket) => void
  onConfirmed?: () => void
  onShowAll: (status: TicketStatus) => void
}) {
  return (
    <div className={cn('transition-opacity', loading && 'opacity-60')} aria-busy={loading} data-testid="kanban-board">
      <StatusBoard
        ariaLabel="حالات التذاكر"
        testId="ticket-status-board"
        emptyText="لا توجد تذاكر"
        columns={columns.map((col) => {
          const meta = STATUS_META[col.status]
          const more = col.count - col.tickets.length

          return {
            key: col.status,
            label: meta?.label ?? col.status,
            count: col.count,
            className: cn('border-t-4', meta?.column ?? 'border-slate-300'),
            children: (
              <>
                <ul className="space-y-2.5">
                  {col.tickets.map((t) => (
                    <Card key={t.id} t={t} onOpen={onOpen} onAction={onAction} onConfirmed={onConfirmed} active={activeId === t.id} />
                  ))}
                </ul>
                {more > 0 ?
                  <button type="button" onClick={() => onShowAll(col.status)} className="w-full rounded-xl bg-white px-3 py-2 text-[12px] font-black text-customBlue ring-1 ring-customBlue/25 hover:bg-customBlue/[0.06]">
                    عرض الباقي ({more}) في الجدول
                  </button>
                : null}
              </>
            ),
          }
        })}
      />
    </div>
  )
}
