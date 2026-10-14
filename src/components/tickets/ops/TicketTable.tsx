import { useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Columns3, Paperclip, RotateCcw, UserPlus, XCircle } from 'lucide-react'
import type { Ticket } from '@/types/ticket'
import type { TicketFilters, TicketSortKey } from '@/types/ticketOps'
import { cn } from '@/lib/utils'
import { CategoryPill, DeadlineText, PriorityPill, StatusPill } from './TicketBadges'
import { COLUMNS, DEFAULT_COLUMNS, saveColumns, type ColumnKey } from './ticketColumns'
import { ageText, formatDateTime } from './ticketOpsUi'

export type RowAction = 'approve' | 'reject' | 'reassign'

const stop = (e: React.SyntheticEvent) => e.stopPropagation()

/** Quick actions allowed by the server's capabilities for THIS user and ticket. Pressing one never opens the ticket. */
export function RowActions({ ticket, onAction }: { ticket: Ticket; onAction: (a: RowAction, t: Ticket) => void }) {
  const c = ticket.capabilities
  if (!c || (!c.approve && !c.reject && !c.reassign)) return null
  const btn = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40'

  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={stop}>
      {c.approve ?
        <button type="button" onClick={() => onAction('approve', ticket)} className={cn(btn, 'bg-emerald-600 text-white hover:bg-emerald-700')} aria-label={`اعتماد التذكرة ${ticket.ticket_number}`}>
          <CheckCircle2 size={12} aria-hidden="true" /> اعتماد
        </button>
      : null}
      {c.reject ?
        <button type="button" onClick={() => onAction('reject', ticket)} className={cn(btn, 'border border-rose-300 text-rose-700 hover:bg-rose-50')} aria-label={`رفض التذكرة ${ticket.ticket_number}`}>
          <XCircle size={12} aria-hidden="true" /> رفض
        </button>
      : null}
      {c.reassign ?
        <button type="button" onClick={() => onAction('reassign', ticket)} className={cn(btn, 'border border-indigo-300 text-indigo-700 hover:bg-indigo-50')} aria-label={`${ticket.assignee ? 'إعادة توجيه' : 'تعيين'} التذكرة ${ticket.ticket_number}`}>
          {ticket.assignee ? <RotateCcw size={12} aria-hidden="true" /> : <UserPlus size={12} aria-hidden="true" />}
          {ticket.assignee ? 'إعادة توجيه' : 'تعيين'}
        </button>
      : null}
    </div>
  )
}

function Cell({ col, t }: { col: ColumnKey; t: Ticket }) {
  switch (col) {
    case 'category':
      return <CategoryPill category={t.ticket_category} />
    case 'priority':
      return <PriorityPill priority={t.priority} />
    case 'status':
      return <StatusPill status={t.status} />
    case 'department':
      return (
        <div className="min-w-0 text-[12px] font-bold text-deepBlue/80">
          <span className="block max-w-[140px] truncate" title={t.department?.name_ar}>{t.department?.name_ar ?? '—'}</span>
          {t.unit ? <span className="block max-w-[140px] truncate text-[11px] font-semibold text-deepBlue/45">{t.unit.name_ar}</span> : null}
        </div>
      )
    case 'assignee':
      return t.assignee ?
          <span className="block max-w-[130px] truncate text-[12px] font-bold text-deepBlue/80" title={t.assignee.name}>{t.assignee.name}</span>
        : <span className="text-[12px] font-bold text-violet-700">غير مُسنَدة</span>
    case 'reporter':
      return <span className="block max-w-[130px] truncate text-[12px] font-semibold text-deepBlue/70" title={t.created_by_name}>{t.created_by_name || '—'}</span>
    case 'created':
      return <span className="whitespace-nowrap text-[12px] font-semibold text-deepBlue/70" title={formatDateTime(t.created_at)}>{ageText(t.created_at) || formatDateTime(t.created_at)}</span>
    case 'activity':
      return <span className="whitespace-nowrap text-[12px] font-semibold text-deepBlue/70" title={formatDateTime(t.last_activity_at)}>{ageText(t.last_activity_at) || '—'}</span>
    case 'deadline':
      return <DeadlineText ticket={t} />
  }
}

