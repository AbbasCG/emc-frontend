import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ExternalLink, Info, KanbanSquare, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import OpsLoadError from '@/components/operations/OpsLoadError'
import TaskDetailPanel from '@/components/operations/TaskDetailPanel'
import TaskRejectModal from '@/components/operations/TaskRejectModal'
import WorkItemCard from '@/components/operations/myWork/WorkItemCard'
import MyWorkFilters from '@/components/operations/myWork/MyWorkFilters'
import StatusBoard from '@/components/ui/StatusBoard'
import { RejectTaskModal as RejectTicketAssignmentModal } from '@/components/tickets/modals/RejectTaskModal'
import { acceptMyTask, rejectMyTask } from '@/api/tasksApi'
import { taskApiMessage } from '@/api/taskErrors'
import { usePageAccess } from '@/contexts/PageAccessContext'
import { apiMessage } from '@/services/ticketOpsService'
import { ticketService } from '@/services/ticketService'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { useNow } from '@/hooks/useNow'
import { useMyTickets } from '@/hooks/useMyTickets'
import { MY_WORK_COLUMNS } from '@/lib/myWorkColumns'
import {
  DEFAULT_WORK_FILTERS,
  dedupeWorkItems,
  hideOwnedParents,
  filterWorkItems,
  groupByColumn,
  taskToWorkItem,
  ticketToWorkItem,
  type WorkFilters,
  type WorkItem,
} from '@/lib/myWork'
import { MEMBER_ENDPOINTS } from '@/api/taskEndpoints'
import { useTasksWorkspace } from '../hooks/useTasksWorkspace'

const TICKETS_ADMIN = '/dashboard/tickets/admin'
const TICKETS_WORKSPACE = '/dashboard/tickets/workspace'

/**
 * «مهامي ومسؤولياتي»: everything the signed-in user is responsible for, in one board: the tasks assigned to them
 * (group tasks they take part in included) and the tickets assigned to them. Tickets are not copied into tasks:
 * their cards come from `GET /v1/tickets/my-work` on every load, the ticket stays the single source of truth,
 * and after any action both sources are read again, so a reassigned or already-answered item never lingers.
 *
 * The management view of all tasks is a different page («إدارة المهام»).
 */
