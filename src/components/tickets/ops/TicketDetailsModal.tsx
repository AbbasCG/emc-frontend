import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { TicketActionCenter } from '@/components/tickets/TicketActionCenter'
import { TicketAttachmentCard } from '@/components/tickets/TicketAttachmentCard'
import { isReporterTicket, type Ticket } from '@/types/ticket'
import type { TicketInsight } from '@/types/ticketOps'
import { httpStatus } from '@/services/ticketOpsService'
import { useTicketDetail, type TicketDetailState } from '@/hooks/useTicketDetail'
import { cn } from '@/lib/utils'
import { CategoryPill, DeadlineText, InternalMark, PriorityPill, StatusPill } from './TicketBadges'
import { TicketActivityTimeline } from './TicketActivityTimeline'
import { TicketAssignmentPanel } from './TicketAssignmentPanel'
import { TicketCommentBox } from './TicketCommentBox'
import { TicketDuplicateHints } from './TicketDuplicateHints'
import { TicketPriorityControl } from './TicketPriorityControl'
import { ageText, formatDateTime } from './ticketOpsUi'

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[12px]">
      <dt className="shrink-0 font-bold text-deepBlue/50">{label}</dt>
      <dd className="min-w-0 text-end font-black text-deepBlue">{children}</dd>
    </div>
  )
}

function Block({ title, tone = 'plain', children, internal = false }: { title: string; tone?: 'plain' | 'good' | 'bad'; children: React.ReactNode; internal?: boolean }) {
  const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50/70' : tone === 'bad' ? 'border-rose-200 bg-rose-50/70' : internal ? 'border-amber-200 bg-amber-50/70' : 'border-deepBlue/[0.07] bg-white'

  return (
    <section className={cn('rounded-2xl border p-4', cls)}>
      <h3 className="mb-1.5 flex items-center gap-2 text-[12px] font-black text-deepBlue">
        {title}
        {internal ? <InternalMark /> : null}
      </h3>
      <p className="whitespace-pre-wrap break-words text-[13px] font-semibold leading-relaxed text-deepBlue/80">{children}</p>
    </section>
  )
}

const bar = (w: string, h = 'h-3') => <div className={cn('animate-pulse rounded-lg bg-deepBlue/[0.07]', h, w)} />

/** What the body shows before the core details arrive: the shape of the content, not a spinner. */
function BodySkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-deepBlue/[0.07] bg-white p-4" aria-busy="true" aria-label="جارٍ تحميل تفاصيل التذكرة" data-testid="modal-skeleton">
      {bar('w-24')}
      {bar('w-full')}
      {bar('w-11/12')}
      {bar('w-2/3')}
    </div>
  )
}

type Head = Pick<Ticket, 'id' | 'title' | 'ticket_number' | 'status' | 'priority' | 'ticket_category' | 'department_id' | 'created_by_name' | 'created_at' | 'expected_resolution_time' | 'is_delayed'> &
  Partial<Pick<Ticket, 'department' | 'unit' | 'assignee' | 'assigned_to_id' | 'capabilities' | 'created_by_email'>>

