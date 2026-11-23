import { Link } from 'react-router'
import { Building2, CalendarClock, CheckCircle2, Sparkles, Ticket as TicketIcon, User, XCircle, ClipboardList } from 'lucide-react'
import OpsPriorityBadge from '@/components/operations/OpsPriorityBadge'
import { formatDue } from '@/lib/dueDate'
import { creditedDurationText, formatEstimate, hasEstimate } from '@/lib/taskEstimate'
import { MY_WORK_PATH, type WorkItem } from '@/lib/myWork'
import { cn } from '@/lib/utils'

/**
 * One card of «مهامي ومسؤولياتي», for a task or a ticket (same layout, so the two read the same). Shared pieces:
 * priority, due date, assignee and the points/duration line. What differs: the «تذكرة» badge, where a click
 * leads (the task panel / the original ticket), and the accept / decline actions when the server allows them.
 */
export default function WorkItemCard({
  item,
  busy = false,
  onAccept,
  onReject,
  onOpenTask,
}: {
  item: WorkItem
  busy?: boolean
  onAccept?: (item: WorkItem) => void
  onReject?: (item: WorkItem) => void
  onOpenTask?: (item: WorkItem) => void
}) {
  const isTicket = item.kind === 'ticket'
  const estimateKnown = hasEstimate({ task_points: item.points, estimated_hours: item.hours })

  const heading = (
    <>
      {item.reference ? <span className="block font-mono text-[11px] font-black text-customBlue" dir="ltr">{item.reference}</span> : null}
      <span className="mt-0.5 block text-[13px] font-black leading-snug text-deepBlue">{item.title}</span>
    </>
  )
  const openCls = 'block w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40 rounded-lg'

  return (
    <article
      data-testid="work-item"
      data-kind={item.kind}
      data-key={item.key}
      data-column={item.column}
      className={cn(
        'min-w-0 rounded-2xl border bg-white p-3.5 shadow-sm transition hover:shadow-md',
        item.overdue ? 'border-rose-200 bg-rose-50/30' : 'border-deepBlue/[0.08]',
        item.column === 'pending' && 'border-customBlue/40 ring-1 ring-customBlue/20',
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black',
            isTicket ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' : 'bg-customBlue/10 text-customBlue ring-1 ring-customBlue/20',
          )}
          data-testid="kind-badge"
        >
          {isTicket ? <TicketIcon size={10} aria-hidden="true" /> : <ClipboardList size={10} aria-hidden="true" />}
          {isTicket ? 'تذكرة' : 'مهمة'}
        </span>
        <OpsPriorityBadge p={item.priority} />
        {item.overdue ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">متأخرة</span> : null}
        {item.awaitingApproval ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700 ring-1 ring-indigo-200" data-testid="awaiting-approval">بانتظار الاعتماد</span> : null}
      </div>

      {isTicket ?
        item.canOpen ?
          <Link to={`/dashboard/tickets/${item.id}`} state={{ from: MY_WORK_PATH }} className={openCls} aria-label={`فتح التذكرة ${item.reference ?? item.id}: ${item.title}`}>
            {heading}
          </Link>
        : <div>{heading}</div>
      : <button type="button" onClick={() => onOpenTask?.(item)} className={openCls}>{heading}</button>}

      {item.description ? <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">{item.description}</p> : null}

      <dl className="mt-2.5 grid gap-1 text-[11px] font-bold text-slate-500">
        <div className="flex items-center gap-1.5">
          <User size={11} className="shrink-0 text-slate-400" aria-hidden="true" />
          <dt className="sr-only">المكلّف</dt>
          <dd className="min-w-0 truncate" data-testid="assignee">المكلّف: {item.assigneeName}</dd>
        </div>
        {item.departmentName ?
          <div className="flex items-center gap-1.5">
            <Building2 size={11} className="shrink-0 text-slate-400" aria-hidden="true" />
            <dt className="sr-only">الإدارة</dt>
            <dd className="min-w-0 truncate">{item.departmentName}</dd>
          </div>
        : null}
        <div className="flex items-center gap-1.5">
          <CalendarClock size={11} className={cn('shrink-0', item.overdue ? 'text-rose-500' : 'text-slate-400')} aria-hidden="true" />
          <dt className="sr-only">الموعد</dt>
          <dd className={cn('tabular-nums', item.overdue && 'text-rose-700')} data-testid="due">{item.dueAt ? `الموعد: ${formatDue(item.dueAt)}` : 'بلا موعد محدد'}</dd>
        </div>
        <div className="flex items-center gap-1.5" data-testid="estimate">
          <Sparkles size={11} className="shrink-0 text-customBlue" aria-hidden="true" />
          <dt className="sr-only">النقاط والمدة</dt>
          <dd className="text-customBlue">
            {item.estimateHidden ? <span className="text-slate-400">غير متاح لك</span> : estimateKnown ? formatEstimate({ task_points: item.points, estimated_hours: item.hours }) : <span className="text-slate-400">— لم تُحدَّد</span>}
          </dd>
        </div>
        {item.credited ?
          <div className="flex items-center gap-1.5" data-testid="credited">
            <CheckCircle2 size={11} className="shrink-0 text-emerald-600" aria-hidden="true" />
            <dt className="sr-only">الرصيد المُضاف</dt>
            <dd className="text-emerald-700">أُضيف إلى رصيدك: {item.credited.points} نقطة · {creditedDurationText(item.credited)}</dd>
          </div>
        : null}
      </dl>

      {item.canAccept || item.canReject ?
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
          {item.canAccept ?
            <button
              type="button"
              disabled={busy}
              onClick={() => onAccept?.(item)}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              aria-label={`${isTicket ? 'قبول التذكرة' : 'قبول المهمة'}: ${item.title}`}
            >
              <CheckCircle2 size={13} aria-hidden="true" />
              {isTicket ? 'قبول واستلام' : 'قبول المهمة'}
            </button>
          : null}
          {item.canReject ?
            <button
              type="button"
              disabled={busy}
              onClick={() => onReject?.(item)}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 py-1.5 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
              aria-label={`الاعتذار عن ${isTicket ? 'التذكرة' : 'المهمة'}: ${item.title}`}
            >
              <XCircle size={13} aria-hidden="true" />
              اعتذار
            </button>
          : null}
        </div>
      : null}

      {isTicket && item.canComplete && item.canOpen ?
        <div className="mt-3 border-t border-slate-100 pt-2.5">
          <Link
            to={`/dashboard/tickets/${item.id}`}
            state={{ from: MY_WORK_PATH }}
            className="block rounded-xl border border-emerald-300 py-1.5 text-center text-xs font-black text-emerald-700 transition hover:bg-emerald-50"
          >
            فتح التذكرة لإنهاء المهمة
          </Link>
        </div>
      : null}
    </article>
  )
}
