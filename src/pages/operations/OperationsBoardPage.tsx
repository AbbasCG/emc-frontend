import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import {
  CalendarDays,
  KanbanSquare,
  List,
  Lock,
  LockOpen,
  Plus,
  RefreshCw,
  Search,
  User,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { fetchDepartmentOptions } from '@/api/jobTitlesApi'
import { fetchDepartmentMembers, type DepartmentMember } from '@/api/operationsReportsApi'
import {
  BOARD_COLUMNS,
  createBoardTask,
  fetchOperationsBoard,
  lockTask,
  unlockTask,
  updateBoardTaskStatus,
  type BoardColumns,
  type BoardTask,
} from '@/api/operationsBoardApi'

/**
 * لوحة التشغيل v2 — مستلهمة من Asana/Monday لتكون مساحة عمل فعلية لا عرضًا:
 * ثلاث طرق عرض (لوحة كانبان بسحب وإفلات · قائمة · أعباء الأعضاء)، مرشحات حية،
 * إنشاء سريع للمدراء، تحريك حالة بالسحب أو بالقائمة، وقفل التسليم النهائي.
 * العضو يحرّك مهامه فقط؛ المدير يحرّك الجميع (يفرضه الخادم).
 */

type ViewMode = 'kanban' | 'list' | 'people'

const MANAGER_ROLES = new Set([
  'admin', 'super_admin', 'tech_admin', 'executive_admin',
  'hr_manager', 'operations_manager', 'department_manager',
])

const PRIORITY_STYLES: Record<BoardTask['priority'], string> = {
  low: 'bg-slate-100 text-slate-500',
  medium: 'bg-sky/60 text-deepBlue',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-600',
}

const PRIORITY_LABELS: Record<BoardTask['priority'], string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
}

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  BOARD_COLUMNS.map((c) => [c.key, c.label]),
)

const fieldClass =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue outline-none transition-colors focus:border-customBlue'

function isOverdue(task: BoardTask): boolean {
  if (!task.due_date || ['completed', 'cancelled'].includes(task.status)) return false
  return new Date(task.due_date) < new Date(new Date().toDateString())
}

