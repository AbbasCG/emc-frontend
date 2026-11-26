import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircle, KanbanSquare, List, Lock, Plus, RefreshCw, Star, User, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { fetchDepartmentOptions } from '@/api/jobTitlesApi'
import { acceptMyTask, rejectMyTask } from '@/api/tasksApi'
import { taskApiMessage } from '@/api/taskErrors'
import { NO_TASK_ACTIONS, type WorkBoardCard, type WorkBoardScope } from '@/api/operationsWorkBoardApi'
import StatusBoard from '@/components/ui/StatusBoard'
import OpsLoadError from '@/components/operations/OpsLoadError'
import TaskCreateModal from '@/components/operations/TaskCreateModal'
import TaskDetailPanel from '@/components/operations/TaskDetailPanel'
import TaskReassignModal from '@/components/operations/TaskReassignModal'
import TaskRejectModal from '@/components/operations/TaskRejectModal'
import BoardTaskManagement from '@/components/operations/BoardTaskManagement'
import WorkItemCard from '@/components/operations/myWork/WorkItemCard'
import MyWorkFilters from '@/components/operations/myWork/MyWorkFilters'
import { RejectTaskModal as RejectTicketAssignmentModal } from '@/components/tickets/modals/RejectTaskModal'
import { apiMessage } from '@/services/ticketOpsService'
import { ticketService } from '@/services/ticketService'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useNow } from '@/hooks/useNow'
import { useWorkBoard } from '@/hooks/useWorkBoard'
import { MY_WORK_COLUMNS, MY_WORK_COLUMN_LABEL, type MyWorkColumnKey } from '@/lib/myWorkColumns'
import { DEFAULT_WORK_FILTERS, filterWorkItems, workBoardCardToItem, type WorkFilters, type WorkItem } from '@/lib/myWork'
import { allCards, anyHasMore, cardToBoardTask, matchesQuickView, type QuickView } from '@/lib/workBoard'
import { formatDue } from '@/lib/dueDate'
import { cn } from '@/lib/utils'
import { TASK_PRIORITY_AR } from '@/data/operationsLabels'
import { useBoardTaskDrawer } from './hooks/useBoardTaskDrawer'

const OPERATIONS_BOARD_PATH = '/dashboard/operations/board'

/**
 * The roles that get the old management controls: the quick views and the lock / evaluate / claim actions inside the task drawer.
 * These are exactly the roles the server lets open ANY task (`can_open` on another person's task:
 * OperationsWorkBoard::TASK_DETAIL_ROLES), so none of those controls is a dead end. The server still decides each call.
 *
 * Creating, editing and (re)assigning a task are NOT decided here any more: they follow three grantable permissions
 * (tasks.create / tasks.update / tasks.assign), and the server tells the board what the viewer may do (`meta.task_actions`,
 * and `capabilities.can_edit` / `can_reassign` on each task card). The page shows exactly that, whatever the role.
 */
const MANAGER_ROLES = new Set(['admin', 'super_admin', 'tech_admin', 'operations_manager'])

const FIELD = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue outline-none focus:border-customBlue focus:ring-1 focus:ring-customBlue'

type ViewMode = 'kanban' | 'list'

function errorCopy(status: number | null): { title: string; message: string } {
  if (status === 403) return { title: 'لا تملك صلاحية عرض هذه اللوحة', message: 'تواصل مع المسؤول إن كنت تحتاجها.' }
  if (status === 429) return { title: 'طلبات كثيرة في وقت قصير', message: 'انتظر لحظات ثم أعد المحاولة.' }
  if (status === 422) return { title: 'المرشحات غير صالحة', message: 'غيّر البحث أو المرشحات ثم أعد المحاولة.' }
  if (status === 401) return { title: 'انتهت الجلسة', message: 'سجّل الدخول من جديد ثم أعد المحاولة.' }

  return { title: 'تعذّر تحميل لوحة التشغيل', message: 'حدث خطأ أثناء جلب البيانات. تحقق من الاتصال ثم حاول مرة أخرى.' }
}

/**
 * The GLOBAL operations board (/dashboard/operations/board): every operational task and every assigned ticket of every assignee,
 * in the SAME eight columns as «مهامي ومسؤولياتي» (the server decides the column with the one shared map; this page only
 * shows it), one card per item, with the same card component.
 *
 * A card is a public, read-only view. Seeing one grants nothing: the title opens the item only when the server says the viewer
 * may (`can_open`), accept / decline appear only for the real assignee, a ticket the viewer may not open is masked, and the
 * management actions of a task (lock, evaluate, claim, reassign) live inside the task's own drawer, each behind its own endpoint.
 */
