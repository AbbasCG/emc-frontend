import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import {
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  CheckCircle,
  Clock,
  KanbanSquare,
  List,
  Lock,
  LockOpen,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  User,
  Users,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { fetchDepartmentOptions } from '@/api/jobTitlesApi'
import {
  BOARD_COLUMNS,
  acceptTask,
  claimTask,
  fetchOperationsBoard,
  lockTask,
  unlockTask,
  updateBoardTaskStatus,
  type BoardColumns,
  type BoardTask,
} from '@/api/operationsBoardApi'
import TaskCreateModal from '@/components/operations/TaskCreateModal'
import TaskEvaluationModal from '@/components/operations/TaskEvaluationModal'
import TaskRejectModal from '@/components/operations/TaskRejectModal'
import TaskReassignModal from '@/components/operations/TaskReassignModal'

type ViewMode = 'kanban' | 'list' | 'people'
type BoardScope = 'all' | 'mine' | 'pending_eval' | 'unassigned' | 'rejected'

const MANAGER_ROLES = new Set([
  'admin',
  'super_admin',
  'tech_admin',
  'executive_admin',
  'hr_manager',
  'operations_manager',
  'department_manager',
])

const PRIORITY_STYLES: Record<BoardTask['priority'], string> = {
  low: 'bg-slate-100 text-slate-500',
  medium: 'bg-sky-50 text-sky-700 border border-sky-200/50',
  high: 'bg-amber-50 text-amber-700 border border-amber-200/50',
  urgent: 'bg-rose-50 text-rose-700 border border-rose-200/50',
}

const PRIORITY_LABELS: Record<BoardTask['priority'], string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'حرجة',
}

const SCOPE_BADGES: Record<
  string,
  { label: string; badgeCls: string }