export default function OpsTasksMyPage() {
  const { user } = useAuth()
  const ws = useTasksWorkspace('mine', MEMBER_ENDPOINTS)
  const tk = useMyTickets()
  const [filters, setFilters] = useState<WorkFilters>(DEFAULT_WORK_FILTERS)
  const [actingKey, setActingKey] = useState<string | null>(null)
  const [decliningTask, setDecliningTask] = useState<{ id: number; title: string } | null>(null)
  const [decliningTicketId, setDecliningTicketId] = useState<number | null>(null)

  const now = useNow(60_000)
  // Where ALL the tickets can be seen: the operations queue, else the assignee workspace — only if this user may open it.
  const { canAccessPath } = usePageAccess()
  const allTicketsHref = canAccessPath(TICKETS_ADMIN) ? TICKETS_ADMIN : canAccessPath(TICKETS_WORKSPACE) ? TICKETS_WORKSPACE : null
  const me = useMemo(() => ({ name: user?.name?.trim() || 'أنت' }), [user?.name])

  const refreshAll = () => {
    void ws.refresh()
    void tk.refresh()
  }
  useAutoRefresh(refreshAll)

  const items = useMemo(
    () => dedupeWorkItems([...hideOwnedParents(ws.tasks).map((t) => taskToWorkItem(t, me, now)), ...tk.tickets.map((t) => ticketToWorkItem(t, me, now))]),
    [ws.tasks, tk.tickets, me, now],
  )

  const visible = useMemo(() => filterWorkItems(items, filters, now), [items, filters, now])
  const columns = useMemo(() => groupByColumn(visible), [visible])
  const counts = useMemo(() => {
    // The kind counts follow the other filters, so the numbers on the segments match what each one would show.
    const base = filterWorkItems(items, { ...filters, kind: 'all' }, now)

    return { all: base.length, tasks: base.filter((i) => i.kind === 'task').length, tickets: base.filter((i) => i.kind === 'ticket').length }
  }, [items, filters, now])

  const accept = async (item: WorkItem) => {
    if (actingKey) return
    setActingKey(item.key)
    try {
      if (item.kind === 'ticket') {
        await ticketService.acceptTask(item.id)
        toast.success('تم قبول التكليف — التذكرة الآن قيد تنفيذك')
        // Moves to «قيد التنفيذ» now; the re-read below confirms it (and a refresh keeps it there).
        tk.applyLocal(item.id, 'IN_PROGRESS')
        await tk.refresh()
      } else {
        // The server moves an idea / under-review task to planning when it is accepted; show that at once.
        const raw = ws.tasks.find((t) => t.id === item.id)
        const movesToPlanning = raw !== undefined && (raw.status === 'idea' || raw.status === 'under_review')
        await acceptMyTask(item.id)
        toast.success(movesToPlanning ? 'تم قبول المهمة ونُقلت إلى مهامك' : 'تم قبول المهمة')
        ws.patchLocal(item.id, { acceptance_status: 'accepted', ...(movesToPlanning ? { status: 'planning' as const } : {}) })
        await ws.refresh()
      }
    } catch (e) {
      toast.error(item.kind === 'ticket' ? apiMessage(e, 'تعذّر قبول التكليف') : taskApiMessage(e, 'تعذّر قبول المهمة'))
      // The server may have changed anyway (someone reassigned it): never keep a stale card.
      refreshAll()
    } finally {
      setActingKey(null)
    }
  }

  const decline = (item: WorkItem) => {
    if (item.kind === 'ticket') setDecliningTicketId(item.id)
    else setDecliningTask({ id: item.id, title: item.title })
  }

  const openTask = (item: WorkItem) => {
    const t = ws.tasks.find((x) => x.id === item.id)
    if (t) void ws.openTask(t)
  }

  if (ws.loading && tk.loading && items.length === 0) return <OpsPageSkeleton />

  const filtering = filters.kind !== 'all' || filters.search.trim() !== '' || filters.priority !== 'all' || filters.due !== 'all'
  // Only once BOTH sources have answered: no «nothing assigned» flash while one is still loading.
  const nothingAtAll = !ws.loading && !tk.loading && !ws.error && !tk.error && items.length === 0

  return (
    <div className="min-w-0 space-y-5" dir="rtl">
      <header className="flex flex-col gap-4 rounded-[1.6rem] bg-white p-5 shadow-sm ring-1 ring-deepBlue/[0.06] sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 text-right">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-customBlue/10 px-2.5 py-0.5 text-[11px] font-black text-customBlue">مسؤولياتي المباشرة</span>
            <Link
              to="/dashboard/operations/board"
              className="inline-flex items-center gap-1.5 rounded-lg bg-deepBlue px-3 py-1 text-[11px] font-black text-white shadow-sm transition hover:bg-deepBlue/90"
            >
              <KanbanSquare size={13} aria-hidden="true" />
              الانتقال إلى الأجايل الخاص بي
              <ExternalLink size={11} aria-hidden="true" />
            </Link>
          </div>
          <h1 className="mt-1.5 text-2xl font-black text-deepBlue">مهامي ومسؤولياتي</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            المهام المسندة إليك (بما فيها الجماعية) والتذاكر المكلّف بها، في لوحة واحدة: اقبلها، تابعها، وافتح أصلها.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-deepBlue/10 bg-white px-4 py-2 text-xs font-black text-deepBlue shadow-sm transition hover:border-customBlue/40 md:self-center"
        >
          <RefreshCw size={14} aria-hidden="true" />
          تحديث
        </button>
      </header>

      {ws.error ? <OpsLoadError compact title="تعذّر تحميل مهامك" message="لم نتمكن من جلب المهام المسندة إليك. التذاكر أدناه قد تكون ظاهرة." onRetry={() => void ws.refresh()} /> : null}
      {tk.error ? <OpsLoadError compact title="تعذّر تحميل تذاكرك" message="لم نتمكن من جلب التذاكر المكلّف بها. المهام أدناه قد تكون ظاهرة." onRetry={() => void tk.refresh()} /> : null}
      {ws.truncated ? (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[11px] font-bold leading-relaxed text-amber-800" data-testid="tasks-truncated-note">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          يوجد المزيد من المهام — المعروض أحدث المهام المسندة إليك فقط. أكمل أو أغلق ما انتهى لتظهر الأقدم، أو افتح لوحة الأجايل.
        </p>
      ) : null}

      {tk.truncated ? (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[11px] font-bold leading-relaxed text-amber-800" data-testid="truncated-note">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            يوجد المزيد من التذاكر — {allTicketsHref ? 'اعرضها من ' : 'المعروض أحدثها فقط؛ أنجز ما انتهى لتظهر الأقدم.'}
          </span>
          {allTicketsHref ? <Link to={allTicketsHref} className="font-black underline" data-testid="all-tickets-link">{allTicketsHref === TICKETS_ADMIN ? 'إدارة تذاكر العمليات' : 'مساحة العضو المكلّف'}</Link> : null}
        </p>
      ) : null}

      <MyWorkFilters value={filters} onChange={setFilters} counts={counts} />

      {nothingAtAll ? (
        <p className="rounded-2xl border border-dashed border-deepBlue/15 bg-white px-4 py-3 text-center text-xs font-bold text-deepBlue/60" data-testid="nothing-assigned">
          لا مهام ولا تذاكر مسندة إليك حاليًا. ستظهر هنا فور إسنادها لك، وتبقى الأعمدة جاهزة أدناه.
        </p>
      ) : null}
      {filtering && visible.length === 0 && items.length > 0 ? (
        <p role="status" className="rounded-2xl bg-white px-4 py-3 text-center text-xs font-bold text-deepBlue/60 ring-1 ring-deepBlue/[0.06]" data-testid="no-match">
          لا نتائج مطابقة للمرشحات الحالية.
          <button type="button" onClick={() => setFilters(DEFAULT_WORK_FILTERS)} className="ms-2 font-black text-customBlue underline">
            مسح المرشحات
          </button>
        </p>
      ) : null}

      <StatusBoard
        ariaLabel="حالات مهامي وتذاكري"
        testId="my-work-board"
        columns={MY_WORK_COLUMNS.map((col) => ({
          key: col.key,
          label: col.label,
          count: columns[col.key].length,
          emptyText: col.empty,
          children: columns[col.key].map((item) => (
            <WorkItemCard key={item.key} item={item} busy={actingKey === item.key} onAccept={(i) => void accept(i)} onReject={decline} onOpenTask={openTask} />
          )),
        }))}
      />

      <TaskDetailPanel
        task={ws.selected}
        open={ws.panelOpen}
        onClose={ws.closePanel}
        onPatch={async (patch) => {
          await ws.onPatch(patch)
          await ws.refresh()
        }}
        memberView={!ws.canEditDetails}
        onToggleChecklist={ws.onToggleChecklist}
        onComment={ws.onComment}
      />

      <TaskRejectModal
        task={decliningTask}
        open={decliningTask !== null}
        onClose={() => setDecliningTask(null)}
        onRejected={() => void ws.refresh()}
        reject={rejectMyTask}
        onFailed={refreshAll}
      />

      {decliningTicketId !== null ? (
        <RejectTicketAssignmentModal
          ticketId={decliningTicketId}
          onClose={() => setDecliningTicketId(null)}
          onFailed={refreshAll}
          onSuccess={() => {
            setDecliningTicketId(null)
            void tk.refresh()
          }}
        />
      ) : null}
    </div>
  )
}