export default function OperationsBoardPage() {
  const { user } = useAuth()
  const canManage = MANAGER_ROLES.has(user?.role ?? '')

  const [scope, setScope] = useState<WorkBoardScope>('all')
  const [quick, setQuick] = useState<QuickView>('all')
  const [filters, setFilters] = useState<WorkFilters>(DEFAULT_WORK_FILTERS)
  const [deptFilter, setDeptFilter] = useState('')
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])
  const [view, setView] = useState<ViewMode>('kanban')
  const [showCreate, setShowCreate] = useState(false)
  // The ONE form edits too: the id of the task being edited (null = none), and the card whose reassign dialog is open.
  const [editingId, setEditingId] = useState<number | null>(null)
  // Whether the open form may assign is decided ONCE, when it opens: a refresh that fails (or changes the answer) while somebody
  // is typing must not turn the assignee controls off under them and send the task unassigned.
  const [formCanAssign, setFormCanAssign] = useState(false)
  const [reassigning, setReassigning] = useState<WorkBoardCard | null>(null)
  const [actingKey, setActingKey] = useState<string | null>(null)
  const [decliningTask, setDecliningTask] = useState<{ id: number; title: string } | null>(null)
  const [decliningTicketId, setDecliningTicketId] = useState<number | null>(null)

  const now = useNow(60_000)
  // The search goes to the server (it covers every card, not only the ones loaded) after a pause in typing.
  const search = useDebouncedValue(filters.search, 350)
  const board = useWorkBoard({ scope, kind: filters.kind, departmentId: deptFilter ? Number(deptFilter) : null, search })
  const { columns, meta, loading, error, refresh, reload, loadMore, loadingMore } = board
  useAutoRefresh(() => void refresh())

  const drawer = useBoardTaskDrawer(() => void refresh())

  useEffect(() => {
    void fetchDepartmentOptions()
      .then((rows) => setDepartments(rows.map((r) => ({ id: r.id, name: r.name_ar || r.name || String(r.id) }))))
      .catch(() => setDepartments([]))
  }, [])

  const cards = useMemo(() => allCards(columns), [columns])
  const loadedAll = !anyHasMore(columns)
  // One object per card / drawer state, so the reassign dialog does not re-read the department's members on every board refresh.
  const reassignTask = useMemo(() => (reassigning ? cardToBoardTask(reassigning, drawer.selected) : null), [reassigning, drawer.selected])

  // Priority, the due filter and the management quick views read fields that are already on the cards, so they filter the
  // cards that are loaded; kind, search, scope and department go to the server and change what is loaded.
  const clientFiltering = filters.priority !== 'all' || filters.due !== 'all' || quick !== 'all'
  const visible = useMemo(() => {
    const out = {} as Record<MyWorkColumnKey, WorkItem[]>
    for (const c of MY_WORK_COLUMNS) {
      const items = columns[c.key].items.filter((card) => matchesQuickView(card, quick)).map(workBoardCardToItem)
      out[c.key] = filterWorkItems(items, { ...filters, kind: 'all', search: '' }, now)
    }

    return out
  }, [columns, quick, filters, now])

  const quickCount = (v: QuickView) => cards.filter((c) => matchesQuickView(c, v)).length
  const quickLabel = (n: number) => (loadedAll ? String(n) : `${n}+`)
  const pendingAcceptance = cards.filter((c) => c.capabilities.can_accept).length

  const counts = meta?.counts ?? { all: 0, tasks: 0, tickets: 0 }
  // What the viewer may do to tasks is the server's LAST GOOD answer: nothing while it is unknown (loading, the first read failed, or
  // an answer without it). A later quiet refresh that fails keeps the cards AND this answer on screen (`error` only says the latest read failed).
  const taskActions = meta ? meta.task_actions : NO_TASK_ACTIONS
  const openCreate = () => {
    setFormCanAssign(taskActions.can_assign)
    setShowCreate(true)
  }
  const openEdit = (id: number) => {
    setFormCanAssign(taskActions.can_assign)
    setEditingId(id)
  }
  const firstLoad = loading && meta === null
  const departmentSelectShown = canManage || departments.length > 0

  const accept = useCallback(
    async (item: WorkItem) => {
      if (actingKey) return
      setActingKey(item.key)
      try {
        if (item.kind === 'ticket') {
          await ticketService.acceptTask(item.id)
          toast.success('تم قبول التكليف — التذكرة الآن قيد تنفيذك')
        } else {
          await acceptMyTask(item.id)
          toast.success('تم قبول المهمة')
        }
        await refresh()
      } catch (e) {
        toast.error(item.kind === 'ticket' ? apiMessage(e, 'تعذّر قبول التكليف') : taskApiMessage(e, 'تعذّر قبول المهمة'))
        // The server may have changed anyway (someone reassigned it): never keep a stale card.
        void refresh()
      } finally {
        setActingKey(null)
      }
    },
    [actingKey, refresh],
  )

  const decline = (item: WorkItem) => {
    if (item.kind === 'ticket') setDecliningTicketId(item.id)
    else setDecliningTask({ id: item.id, title: item.title })
  }

  const openTask = (item: WorkItem) => void drawer.openTask(item.id, item.isMine === true)
  const cardOf = (item: WorkItem) => cards.find((c) => c.key === item.key) ?? null
  // After an edit / reassign: the board columns AND the open drawer (when there is one), so nothing keeps showing the old values.
  const afterTaskWrite = () => {
    void refresh()
    void drawer.reloadSelected()
  }
  const openedCard = drawer.selected ? cards.find((c) => c.kind === 'task' && c.id === drawer.selected!.id) : undefined

  const viewButtons: Array<{ key: ViewMode; label: string; icon: typeof List }> = [
    { key: 'kanban', label: 'لوحة', icon: KanbanSquare },
    { key: 'list', label: 'قائمة', icon: List },
  ]

  const scopeBtn = (on: boolean, tone: string) =>
    cn('flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition', on ? `${tone} text-white shadow-sm` : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100')

  const loadMoreButton = (key: MyWorkColumnKey) => {
    const col = columns[key]
    if (!col.hasMore) return null
    const remaining = Math.max(0, col.count - col.items.length)

    return (
      <button
        key={`more-${key}`}
        type="button"
        data-testid={`load-more-${key}`}
        disabled={loadingMore !== null}
        onClick={() => void loadMore(key)}
        className="w-full rounded-xl border border-dashed border-customBlue/40 bg-white px-3 py-2 text-xs font-black text-customBlue transition hover:bg-customBlue/[0.05] disabled:opacity-60"
      >
        {loadingMore === key ? 'جارٍ التحميل…' : `تحميل المزيد (${remaining.toLocaleString('en-US')})`}
      </button>
    )
  }

  const err = error ? errorCopy(error.status) : null

  return (
    <div dir="rtl" className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 rounded-[1.6rem] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.06] md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-customBlue/10 px-2.5 py-0.5 text-[11px] font-black text-customBlue">EMC Agile & Operations</span>
            {pendingAcceptance > 0 ?
              <span className="animate-pulse rounded-lg bg-rose-500 px-2.5 py-0.5 text-[11px] font-black text-white" data-testid="pending-acceptance">
                {pendingAcceptance} مهام بانتظار موافقتك
              </span>
            : null}
          </div>
          <h1 className="mt-1.5 text-2xl font-black text-deepBlue">{scope === 'mine' ? 'لوحة الأجايل الخاصة بي' : 'لوحة التشغيل والأجايل العامة'}</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {scope === 'mine' ? 'مهامك وتذاكرك المسندة إليك بحسب تطور حالاتها، بنفس أعمدة «مهامي ومسؤولياتي»' : 'كل مهام التشغيل وكل التذاكر المسندة لجميع المكلّفين، بنفس أعمدة «مهامي ومسؤولياتي»'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="طريقة العرض">
            {viewButtons.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition', view === key ? 'bg-deepBlue text-white shadow-sm' : 'text-slate-500 hover:text-deepBlue')}
              >
                <Icon size={13} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => void refresh()} title="تحديث اللوحة" aria-label="تحديث اللوحة" className="rounded-xl border border-slate-200 bg-white p-2.5 text-deepBlue transition hover:bg-slate-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>

          {taskActions.can_create ?
            <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-deepBlue px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-deepBlue/90">
              <Plus size={16} aria-hidden="true" />
              إسناد مهمة جديدة
            </button>
          : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-2" role="group" aria-label="نطاق اللوحة">
        <button type="button" aria-pressed={scope === 'mine'} onClick={() => setScope('mine')} className={scopeBtn(scope === 'mine', 'bg-customBlue')}>
          <User size={13} aria-hidden="true" />
          لوحة الأجايل الخاصة بي
        </button>
        <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')} className={scopeBtn(scope === 'all', 'bg-deepBlue')}>
          <Users size={13} aria-hidden="true" />
          اللوحة الكاملة
        </button>

        {canManage ?
          <>
            <button
              type="button"
              aria-pressed={quick === 'pending_eval'}
              onClick={() => setQuick(quick === 'pending_eval' ? 'all' : 'pending_eval')}
              className={cn('flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition', quick === 'pending_eval' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50')}
            >
              <Star size={13} aria-hidden="true" />
              بانتظار التقييم
              <span className="rounded-full bg-white px-1.5 text-[10px] font-black text-amber-700" data-testid="quick-count-pending_eval">{quickLabel(quickCount('pending_eval'))}</span>
            </button>
            {quickCount('unassigned') > 0 || quick === 'unassigned' ?
              <button
                type="button"
                aria-pressed={quick === 'unassigned'}
                onClick={() => setQuick(quick === 'unassigned' ? 'all' : 'unassigned')}
                className={cn('flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition', quick === 'unassigned' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100')}
              >
                مهام الإدارة غير المسندة
                <span className="rounded-full bg-slate-200 px-1.5 text-[10px] font-black text-slate-800" data-testid="quick-count-unassigned">{quickLabel(quickCount('unassigned'))}</span>
              </button>
            : null}
            {quickCount('rejected') > 0 || quick === 'rejected' ?
              <button
                type="button"
                aria-pressed={quick === 'rejected'}
                onClick={() => setQuick(quick === 'rejected' ? 'all' : 'rejected')}
                className={cn('flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition', quick === 'rejected' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50')}
              >
                <AlertCircle size={13} aria-hidden="true" />
                مهام مرفوضة
                <span className="rounded-full bg-rose-100 px-1.5 text-[10px] font-black text-rose-700" data-testid="quick-count-rejected">{quickLabel(quickCount('rejected'))}</span>
              </button>
            : null}
          </>
        : null}
      </div>

      <div className="space-y-2">
        <MyWorkFilters value={filters} onChange={setFilters} counts={counts} searchLabel="بحث في مهام وتذاكر اللوحة" testId="operations-board-filters" />
        {departmentSelectShown ?
          <label className="flex items-center gap-2 text-xs font-black text-deepBlue">
            الإدارة
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={FIELD} aria-label="الإدارة">
              <option value="">كل الإدارات</option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        : null}
        {clientFiltering && !loadedAll ?
          <p className="text-[11px] font-bold text-slate-400" data-testid="partial-note">
            الأولوية والموعد والعروض السريعة تُطبَّق على البطاقات المحمّلة؛ حمّل المزيد من العمود لتشمل الباقي.
          </p>
        : null}
      </div>

      {err ?
        <OpsLoadError compact title={err.title} message={err.message} onRetry={() => void reload()} />
      : null}

      {view === 'kanban' ?
        <StatusBoard
          ariaLabel="حالات مهام وتذاكر اللوحة"
          testId="operations-board"
          columns={MY_WORK_COLUMNS.map((col) => {
            const items = visible[col.key]

            return {
              key: col.key,
              label: col.label,
              // The column's total is the server's; with a client-side filter on it is what is shown.
              count: clientFiltering ? items.length : columns[col.key].count,
              emptyText: firstLoad ? 'جارٍ التحميل…' : col.empty,
              children: [
                ...items.map((item) => (
                  <WorkItemCard
                    key={item.key}
                    item={item}
                    busy={actingKey === item.key}
                    onAccept={(i) => void accept(i)}
                    onReject={decline}
                    onOpenTask={openTask}
                    onEdit={(i) => openEdit(i.id)}
                    onReassign={(i) => setReassigning(cardOf(i))}
                    backPath={OPERATIONS_BOARD_PATH}
                  />
                )),
                loadMoreButton(col.key),
              ],
            }
          })}
        />
      : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="operations-board-list">
          <table className="w-full min-w-[56rem] text-right text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-black text-slate-600">
              <tr>
                <th scope="col" className="p-3.5">العنصر</th>
                <th scope="col" className="p-3.5">النوع</th>
                <th scope="col" className="p-3.5">الإدارة</th>
                <th scope="col" className="p-3.5">المكلف</th>
                <th scope="col" className="p-3.5">الحالة</th>
                <th scope="col" className="p-3.5">الأولوية</th>
                <th scope="col" className="p-3.5">الموعد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-deepBlue">
              {MY_WORK_COLUMNS.flatMap((col) => visible[col.key]).map((t) => (
                <tr key={t.key} data-testid="work-row" data-key={t.key} className="transition hover:bg-slate-50/70">
                  <td className="p-3.5">
                    {t.masked ?
                      <span className="inline-flex items-center gap-1 text-slate-400" data-testid="masked-row">
                        <Lock size={11} aria-hidden="true" />
                        {t.title}
                        {/* The server's placeholder usually says it already; the hint is added only when it does not. */}
                        {t.title.includes('محجوب') ? null : ' · بيانات محجوبة'}
                      </span>
                    : t.kind === 'ticket' && t.canOpen ?
                      <Link to={`/dashboard/tickets/${t.id}`} state={{ from: OPERATIONS_BOARD_PATH }} className="font-black text-customBlue hover:underline" aria-label={`فتح التذكرة ${t.reference ?? t.id}: ${t.title}`}>
                        {t.reference ? <span className="me-2 font-mono text-[11px]">{t.reference}</span> : null}
                        {t.title}
                      </Link>
                    : t.kind === 'task' && t.canOpen ?
                      <button type="button" onClick={() => openTask(t)} className="text-start font-black text-customBlue hover:underline">{t.title}</button>
                    : <span className="font-black">{t.title}</span>}
                  </td>
                  <td className="p-3.5">{t.kind === 'ticket' ? 'تذكرة' : 'مهمة'}</td>
                  <td className="p-3.5 text-slate-500">{t.departmentName ?? '—'}</td>
                  <td className="p-3.5">{t.assigneeName}</td>
                  <td className="p-3.5"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px]">{MY_WORK_COLUMN_LABEL[t.column]}</span></td>
                  <td className="p-3.5">{TASK_PRIORITY_AR[t.priority]}</td>
                  <td className={cn('p-3.5 tabular-nums', t.overdue && 'text-rose-700')}>{t.masked ? '—' : t.dueAt ? formatDue(t.dueAt) : 'بلا موعد'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loadedAll ?
            <div className="border-t border-slate-100 p-3 text-center">
              <button
                type="button"
                data-testid="load-more-all"
                disabled={loadingMore !== null}
                onClick={() => void MY_WORK_COLUMNS.filter((c) => columns[c.key].hasMore).reduce<Promise<void>>((p, c) => p.then(() => loadMore(c.key)), Promise.resolve())}
                className="rounded-xl border border-dashed border-customBlue/40 px-4 py-2 text-xs font-black text-customBlue hover:bg-customBlue/[0.05] disabled:opacity-60"
              >
                تحميل المزيد
              </button>
            </div>
          : null}
        </div>}

      <TaskDetailPanel
        task={drawer.selected}
        open={drawer.open}
        onClose={drawer.close}
        onPatch={drawer.onPatch}
        memberView={drawer.memberView}
        onToggleChecklist={drawer.onToggleChecklist}
        onComment={drawer.onComment}
        extraActions={openedCard && (canManage || openedCard.capabilities.can_edit || openedCard.capabilities.can_reassign) ? <BoardTaskManagement
            card={openedCard}
            detail={drawer.selected}
            canManage={canManage}
            onChanged={afterTaskWrite}
            onEdit={(c) => openEdit(c.id)}
            onReassign={(c) => setReassigning(c)}
          /> : null}
      />

      <TaskCreateModal
        open={showCreate || editingId !== null}
        editTaskId={editingId}
        canAssign={formCanAssign}
        onClose={() => {
          setShowCreate(false)
          setEditingId(null)
        }}
        onCreated={() => (editingId !== null ? afterTaskWrite() : void reload())}
      />

      <TaskReassignModal
        task={reassignTask}
        open={reassigning !== null}
        onClose={() => setReassigning(null)}
        onReassigned={afterTaskWrite}
      />

      <TaskRejectModal task={decliningTask} open={decliningTask !== null} onClose={() => setDecliningTask(null)} onRejected={() => void refresh()} reject={rejectMyTask} onFailed={() => void refresh()} />

      {decliningTicketId !== null ?
        <RejectTicketAssignmentModal
          ticketId={decliningTicketId}
          onClose={() => setDecliningTicketId(null)}
          onFailed={() => void refresh()}
          onSuccess={() => {
            setDecliningTicketId(null)
            void refresh()
          }}
        />
      : null}
    </div>
  )
}

