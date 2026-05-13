import { motion } from 'framer-motion'
import type { OpsTask } from '@/types/operations'
import OpsPriorityBadge from './OpsPriorityBadge'
import OpsTaskStatusBadge from './OpsTaskStatusBadge'

type Props = {
  task: OpsTask
  onOpen: () => void
}

export default function TaskCard({ task, onOpen }: Props) {
  const pct =
    task.checklist_total && task.checklist_total > 0 && task.checklist_done != null
      ? Math.round((task.checklist_done / task.checklist_total) * 100)
      : 0

  return (
    <motion.button
      type="button"
      layout
      onClick={onOpen}
      whileHover={{ scale: 1.01 }}
      className="w-full rounded-xl border border-deepBlue/[0.06] bg-white p-4 text-right shadow-sm ring-1 ring-transparent transition hover:border-customBlue/25 hover:ring-customBlue/15"
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        <OpsTaskStatusBadge status={task.status} />
        <OpsPriorityBadge p={task.priority} />
      </div>
      <h4 className="mt-2 text-sm font-black leading-snug text-deepBlue">{task.title}</h4>
      <p className="mt-1 text-[11px] font-bold text-slate-500">{task.department_name}</p>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-[10px] font-bold text-slate-400">
        <span>{task.assignee_name ?? 'بدون مسؤول'}</span>
        {task.due_at && <span className="text-customOrange">استحقاق: {task.due_at}</span>}
      </div>
      {task.tags && task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-end gap-1">
          {task.tags.map((t) => (
            <span key={t} className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[9px] font-black text-slate-500">
              {t}
            </span>
          ))}
        </div>
      )}
      {pct > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] font-black text-slate-400">
            <span>{pct}%</span>
            <span>القائمة</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-customBlue"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </motion.button>
  )
}
