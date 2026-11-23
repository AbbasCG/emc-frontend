import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import OpsTaskTabs from '@/components/operations/OpsTaskTabs'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import OpsLoadError from '@/components/operations/OpsLoadError'
import TaskCard from '@/components/operations/TaskCard'
import TaskDetailPanel from '@/components/operations/TaskDetailPanel'
import EmptyState from '@/components/dashboard/EmptyState'
import { ClipboardList } from 'lucide-react'
import { TASK_STATUS_AR } from '@/data/operationsLabels'
import { fetchWorkspaceDepartments } from '@/api/operationsApi'
import { groupParentsUnknown, isGroupTask, isUnassignedTask } from '@/lib/opsTaskKinds'
import type { TaskStatus, WorkspaceDepartment } from '@/types/operations'
import { useTasksWorkspace } from '../hooks/useTasksWorkspace'

type Kind = 'all' | 'unassigned' | 'group'

const KINDS: { id: Kind; label: string }[] = [
  { id: 'all', label: 'كل المهام' },
  { id: 'unassigned', label: 'غير المسندة' },
  { id: 'group', label: 'المهام الجماعية' },
]

/**
 * «إدارة المهام»: every task the user may manage — assigned, group, and still-unassigned ones. «مهامي ومسؤولياتي»
 * (the user's own work, tickets included) is a separate page.
 */
export default function OpsTasksListPage() {
  const { tasks, loading, error, reload, selected, panelOpen, openTask, closePanel, onPatch, onToggleChecklist, onComment } =
    useTasksWorkspace('all')
  const [dept, setDept] = useState<string>('all')
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const [kind, setKind] = useState<Kind>('all')
  const [depts, setDepts] = useState<WorkspaceDepartment[]>([])
  const [deptsFailed, setDeptsFailed] = useState(false)

  useEffect(() => {
    fetchWorkspaceDepartments()
      .then((r) => setDepts(r.items))
      .catch(() => setDeptsFailed(true))
  }, [])

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (dept !== 'all' && t.department_id !== dept) return false
      if (status !== 'all' && t.status !== status) return false
      if (kind === 'unassigned' && !isUnassignedTask(t)) return false
      if (kind === 'group' && !isGroupTask(t)) return false
      return true
    })
  }, [tasks, dept, status, kind])

  if (loading) return <OpsPageSkeleton />

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-[1.35rem] bg-white p-6 shadow-md ring-1 ring-deepBlue/[0.06] md:flex-row md:items-center md:justify-between">
        <div className="text-right">
          <h1 className="text-xl font-black text-deepBlue">إدارة المهام</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            كل المهام ضمن صلاحياتك: المسندة والجماعية وغير المسندة — مع مرشحات سريعة
          </p>
        </div>
        <OpsTaskTabs />
      </header>

      <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl bg-deepBlue/[0.03] p-4 ring-1 ring-deepBlue/[0.06]">
        <div role="group" aria-label="نوع المهام" className="inline-flex rounded-xl bg-white p-1 ring-1 ring-deepBlue/[0.08]">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${kind === k.id ? 'bg-deepBlue text-white' : 'text-deepBlue/70 hover:bg-slate-50'}`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs font-black text-deepBlue">
          الإدارة
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-deepBlue"
          >
            <option value="all">الكل</option>
            {depts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-black text-deepBlue">
          الحالة
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus | 'all')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-deepBlue"
          >
            <option value="all">الكل</option>
            {(Object.keys(TASK_STATUS_AR) as TaskStatus[]).map((k) => (
              <option key={k} value={k}>
                {TASK_STATUS_AR[k]}
              </option>
            ))}
          </select>
        </label>
        {kind === 'group' && groupParentsUnknown(tasks) ? (
          <span role="note" className="basis-full text-end text-[11px] font-bold text-slate-500" data-testid="group-filter-note">
            تظهر هنا النسخ المرتبطة بمهمة أم فقط؛ عدد النسخ للمهمة الأم غير متاح من الخادم في هذه القائمة.
          </span>
        ) : null}
        {deptsFailed ? (
          <span role="status" className="text-[11px] font-bold text-amber-700">
            تعذّر تحميل قائمة الإدارات؛ مرشح الإدارة غير متاح الآن.
          </span>
        ) : null}
      </div>

      {error ? (
        <OpsLoadError title="تعذّر تحميل المهام" onRetry={() => void reload()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="لا مهام ضمن المرشح" />
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TaskCard key={t.id} task={t} onOpen={() => openTask(t)} />
          ))}
        </motion.div>
      )}

      <TaskDetailPanel
        task={selected}
        open={panelOpen}
        onClose={closePanel}
        onPatch={onPatch}
        onToggleChecklist={onToggleChecklist}
        onComment={onComment}
      />
    </div>
  )
}
