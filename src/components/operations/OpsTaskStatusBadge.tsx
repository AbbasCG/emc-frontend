import type { TaskStatus } from '@/types/operations'
import { TASK_STATUS_AR } from '@/data/operationsLabels'

export default function OpsTaskStatusBadge({ status }: { status: TaskStatus }) {
  const cls =
    status === 'done'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      : status === 'cancelled'
        ? 'bg-slate-100 text-slate-500 ring-slate-100'
        : status === 'in_progress'
          ? 'bg-customBlue/10 text-customBlue ring-customBlue/20'
          : status === 'needs_review'
            ? 'bg-violet-50 text-violet-700 ring-violet-100'
            : 'bg-amber-50 text-amber-800 ring-amber-100'

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${cls}`}>
      {TASK_STATUS_AR[status]}
    </span>
  )
}