function Body({
  ticketId,
  detail,
  head,
  backSearch,
  insight,
  onChanged,
  onOpenOther,
}: {
  ticketId: number
  detail: TicketDetailState
  head: Head | null
  backSearch: string
  insight: TicketInsight | undefined
  onChanged: () => void
  onOpenOther: (id: number) => void
}) {
  const { data, error, reload, refreshing } = detail
  const full = data && !isReporterTicket(data) ? (data as Ticket) : null
  // The side panels need only what the list row already carries, so they start now, in parallel with the
  // core request, instead of waiting for it. A deep link has no row, so those panels wait for the details.
  const caps = full?.capabilities ?? head?.capabilities
  const changed = () => {
    reload()
    onChanged()
  }

  if (error && !data) {
    const status = httpStatus(error)
    const gone = status === 403 || status === 404

    return (
      <div role="alert" className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-center" data-testid="modal-error">
        <p className="text-sm font-black text-red-800">{gone ? 'هذه التذكرة غير متاحة لك أو لم تعد موجودة.' : 'تعذّر تحميل تفاصيل التذكرة.'}</p>
        {!gone ?
          <button type="button" onClick={reload} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-customOrange px-4 py-2 text-[12px] font-black text-white">
            <RefreshCw size={13} aria-hidden="true" /> إعادة المحاولة
          </button>
        : null}
      </div>
    )
  }

  // Someone who is only the reporter of this ticket gets the reporter-safe projection: no operations here.
  if (data && isReporterTicket(data)) {
    return (
      <div className="mx-auto max-w-lg space-y-3 rounded-2xl border border-deepBlue/[0.07] bg-white p-6 text-center" data-testid="modal-reporter">
        <p className="text-sm font-black text-deepBlue">هذه التذكرة قدّمتَها أنت.</p>
        <p className="text-[12px] font-semibold text-deepBlue/60">تفاصيلها وحالتها تظهر في صفحتها الخاصة.</p>
        <Link to={`/dashboard/tickets/${data.id}`} className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-4 py-2 text-[12px] font-black text-white">
          فتح صفحة التذكرة
        </Link>
      </div>
    )
  }

  const t = full
  const logs = t?.activity_logs ?? []
  const lastActivity = logs.reduce<string | null>((m, l) => (!m || Date.parse(l.logged_at) > Date.parse(m) ? l.logged_at : m), null)

  return (
    <div className={cn('grid gap-5 transition-opacity lg:grid-cols-[minmax(0,1fr)_21rem]', refreshing && 'opacity-70')} aria-busy={refreshing || (!t && true)}>
      {/* Main: what the ticket says and what can be done about it */}
      <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
        {t ?
          <>
            <Block title="الوصف">{t.description || '—'}</Block>
            {t.resolution_summary ? <Block title="ما تم لحل المشكلة" tone="good">{t.resolution_summary}</Block> : null}
            {t.unresolved_reason ? <Block title="سبب تعذر الحل" tone="bad">{t.unresolved_reason}</Block> : null}
            {t.admin_rejection_reason ? <Block title="سبب الرفض الإداري" tone="bad">{t.admin_rejection_reason}</Block> : null}
            {t.assignee_rejection_reason ? <Block title="مبررات اعتذار المكلف" tone="bad">{t.assignee_rejection_reason}</Block> : null}
            {t.internal_notes ? <Block title="ملاحظات القيادة للمكلف" internal>{t.internal_notes}</Block> : null}

            {(t.attachments ?? []).length > 0 ?
              <section aria-label="المرفقات" className="space-y-2">
                <h3 className="text-[12px] font-black text-deepBlue">المرفقات ({t.attachments!.length})</h3>
                <div className="grid gap-2 sm:grid-cols-2">{t.attachments!.map((a) => <TicketAttachmentCard key={a.id} attachment={a} />)}</div>
              </section>
            : null}

            <TicketActionCenter ticket={t} onChanged={changed} />
          </>
        : <BodySkeleton />}
      </div>

      {/* Side: who, where, when, and the managers' tools. Ready from the row; completed by the details. */}
      <aside className="min-w-0 space-y-3 lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-label="معلومات التذكرة">
        <dl className="space-y-2.5 rounded-2xl border border-deepBlue/[0.07] bg-white p-4" data-testid="ticket-facts">
          {head ?
            <>
              <Fact label="المُبلِّغ">
                <span className="block truncate" title={head.created_by_name}>{head.created_by_name || '—'}</span>
                {t?.created_by_email ? <span className="block truncate text-[11px] font-semibold text-deepBlue/50" dir="ltr">{t.created_by_email}</span> : null}
              </Fact>
              <Fact label="الإدارة">{head.department?.name_ar ?? '—'}</Fact>
              {head.unit ? <Fact label="الوحدة">{head.unit.name_ar}</Fact> : null}
              <Fact label="المكلف">{head.assignee?.name ?? <span className="text-violet-700">غير مُسنَدة</span>}</Fact>
              {t?.approver ? <Fact label="اعتمدها">{t.approver.name}</Fact> : null}
              <Fact label="الإنشاء">{formatDateTime(head.created_at)}</Fact>
              {lastActivity ? <Fact label="آخر نشاط">{ageText(lastActivity) || formatDateTime(lastActivity)}</Fact> : null}
              <Fact label="الموعد المتوقع"><DeadlineText ticket={head} /></Fact>
              {t?.accepted_at ? <Fact label="بدء المعالجة">{formatDateTime(t.accepted_at)}</Fact> : null}
              {t?.resolved_at ? <Fact label="وقت الحل">{formatDateTime(t.resolved_at)}</Fact> : null}
            </>
          : <div className="space-y-2">{bar('w-full')}{bar('w-5/6')}{bar('w-2/3')}{bar('w-3/4')}</div>}
        </dl>

        {head && caps?.change_priority ? <TicketPriorityControl key={`${head.id}:${head.priority}`} ticketId={head.id} current={head.priority} suggestion={insight?.suggestedPriority} onChanged={changed} /> : null}
        {head && caps && (caps.reassign || caps.approve) ? <TicketAssignmentPanel ticket={{ id: head.id, assigned_to_id: head.assigned_to_id ?? null, status: head.status }} canAssign={caps.reassign} onChanged={changed} /> : null}
        {head && caps?.add_internal_note ? <TicketDuplicateHints ticketId={head.id} onOpen={onOpenOther} /> : null}
      </aside>

      {/* Activity: the history and the conversation, under the main column */}
      <section aria-label="النشاط والتعقيبات" className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-2">
        <h3 className="text-[12px] font-black text-deepBlue">النشاط والتعقيبات</h3>
        {t ?
          <>
            <TicketActivityTimeline logs={logs} />
            {caps?.comment !== false ? <TicketCommentBox ticketId={t.id} canInternal={caps?.add_internal_note === true} onPosted={changed} /> : null}
          </>
        : <div className="space-y-2" aria-hidden="true">{bar('w-full', 'h-14')}{bar('w-full', 'h-14')}</div>}
        <Link to={`/dashboard/tickets/${ticketId}`} state={{ from: `/dashboard/tickets/admin${backSearch ? `?${backSearch}` : ''}` }} className="inline-flex items-center gap-1.5 pt-1 text-[12px] font-black text-customBlue hover:underline">
          <ExternalLink size={13} aria-hidden="true" /> فتح الصفحة الكاملة للتذكرة
        </Link>
      </section>
    </div>
  )
}