interface Props {
  tickets: Ticket[]
  filters: TicketFilters
  columns: ColumnKey[]
  onSort: (key: TicketSortKey) => void
  selected: Set<number>
  onToggle: (id: number) => void
  onToggleAll: (ids: number[], on: boolean) => void
  activeId: number | null
  onOpen: (id: number) => void
  onAction: (a: RowAction, t: Ticket) => void
  /** Mobile layout: one card per ticket instead of a table. */
  compact?: boolean
}

export function ColumnMenu({ columns, onColumns }: { columns: ColumnKey[]; onColumns: (c: ColumnKey[]) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="true" className="inline-flex items-center gap-1.5 rounded-lg border border-deepBlue/10 bg-white px-3 py-1.5 text-[12px] font-black text-deepBlue hover:border-customBlue/40">
        <Columns3 size={14} aria-hidden="true" /> الأعمدة
      </button>
      {open ?
        <div role="group" aria-label="الأعمدة الظاهرة" className="absolute end-0 z-20 mt-2 w-48 space-y-1 rounded-2xl border border-deepBlue/10 bg-white p-3 shadow-lg">
          {COLUMNS.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center gap-2 text-[12px] font-bold text-deepBlue">
              <input
                type="checkbox"
                checked={columns.includes(c.key)}
                onChange={(e) => {
                  const next = e.target.checked ? COLUMNS.map((x) => x.key).filter((k) => k === c.key || columns.includes(k)) : columns.filter((k) => k !== c.key)
                  if (next.length === 0) return
                  onColumns(next)
                  saveColumns(next)
                }}
                className="accent-customBlue"
              />
              {c.label}
            </label>
          ))}
          <button type="button" onClick={() => { onColumns(DEFAULT_COLUMNS); saveColumns(DEFAULT_COLUMNS) }} className="mt-1 text-[11px] font-black text-customBlue">
            الافتراضي
          </button>
        </div>
      : null}
    </div>
  )
}