> = {
  simple: { label: 'بسيطة', badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  medium: { label: 'متوسطة', badgeCls: 'bg-sky-50 text-sky-700 border-sky-200/60' },
  large: { label: 'كبيرة', badgeCls: 'bg-purple-50 text-purple-700 border-purple-200/60' },
  strategic: { label: 'استراتيجية', badgeCls: 'bg-amber-50 text-amber-800 border-amber-200/60' },
}

function isOverdue(task: BoardTask): boolean {
  if (!task.due_date || ['completed', 'cancelled'].includes(task.status)) return false
  return new Date(task.due_date) < new Date(new Date().toDateString())
}

/** بطاقة مهمة واحدة — تدعم كافة الحالات والإجراءات الحية */
function TaskCard({
  task,
  currentUserId,
  canManage,
  busy,
  draggable,
  onDragStart,
  onStatusChange,
  onToggleLock,
  onEvaluate,
  onAccept,
  onReject,
  onReassign,
  onClaim,
}: {
  task: BoardTask
  currentUserId?: number
  canManage: boolean
  busy: boolean
  draggable: boolean
  onDragStart?: (e: DragEvent) => void
  onStatusChange: (status: string) => void
  onToggleLock: () => void
  onEvaluate: () => void
  onAccept: () => void
  onReject: () => void
  onReassign: () => void
  onClaim: () => void
}) {
  const overdue = isOverdue(task)
  const isAssignedToMe = task.assigned_to?.id === currentUserId
  const isPendingAcceptance = task.acceptance_status === 'pending'
  const isRejected = task.acceptance_status === 'rejected'
  const needsEval = task.status === 'needs_evaluation'
  const scopeBadge = task.task_scope ? SCOPE_BADGES[task.task_scope] : null

  return (
    <article
      draggable={draggable && !task.locked_at}
      onDragStart={onDragStart}
      className={`group rounded-2xl border p-4 transition text-right ${
        task.locked_at
          ? 'border-slate-200 bg-slate-50/80 opacity-90'
          : overdue
            ? 'border-rose-200 bg-rose-50/30 hover:border-rose-300'
            : isPendingAcceptance && isAssignedToMe
              ? 'border-customBlue/40 bg-customBlue/[0.02] shadow-sm ring-1 ring-customBlue/20'
              : 'border-slate-100 bg-white hover:border-customBlue/40 hover:shadow-md'
      } ${draggable && !task.locked_at ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* رأس البطاقة: العنوان والقفل */}
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`text-[13px] font-black leading-snug ${
            task.locked_at ? 'text-slate-500' : 'text-deepBlue'
          }`}
        >
          {task.title}
        </h3>
        {task.locked_at && (
          <Lock size={13} className="mt-0.5 shrink-0 text-slate-400" aria-label="مهمة مقفلة" />
        )}
      </div>

      {/* الوصف إن وُجد */}
      {task.description && (
        <p className="mt-1.5 text-[11px] font-medium text-slate-500 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* الشارات: الحجم، النقاط، الساعات، الأولوية */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {scopeBadge && (
          <span
            className={`rounded-lg border px-2 py-0.5 text-[10px] font-black ${scopeBadge.badgeCls}`}
          >
            {scopeBadge.label}
          </span>
        )}

        {task.points !== undefined && task.points !== null && (
          <span className="flex items-center gap-1 rounded-lg bg-customBlue/10 px-2 py-0.5 text-[10px] font-black text-customBlue">
            <Sparkles size={10} />
            {task.points} ن
          </span>
        )}

        {task.estimated_hours !== undefined && task.estimated_hours !== null && (
          <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
            <Clock size={10} />
            {task.estimated_hours} س
          </span>
        )}

        <span
          className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${
            PRIORITY_STYLES[task.priority]
          }`}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>

        {task.due_date && (
          <span
            className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black tabular-nums ${
              overdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Calendar size={10} />
            {overdue ? 'متأخرة: ' : ''}
            {task.due_date.slice(0, 10)}
          </span>
        )}
      </div>

      {/* المرفقات إن وُجدت */}
      {task.attachments && task.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.attachments.map((att) => (
            <a
              key={att.id}
              href={att.file_path}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200 transition"
            >
              <Paperclip size={10} />
              <span className="max-w-[90px] truncate">{att.file_name}</span>
            </a>
          ))}
        </div>
      )}

      {/* تنبيه المهمة المرفوضة */}
      {isRejected && (
        <div className="mt-2.5 rounded-xl bg-rose-50 border border-rose-200/60 p-2 text-[11px] text-rose-800">
          <p className="font-bold flex items-center gap-1">
            <XCircle size={12} className="text-rose-600" />
            اعتذر العضو: {task.rejection_reason ?? 'بلا سبب'}
          </p>
          {canManage && (
            <button
              type="button"
              onClick={onReassign}
              className="mt-1.5 flex items-center gap-1 text-[11px] font-black text-customBlue hover:underline"
            >
              <ArrowRightLeft size={12} />
              إعادة توجيه لعضو آخر
            </button>
          )}
        </div>
      )}

      {/* إجراءات موافقة العضو إذا كانت المهمة بانتظار موافقته */}
      {isPendingAcceptance && isAssignedToMe && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition"
          >
            <CheckCircle size={13} />
            قبول المهمة
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100 transition"
          >
            <XCircle size={13} />
            اعتذار
          </button>
        </div>
      )}

      {/* زر التقييم للمدير عند وصول المهمة لخانة بحاجة لتقييم */}
      {needsEval && canManage && (
        <div className="mt-3 border-t border-slate-100 pt-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={onEvaluate}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-1.5 text-xs font-black text-white shadow-sm hover:bg-amber-600 transition"
          >
            <Star size={13} className="fill-white" />
            تقييم واعتماد المهمة
          </button>
        </div>
      )}

      {/* مهمة غير مسندة موجهة للإدارة */}
      {!task.assigned_to && canManage && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={onClaim}
            className="flex-1 rounded-xl bg-customBlue/10 py-1.5 text-xs font-black text-customBlue hover:bg-customBlue/20 transition"
          >
            استلام المهمة لنفسي
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReassign}
            className="flex-1 rounded-xl border border-slate-200 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
          >
            إسناد لعضو
          </button>
        </div>
      )}

      {/* تذييل البطاقة: العضو المستلم وقائمة تغيير الحالة */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-50 pt-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-slate-600">
          <User size={12} className="shrink-0 text-customBlue" />
          <span className="truncate">
            {task.assigned_to?.name ?? (
              <span className="text-amber-600 font-black">غير مسندة (للإدارة)</span>
            )}
          </span>
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {!task.locked_at && (canManage || isAssignedToMe) && (
            <select
              value={task.status}
              disabled={busy}
              onChange={(e) => onStatusChange(e.target.value)}
              className="max-w-[7.5rem] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-black text-deepBlue outline-none focus:border-customBlue"
            >
              {BOARD_COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          {canManage && (
            <button
              disabled={busy}
              onClick={onToggleLock}
              title={task.locked_at ? 'فتح المهمة' : 'قفل المهمة (تسليم نهائي)'}
              className="rounded-lg border border-slate-200 p-1.5 text-deepBlue transition hover:border-customBlue disabled:opacity-50"
            >
              {task.locked_at ? <LockOpen size={11} /> : <Lock size={11} />}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function OperationsBoardPage() {
  const { user } = useAuth()
  const canManage = MANAGER_ROLES.has(user?.role ?? '')

  const [columns, setColumns] = useState<BoardColumns>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [view, setView] = useState<ViewMode>('kanban')
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  // النطاق الحالي للوحة: لوحة الأجايل الخاصة بي vs لوحة الإدارة
  const [boardScope, setBoardScope] = useState<BoardScope>(canManage ? 'all' : 'mine')

  // المرشحات
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])

  // النوافذ المنبثقة
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [evaluatingTask, setEvaluatingTask] = useState<BoardTask | null>(null)
  const [rejectingTask, setRejectingTask] = useState<BoardTask | null>(null)
  const [reassigningTask, setReassigningTask] = useState<BoardTask | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchOperationsBoard({
        scope: boardScope === 'mine' ? 'mine' : 'all',
        department_id: deptFilter ? Number(deptFilter) : undefined,
      })
      setColumns(data)
    } catch {
      toast.error('فشل تحميل لوحة التشغيل')
    } finally {
      setLoading(false)
    }
  }, [boardScope, deptFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void fetchDepartmentOptions()
      .then((rows) => {
        setDepartments(rows.map((r) => ({ id: r.id, name: r.name_ar || r.name || String(r.id) })))
      })
      .catch(() => setDepartments([]))
  }, [])

  const allTasks = useMemo(() => Object.values(columns).flat(), [columns])

  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (priorityFilter && t.priority !== priorityFilter) return false
      if (boardScope === 'pending_eval' && t.status !== 'needs_evaluation') return false
      if (boardScope === 'unassigned' && t.assigned_to) return false
      if (boardScope === 'rejected' && t.acceptance_status !== 'rejected') return false
      return true
    })
  }, [allTasks, search, priorityFilter, boardScope])

  const filteredColumns = useMemo(() => {
    const out: BoardColumns = {}
    for (const col of BOARD_COLUMNS) {
      out[col.key] = filteredTasks.filter((t) => t.status === col.key)
    }
    return out
  }, [filteredTasks])

  // إحصائيات سريعة
  const pendingEvaluationCount = useMemo(
    () => allTasks.filter((t) => t.status === 'needs_evaluation').length,
    [allTasks]
  )
  const unassignedCount = useMemo(() => allTasks.filter((t) => !t.assigned_to).length, [allTasks])
  const rejectedCount = useMemo(
    () => allTasks.filter((t) => t.acceptance_status === 'rejected').length,
    [allTasks]
  )
  const myPendingAcceptanceCount = useMemo(
    () =>
      allTasks.filter(
        (t) => t.assigned_to?.id === user?.id && t.acceptance_status === 'pending'
      ).length,
    [allTasks, user]
  )

  async function moveTask(task: BoardTask, status: string) {
    if (task.status === status) return
    setBusyId(task.id)
    try {
      await updateBoardTaskStatus(task.id, status)
      setColumns((cols) => {
        const next: BoardColumns = {}
        for (const [k, list] of Object.entries(cols)) {
          next[k] = list.filter((t) => t.id !== task.id)
        }
        next[status] = [{ ...task, status }, ...(next[status] ?? [])]
        return next
      })

      if (status === 'needs_evaluation') {
        toast.success('تم نقل المهمة إلى خانة "بحاجة لتقييم" وإشعار المدير.')
      } else {
        toast.success('تم تحديث حالة المهمة بنجاح')
      }
    } catch {
      toast.error('تعذر تحريك المهمة')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleLock(task: BoardTask) {
    setBusyId(task.id)
    try {
      if (task.locked_at) await unlockTask(task.id)
      else await lockTask(task.id)
      await load()
    } catch {
      toast.error('تعذر تغيير حالة القفل')
    } finally {
      setBusyId(null)
    }
  }

  async function handleAccept(task: BoardTask) {
    setBusyId(task.id)
    try {
      await acceptTask(task.id)
      toast.success('تمت الموافقة على استلام المهمة وانتقالها إلى لوحتك')
      await load()
    } catch {
      toast.error('تعذر قبول المهمة')
    } finally {
      setBusyId(null)
    }
  }

  async function handleClaim(task: BoardTask) {
    setBusyId(task.id)
    try {
      await claimTask(task.id)
      toast.success('تم استلام المهمة وتعيينها لك بنجاح')
      await load()
    } catch {
      toast.error('تعذر استلام المهمة')
    } finally {
      setBusyId(null)
    }
  }

  function handleDrop(e: DragEvent, status: string) {
    e.preventDefault()
    setDropTarget(null)
    const id = Number(e.dataTransfer.getData('text/task-id'))
    const task = allTasks.find((t) => t.id === id)
    if (task) void moveTask(task, status)
  }

  const viewButtons: Array<{ key: ViewMode; label: string; icon: typeof List }> = [
    { key: 'kanban', label: 'لوحة', icon: KanbanSquare },
    { key: 'list', label: 'قائمة', icon: List },
    { key: 'people', label: 'الأعضاء', icon: Users },
  ]

  return (
    <div dir="rtl" className="space-y-6">
      {/* رأس الصفحة الرئيسي */}
      <div className="flex flex-col gap-4 rounded-[1.6rem] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.06] md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-customBlue/10 px-2.5 py-0.5 text-[11px] font-black text-customBlue">
              EMC Agile & Operations
            </span>
            {myPendingAcceptanceCount > 0 && (
              <span className="animate-pulse rounded-lg bg-rose-500 px-2.5 py-0.5 text-[11px] font-black text-white">
                {myPendingAcceptanceCount} مهام بانتظار موافقتك
              </span>
            )}
          </div>
          <h1 className="mt-1.5 text-2xl font-black text-deepBlue">
            {boardScope === 'mine' ? 'لوحة الأجايل الخاصة بي' : 'لوحة التشغيل والأجايل العامة'}
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {boardScope === 'mine'
              ? 'تتبع مهامك المسندة إليك بحسب تطور حالاتها من التخطيط حتى اكتمال التقييم'
              : 'إدارة وتوجيه وتقييم مهام الإدارات والأعضاء بكامل دورة حياتها'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* طرق العرض (لوحة، قائمة، أعضاء) */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {viewButtons.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${
                  view === key ? 'bg-deepBlue text-white shadow-sm' : 'text-slate-500 hover:text-deepBlue'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void load()}
            title="تحديث اللوحة"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-deepBlue hover:bg-slate-50 transition"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* زر إسناد مهمة جديدة للمدراء */}
          {canManage && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-deepBlue px-4 py-2.5 text-xs font-black text-white shadow-md hover:bg-deepBlue/90 transition"
            >
              <Plus size={16} />
              إسناد مهمة جديدة
            </button>
          )}
        </div>
      </div>

      {/* تبويبات النطاق السريع للمهام */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          type="button"
          onClick={() => setBoardScope('mine')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
            boardScope === 'mine'
              ? 'bg-customBlue text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
          }`}
        >
          <User size={13} />
          لوحة الأجايل الخاصة بي
        </button>

        {canManage && (
          <button
            type="button"
            onClick={() => setBoardScope('all')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
              boardScope === 'all'
                ? 'bg-deepBlue text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
            }`}
          >
            <Users size={13} />
            لوحة الإدارة الكاملة
          </button>
        )}

        {canManage && (
          <button
            type="button"
            onClick={() => setBoardScope('pending_eval')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition ${
              boardScope === 'pending_eval'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-amber-700 hover:bg-amber-50 ring-1 ring-amber-200'
            }`}
          >
            <Star size={13} />
            بانتظار التقييم
            {pendingEvaluationCount > 0 && (
              <span className="rounded-full bg-white px-1.5 py-0.2 text-[10px] font-black text-amber-700">
                {pendingEvaluationCount}
              </span>
            )}
          </button>
        )}

        {canManage && unassignedCount > 0 && (
          <button
            type="button"
            onClick={() => setBoardScope('unassigned')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition ${
              boardScope === 'unassigned'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 ring-1 ring-slate-200'
            }`}
          >
            مهام الإدارة غير المسندة
            <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-black text-slate-800">
              {unassignedCount}
            </span>
          </button>
        )}

        {canManage && rejectedCount > 0 && (
          <button
            type="button"
            onClick={() => setBoardScope('rejected')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition ${
              boardScope === 'rejected'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-rose-700 hover:bg-rose-50 ring-1 ring-rose-200'
            }`}
          >
            <AlertCircle size={13} />
            مهام مرفوضة
            <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-black text-rose-700">
              {rejectedCount}
            </span>
          </button>
        )}
      </div>

      {/* شريط المرشحات السريعة */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50/70 p-3 ring-1 ring-slate-200/60">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالعنوان..."
            className="w-48 rounded-xl border border-slate-200 bg-white py-1.5 pr-8 pl-3 text-xs font-bold text-deepBlue placeholder:text-slate-400 focus:border-customBlue"
          />
        </div>

        {canManage && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-deepBlue"
          >
            <option value="">كل الإدارات</option>
            {departments.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-deepBlue"
        >
          <option value="">كل الأولويات</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* لوحة الكانبان (الأعمدة الـ 9) */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1" dir="rtl">
          {BOARD_COLUMNS.map((col) => {
            const list = filteredColumns[col.key] ?? []
            const isTarget = dropTarget === col.key
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDropTarget(col.key)
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`flex w-72 shrink-0 flex-col rounded-2xl border transition ${
                  isTarget
                    ? 'border-customBlue bg-customBlue/[0.04] ring-2 ring-customBlue/30'
                    : 'border-slate-200/80 bg-slate-50/50'
                }`}
              >
                {/* رأس العمود */}
                <header className="flex items-center justify-between border-b border-slate-200/70 p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-customBlue" />
                    <h2 className="text-xs font-black text-deepBlue">{col.label}</h2>
                  </div>
                  <span className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-black text-slate-500 shadow-sm ring-1 ring-slate-200/60">
                    {list.length}
                  </span>
                </header>

                {/* بطاقات المهام داخل العمود */}
                <div className="flex-1 space-y-3 p-3 overflow-y-auto max-h-[72vh]">
                  {list.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      currentUserId={user?.id}
                      canManage={canManage}
                      busy={busyId === task.id}
                      draggable={true}
                      onDragStart={(e) => e.dataTransfer.setData('text/task-id', String(task.id))}
                      onStatusChange={(status) => void moveTask(task, status)}
                      onToggleLock={() => void toggleLock(task)}
                      onEvaluate={() => setEvaluatingTask(task)}
                      onAccept={() => void handleAccept(task)}
                      onReject={() => setRejectingTask(task)}
                      onReassign={() => setReassigningTask(task)}
                      onClaim={() => void handleClaim(task)}
                    />
                  ))}
                  {list.length === 0 && (
                    <p className="py-6 text-center text-xs font-semibold text-slate-400">
                      لا مهام هنا
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* عرض القائمة */}
      {view === 'list' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black">
              <tr>
                <th className="p-3.5">المهمة</th>
                <th className="p-3.5">الإدارة</th>
                <th className="p-3.5">المكلف</th>
                <th className="p-3.5">الحجم</th>
                <th className="p-3.5">النقاط</th>
                <th className="p-3.5">الساعات</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5">الأولوية</th>
                <th className="p-3.5">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-deepBlue">
              {filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3.5">
                    <p className="font-black">{t.title}</p>
                    {t.rejection_reason && (
                      <p className="text-[10px] text-rose-600">اعتذار: {t.rejection_reason}</p>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-500">{t.department?.name ?? '—'}</td>
                  <td className="p-3.5">{t.assigned_to?.name ?? <span className="text-amber-600">غير مسندة</span>}</td>
                  <td className="p-3.5">
                    {t.task_scope ? (
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] ${SCOPE_BADGES[t.task_scope]?.badgeCls}`}>
                        {SCOPE_BADGES[t.task_scope]?.label}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-3.5 text-customBlue">{t.points ? `${t.points} ن` : '—'}</td>
                  <td className="p-3.5 text-emerald-700">{t.estimated_hours ? `${t.estimated_hours} س` : '—'}</td>
                  <td className="p-3.5">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px]">
                      {BOARD_COLUMNS.find((c) => c.key === t.status)?.label ?? t.status}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${PRIORITY_STYLES[t.priority]}`}>
                      {PRIORITY_LABELS[t.priority]}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      {t.status === 'needs_evaluation' && canManage && (
                        <button
                          type="button"
                          onClick={() => setEvaluatingTask(t)}
                          className="rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-black text-white hover:bg-amber-600"
                        >
                          تقييم
                        </button>
                      )}
                      {t.acceptance_status === 'pending' && t.assigned_to?.id === user?.id && (
                        <button
                          type="button"
                          onClick={() => void handleAccept(t)}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-black text-white hover:bg-emerald-700"
                        >
                          قبول
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* نوافذ الإجراءات التفاعلية */}
      <TaskCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => void load()}
      />

      <TaskEvaluationModal
        task={evaluatingTask}
        open={Boolean(evaluatingTask)}
        onClose={() => setEvaluatingTask(null)}
        onEvaluated={() => void load()}
      />

      <TaskRejectModal
        task={rejectingTask}
        open={Boolean(rejectingTask)}
        onClose={() => setRejectingTask(null)}
        onRejected={() => void load()}
      />

      <TaskReassignModal
        task={reassigningTask}
        open={Boolean(reassigningTask)}
        onClose={() => setReassigningTask(null)}
        onReassigned={() => void load()}
      />
    </div>
  )
}
