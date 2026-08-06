import type { TaskPriority } from '@/types/operations'
import { TASK_PRIORITY_AR } from '@/data/operationsLabels'

export default function OpsPriorityBadge({ p }: { p: TaskPriority }) {
  const cls =
    p === 'critical'
      ? 'bg-red-50 text-red-700 ring-red-100'
      : p === 'high'
        ? 'bg-orange-50 text-customOrange ring-orange-100'
        : p === 'medium'
          ? 'bg-sky-50 text-customBlue ring-sky-100'
          : 'bg-slate-50 text-slate-600 ring-slate-100'

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${cls}`}>
      {TASK_PRIORITY_AR[p]}
    </span>
  )
}