export function TicketTable({ tickets, filters, columns, onSort, selected, onToggle, onToggleAll, activeId, onOpen, onAction, compact = false }: Props) {
  const visible = COLUMNS.filter((c) => columns.includes(c.key))
  const ids = tickets.map((t) => t.id)
  const allOn = ids.length > 0 && ids.every((id) => selected.has(id))

  if (compact) {
    return (
      <ul className="space-y-3" aria-label="قائمة التذاكر">
        {tickets.map((t) => (
          <li key={t.id} className={cn('rounded-2xl border bg-white p-4 shadow-sm', activeId === t.id ? 'border-customBlue' : 'border-deepBlue/[0.08]')} data-testid="ticket-card" data-ticket-id={t.id}>
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => onToggle(t.id)} aria-label={`تحديد التذكرة ${t.ticket_number}`} className="mt-1 h-4 w-4 accent-customBlue" />
              <button type="button" onClick={() => onOpen(t.id)} aria-label={`فتح التذكرة ${t.ticket_number}`} className="min-w-0 flex-1 text-start">
                <span className="block font-mono text-[11px] font-black text-customBlue">{t.ticket_number}</span>
                <span className="mt-0.5 line-clamp-2 block text-sm font-black text-deepBlue">{t.title}</span>
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <StatusPill status={t.status} />
              <PriorityPill priority={t.priority} />
              <CategoryPill category={t.ticket_category} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
              <div><dt className="font-semibold text-deepBlue/45">الإدارة</dt><dd className="truncate font-bold text-deepBlue/80">{t.department?.name_ar ?? '—'}</dd></div>
              <div><dt className="font-semibold text-deepBlue/45">المكلف</dt><dd className="truncate font-bold text-deepBlue/80">{t.assignee?.name ?? 'غير مُسنَدة'}</dd></div>
              <div className="col-span-2"><dt className="font-semibold text-deepBlue/45">الموعد المتوقع</dt><dd><DeadlineText ticket={t} /></dd></div>
            </dl>
            <div className="mt-3"><RowActions ticket={t} onAction={onAction} /></div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-3xl border border-deepBlue/[0.07] bg-white shadow-sm">
        <table className="w-full text-start text-sm" aria-label="قائمة التذاكر">
          <thead>
            <tr className="border-b border-deepBlue/[0.07] bg-slate-50/80 text-[11px] font-black text-deepBlue/60">
              <th scope="col" className="w-10 px-3 py-3">
                <input type="checkbox" checked={allOn} onChange={(e) => onToggleAll(ids, e.target.checked)} aria-label="تحديد كل تذاكر هذه الصفحة" className="h-4 w-4 accent-customBlue" />
              </th>
              <th scope="col" className="px-3 py-3 text-start">
                <SortHead label="التذكرة" sort="ticket_number" filters={filters} onSort={onSort} />
              </th>
              {visible.map((c) => (
                <th key={c.key} scope="col" className="px-3 py-3 text-start" aria-sort={c.sort && filters.sort === c.sort ? (filters.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sort ? <SortHead label={c.label} sort={c.sort} filters={filters} onSort={onSort} /> : c.label}
                </th>
              ))}
              <th scope="col" className="px-3 py-3 text-start">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-deepBlue/[0.05]">
            {tickets.map((t) => (
              <tr
                key={t.id}
                onClick={() => onOpen(t.id)}
                data-testid="ticket-row"
                data-ticket-id={t.id}
                data-active={activeId === t.id || undefined}
                className={cn('cursor-pointer align-top transition hover:bg-customBlue/[0.04]', activeId === t.id && 'bg-customBlue/[0.07]', selected.has(t.id) && 'bg-customBlue/[0.05]', t.is_delayed && 'border-s-2 border-s-rose-400')}
              >
                <td className="px-3 py-3" onClick={stop}>
                  <input type="checkbox" checked={selected.has(t.id)} onChange={() => onToggle(t.id)} aria-label={`تحديد التذكرة ${t.ticket_number}`} className="h-4 w-4 accent-customBlue" />
                </td>
                <td className="max-w-[340px] px-3 py-3">
                  <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(t.id) }} aria-label={`فتح التذكرة ${t.ticket_number}`} className="block w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40">
                    <span className="block font-mono text-[11px] font-black text-customBlue">{t.ticket_number}</span>
                    <span className="mt-0.5 block truncate text-[13px] font-black text-deepBlue" title={t.title}>{t.title}</span>
                  </button>
                  {t.attachments_count ? <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-deepBlue/45"><Paperclip size={10} aria-hidden="true" />{t.attachments_count}</span> : null}
                </td>
                {visible.map((c) => (
                  <td key={c.key} className="px-3 py-3"><Cell col={c.key} t={t} /></td>
                ))}
                <td className="px-3 py-3"><RowActions ticket={t} onAction={onAction} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortHead({ label, sort, filters, onSort }: { label: string; sort: TicketSortKey; filters: TicketFilters; onSort: (k: TicketSortKey) => void }) {
  const active = filters.sort === sort
  const Icon = !active ? ArrowUpDown : filters.dir === 'asc' ? ArrowUp : ArrowDown

  return (
    <button type="button" onClick={() => onSort(sort)} className={cn('inline-flex items-center gap-1 font-black hover:text-customBlue focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40', active && 'text-customBlue')} aria-label={`ترتيب حسب ${label}`}>
      {label}
      <Icon size={12} aria-hidden="true" />
    </button>
  )
}