/** بطاقة مهمة واحدة — تُستخدم في الكانبان وعرض الأعضاء. */
function TaskCard({
  task,
  canLock,
  canMove,
  busy,
  draggable,
  onDragStart,
  onStatusChange,
  onToggleLock,
}: {
  task: BoardTask
  canLock: boolean
  canMove: boolean
  busy: boolean
  draggable: boolean
  onDragStart?: (e: DragEvent) => void
  onStatusChange: (status: string) => void
  onToggleLock: () => void
}) {
  const overdue = isOverdue(task)
  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      className={`group rounded-xl border p-3 transition ${
        task.locked_at
          ? 'border-slate-200 bg-slate-50/70'
          : overdue
            ? 'border-red-200 bg-red-50/40 hover:border-red-300'
            : 'border-slate-100 bg-white hover:border-customBlue/40 hover:shadow-sm'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`text-[13px] font-black leading-snug ${task.locked_at ? 'text-slate-500' : 'text-deepBlue'}`}>
          {task.title}
        </h3>
        {task.locked_at ? <Lock size={13} className="mt-0.5 shrink-0 text-slate-400" aria-label="مهمة مقفلة" /> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${PRIORITY_STYLES[task.priority]}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>
        {task.department && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            {task.department.name}
          </span>
        )}
        {task.due_date && (
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black tabular-nums ${overdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
            {overdue ? 'متأخرة · ' : ''}{task.due_date.slice(0, 10)}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-ink-500">
          <User size={12} className="shrink-0 text-customBlue" aria-hidden />
          <span className="truncate">{task.assigned_to?.name ?? 'غير معيَّنة'}</span>
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {canMove && !task.locked_at && (
            <select
              value={task.status}
              disabled={busy}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="تغيير الحالة"
              className="max-w-[7.5rem] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-black text-deepBlue outline-none focus:border-customBlue"
            >
              {BOARD_COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          )}
          {canLock && (
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
  const [columns, setColumns] = useState<BoardColumns>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [view, setView] = useState<ViewMode>('kanban')
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  // المرشحات
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  // الإنشاء السريع (للمدراء)
  const canManage = MANAGER_ROLES.has(user?.role ?? '')
  const [showComposer, setShowComposer] = useState(false)
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])
  const [composerMembers, setComposerMembers] = useState<DepartmentMember[]>([])
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({
    title: '',
    department_id: '' as number | '',
    assigned_to: '' as number | '',
    priority: 'medium' as BoardTask['priority'],
    status: 'in_progress',
    due_date: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setColumns(await fetchOperationsBoard())
    } catch {
      toast.error('فشل تحميل لوحة التشغيل')
    } finally {
      setLoading(false)
    }
  }, [])

  // Mount fetch — inline async IIFE per effect-patterns.md.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await fetchOperationsBoard()
        if (alive) setColumns(data)
      } catch {
        if (alive) toast.error('فشل تحميل لوحة التشغيل')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    void fetchDepartmentOptions()
      .then((rows) => {
        if (alive) setDepartments(rows.map((r) => ({ id: r.id, name: r.name_ar || r.name || String(r.id) })))
      })
      .catch(() => {
        if (alive) setDepartments([])
      })
    return () => {
      alive = false
    }
  }, [])

  const allTasks = useMemo(() => Object.values(columns).flat(), [columns])

  /** خيارات مرشح العضو تُشتق من اللوحة نفسها — بلا نقطة إضافية ولا صلاحيات زائدة. */
  const assignees = useMemo(() => {
    const map = new Map<number, string>()
    for (const t of allTasks) if (t.assigned_to) map.set(t.assigned_to.id, t.assigned_to.name)
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [allTasks])

  const matches = useCallback(
    (t: BoardTask) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (deptFilter && String(t.department?.id ?? '') !== deptFilter) return false
      if (assigneeFilter && String(t.assigned_to?.id ?? '') !== assigneeFilter) return false
      if (priorityFilter && t.priority !== priorityFilter) return false
      return true
    },
    [search, deptFilter, assigneeFilter, priorityFilter],
  )

  const filteredColumns = useMemo(() => {
    const out: BoardColumns = {}
    for (const [k, list] of Object.entries(columns)) out[k] = list.filter(matches)
    return out
  }, [columns, matches])

  const filteredTasks = useMemo(() => Object.values(filteredColumns).flat(), [filteredColumns])

  const totals = useMemo(
    () => ({
      total: filteredTasks.length,
      locked: filteredTasks.filter((t) => t.locked_at).length,
      overdue: filteredTasks.filter(isOverdue).length,
    }),
    [filteredTasks],
  )

  async function moveTask(task: BoardTask, status: string) {
    if (task.status === status) return
    setBusyId(task.id)
    try {
      await updateBoardTaskStatus(task.id, status)
      // تحديث تفاؤلي محلي — بلا إعادة تحميل كاملة
      setColumns((cols) => {
        const next: BoardColumns = {}
        for (const [k, list] of Object.entries(cols)) next[k] = list.filter((t) => t.id !== task.id)
        next[status] = [{ ...task, status }, ...(next[status] ?? [])]
        return next
      })
    } catch {
      toast.error('تعذر تحريك المهمة — ربما ليست معيَّنة لك')
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

  async function pickComposerDept(id: number | '') {
    setDraft((d) => ({ ...d, department_id: id, assigned_to: '' }))
    setComposerMembers([])
    if (id) {
      try {
        setComposerMembers(await fetchDepartmentMembers(id))
      } catch {
        setComposerMembers([])
      }
    }
  }

  async function createTask() {
    if (!draft.title.trim()) {
      toast.error('اكتب عنوان المهمة')
      return
    }
    setCreating(true)
    try {
      await createBoardTask({
        title: draft.title.trim(),
        department_id: draft.department_id || undefined,
        assigned_to: draft.assigned_to || undefined,
        priority: draft.priority,
        status: draft.status,
        due_date: draft.due_date || undefined,
      })
      toast.success('أُنشئت المهمة')
      setDraft({ title: '', department_id: '', assigned_to: '', priority: 'medium', status: 'in_progress', due_date: '' })
      setShowComposer(false)
      await load()
    } catch {
      toast.error('تعذر إنشاء المهمة')
    } finally {
      setCreating(false)
    }
  }

  function handleDrop(e: DragEvent, status: string) {
    e.preventDefault()
    setDropTarget(null)
    const id = Number(e.dataTransfer.getData('text/task-id'))
    const task = allTasks.find((t) => t.id === id)
    if (task) void moveTask(task, status)
  }

  const canMoveTask = (t: BoardTask) => canManage || t.assigned_to?.id === user?.id

  const viewButtons: Array<{ key: ViewMode; label: string; icon: typeof List }> = [
    { key: 'kanban', label: 'لوحة', icon: KanbanSquare },
    { key: 'list', label: 'قائمة', icon: List },
    { key: 'people', label: 'الأعضاء', icon: Users },
  ]

  return (
    <div dir="rtl" className="space-y-5">
      {/* الرأس: العنوان + طرق العرض + الإنشاء */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">Operations</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">لوحة التشغيل</h1>
          <p className="mt-1 text-sm text-deepBlue/50">
            {totals.total} مهمة · {totals.overdue > 0 ? `${totals.overdue} متأخرة · ` : ''}{totals.locked} مقفلة — يراها كل الفريق
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            {viewButtons.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                aria-pressed={view === key}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${
                  view === key ? 'bg-deepBlue text-white' : 'text-slate-500 hover:text-deepBlue'
                }`}
              >
                <Icon size={13} aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => void load()}
            aria-label="تحديث"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-deepBlue hover:bg-slate-50"
          >
            <RefreshCw size={15} />
          </button>
          {canManage && (
            <button
              onClick={() => setShowComposer((v) => !v)}
              className="flex items-center gap-2 rounded-xl bg-customOrange px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-ember"
            >
              <Plus size={15} /> مهمة جديدة
            </button>
          )}
        </div>
      </div>

      {/* الإنشاء السريع */}
      {showComposer && (
        <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void createTask()
            }}
            placeholder="عنوان المهمة…"
            className={`${fieldClass} lg:col-span-2`}
          />
          <select value={draft.department_id} onChange={(e) => void pickComposerDept(e.target.value ? Number(e.target.value) : '')} className={fieldClass}>
            <option value="">الإدارة…</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={draft.assigned_to}
            onChange={(e) => setDraft((d) => ({ ...d, assigned_to: e.target.value ? Number(e.target.value) : '' }))}
            disabled={!draft.department_id}
            className={fieldClass}
          >
            <option value="">{draft.department_id ? 'المكلَّف…' : 'اختر الإدارة أولاً'}</option>
            {composerMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <select value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as BoardTask['priority'] }))} className={fieldClass}>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>أولوية: {v}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input type="date" dir="ltr" value={draft.due_date} onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))} className={`${fieldClass} flex-1`} />
            <button
              disabled={creating}
              onClick={() => void createTask()}
              className="rounded-xl bg-deepBlue px-4 py-2 text-xs font-extrabold text-white transition hover:bg-deepBlue/90 disabled:opacity-60"
            >
              {creating ? '…' : 'إنشاء'}
            </button>
          </div>
        </div>
      )}

      {/* المرشحات */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في المهام…"
            className={`${fieldClass} w-52 ps-8`}
          />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={fieldClass}>
          <option value="">كل الإدارات</option>
          {departments.map((d) => (
            <option key={d.id} value={String(d.id)}>{d.name}</option>
          ))}
        </select>
        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className={fieldClass}>
          <option value="">كل الأعضاء</option>
          {assignees.map((a) => (
            <option key={a.id} value={String(a.id)}>{a.name}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={fieldClass}>
          <option value="">كل الأولويات</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {(search || deptFilter || assigneeFilter || priorityFilter) && (
          <button
            onClick={() => {
              setSearch('')
              setDeptFilter('')
              setAssigneeFilter('')
              setPriorityFilter('')
            }}
            className="text-xs font-black text-customBlue hover:underline"
          >
            مسح المرشحات
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : view === 'kanban' ? (
        /* ── عرض الكانبان: سحب وإفلات بين الأعمدة ── */
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4">
            {BOARD_COLUMNS.map((col) => {
              const tasks = filteredColumns[col.key] ?? []
              if (tasks.length === 0 && ['postponed', 'cancelled'].includes(col.key)) return null
              return (
                <section
                  key={col.key}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDropTarget(col.key)
                  }}
                  onDragLeave={() => setDropTarget((t) => (t === col.key ? null : t))}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className={`w-72 shrink-0 rounded-2xl transition ${dropTarget === col.key ? 'ring-2 ring-customBlue/60' : ''}`}
                >
                  <header className="flex items-center justify-between rounded-t-2xl border border-b-0 border-slate-100 bg-slate-50/80 px-4 py-2.5">
                    <h2 className="text-xs font-black text-deepBlue">{col.label}</h2>
                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-black tabular-nums text-slate-500">
                      {tasks.length}
                    </span>
                  </header>
                  <div className="min-h-[6rem] space-y-2.5 rounded-b-2xl border border-slate-100 bg-white p-3">
                    {tasks.length === 0 && (
                      <p className="py-5 text-center text-[11px] font-bold text-slate-300">أسقط مهمة هنا</p>
                    )}
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        canLock={canManage}
                        canMove={canMoveTask(task)}
                        busy={busyId === task.id}
                        draggable={canMoveTask(task) && !task.locked_at}
                        onDragStart={(e) => e.dataTransfer.setData('text/task-id', String(task.id))}
                        onStatusChange={(s) => void moveTask(task, s)}
                        onToggleLock={() => void toggleLock(task)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      ) : view === 'list' ? (
        /* ── عرض القائمة: جدول كثيف بتحرير حالة مباشر ── */
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 text-start">المهمة</th>
                <th className="px-4 py-3 text-start">الإدارة</th>
                <th className="px-4 py-3 text-start">المكلَّف</th>
                <th className="px-4 py-3 text-start">الأولوية</th>
                <th className="px-4 py-3 text-start">الاستحقاق</th>
                <th className="px-4 py-3 text-start">الحالة</th>
                <th className="px-4 py-3 text-start">قفل</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs font-bold text-slate-400">
                    لا مهام مطابقة
                  </td>
                </tr>
              )}
              {filteredTasks.map((task) => (
                <tr key={task.id} className={`border-b border-slate-50 last:border-0 ${task.locked_at ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-black text-deepBlue">
                      {task.locked_at && <Lock size={11} className="text-slate-400" aria-hidden />}
                      {task.title}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-500">{task.department?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-bold text-ink-600">{task.assigned_to?.name ?? 'غير معيَّنة'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${PRIORITY_STYLES[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-black tabular-nums ${isOverdue(task) ? 'text-red-600' : 'text-slate-500'}`}>
                    {task.due_date ? task.due_date.slice(0, 10) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {canMoveTask(task) && !task.locked_at ? (
                      <select
                        value={task.status}
                        disabled={busyId === task.id}
                        onChange={(e) => void moveTask(task, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-black text-deepBlue outline-none focus:border-customBlue"
                      >
                        {BOARD_COLUMNS.map((c) => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[11px] font-black text-slate-500">{STATUS_LABELS[task.status] ?? task.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManage && (
                      <button
                        disabled={busyId === task.id}
                        onClick={() => void toggleLock(task)}
                        className="rounded-lg border border-slate-200 p-1.5 text-deepBlue transition hover:border-customBlue disabled:opacity-50"
                      >
                        {task.locked_at ? <LockOpen size={11} /> : <Lock size={11} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── عرض الأعضاء: من يحمل ماذا — أعباء العمل ── */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...assignees, { id: 0, name: 'غير معيَّنة' }].map((person) => {
            const personTasks = filteredTasks.filter((t) =>
              person.id === 0 ? !t.assigned_to : t.assigned_to?.id === person.id,
            )
            if (personTasks.length === 0) return null
            const open = personTasks.filter((t) => !['completed', 'cancelled'].includes(t.status)).length
            const overdueCount = personTasks.filter(isOverdue).length
            return (
              <section key={person.id} className="rounded-2xl border border-slate-100 bg-white">
                <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-black text-deepBlue">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky/60 text-[11px] font-black text-deepBlue">
                      {person.name.slice(0, 2)}
                    </span>
                    {person.name}
                  </span>
                  <span className="flex items-center gap-2 text-[11px] font-black">
                    <span className="text-slate-500">{open} نشطة</span>
                    {overdueCount > 0 && <span className="text-red-600">{overdueCount} متأخرة</span>}
                  </span>
                </header>
                <div className="space-y-2 p-3">
                  {personTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      canLock={canManage}
                      canMove={canMoveTask(task)}
                      busy={busyId === task.id}
                      draggable={false}
                      onStatusChange={(s) => void moveTask(task, s)}
                      onToggleLock={() => void toggleLock(task)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
          {filteredTasks.length === 0 && (
            <p className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs font-bold text-slate-400">
              <CalendarDays size={22} className="mx-auto mb-2 text-slate-300" />
              لا مهام مطابقة للمرشحات
            </p>
          )}
        </div>
      )}
    </div>
  )
}