/**
 * The ticket details window: a large centered workspace over the queue, so the filters, page and selection stay
 * exactly as they were.
 *
 * It opens in the same frame as the click. `preview` is the row the user just clicked (data they were already
 * sent), which fills the header, status, priority and side facts at once; the full details, timeline and the
 * managers' tools arrive as they load, none blocking another. The details request starts immediately (and is
 * usually already done if the pointer hovered the row first).
 */
export function TicketDetailsModal({
  ticketId,
  preview,
  userKey,
  onClose,
  onChanged,
  onOpenOther,
  backSearch,
  insight,
  returnFocusTo,
}: {
  ticketId: number | null
  /** The list/board row for this ticket, when the user opened it from one. Safe: it is what they were already shown. */
  preview?: Ticket | null
  userKey: string | number | null | undefined
  onClose: () => void
  onChanged: () => void
  onOpenOther: (id: number) => void
  backSearch: string
  insight?: TicketInsight
  returnFocusTo?: HTMLElement | null | (() => HTMLElement | null)
}) {
  const detail = useTicketDetail(userKey, ticketId)
  const full = detail.data && !isReporterTicket(detail.data) ? (detail.data as Ticket) : null
  const rowOk = preview && preview.id === ticketId ? preview : null
  const head: Head | null = full ?? rowOk

  return (
    <CenteredModal
      open={ticketId !== null}
      onClose={onClose}
      size="xl"
      testId="ticket-modal"
      returnFocusTo={returnFocusTo}
      title={head?.title ?? (detail.data && isReporterTicket(detail.data) ? detail.data.title : 'تفاصيل التذكرة')}
      subtitle={head ? `${head.ticket_number}${head.department?.name_ar ? ` · ${head.department.name_ar}` : ''}` : undefined}
      dirtyMessage="لديك تعقيب أو تغيير لم يُحفظ. إن أغلقت النافذة الآن سيضيع."
      headerExtra={
        head ?
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={head.status} />
            <PriorityPill priority={head.priority} />
            <CategoryPill category={head.ticket_category} />
            {head.is_delayed ? <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700 ring-1 ring-inset ring-rose-200">متأخرة</span> : null}
            {detail.refreshing ? <Loader2 size={14} className="animate-spin text-customBlue" aria-hidden="true" /> : null}
          </div>
        : undefined
      }
    >
      {ticketId !== null ? <Body ticketId={ticketId} detail={detail} head={head} backSearch={backSearch} insight={insight} onChanged={onChanged} onOpenOther={onOpenOther} /> : null}
    </CenteredModal>
  )
}
