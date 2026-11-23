import type { OpsTask, TaskStatus } from '@/types/operations'
import { TASK_STATUS_AR, TASK_STATUS_ORDER } from '@/data/operationsLabels'
import StatusBoard from '@/components/ui/StatusBoard'
import TaskCard from './TaskCard'

type Props = {
  tasks: OpsTask[]
  onOpenTask: (t: OpsTask) => void
}

/**
 * The management kanban: one column per task status, laid out by the shared {@link StatusBoard} (columns wrap to
 * the width on wide screens; one status at a time, chosen from a segmented control, on narrow ones).
 */
export default function KanbanBoard({ tasks, onOpenTask }: Props) {
  const byStatus = TASK_STATUS_ORDER.reduce<Record<TaskStatus, OpsTask[]>>((acc, st) => {
    acc[st] = tasks.filter((t) => t.status === st)
    return acc
  }, {} as Record<TaskStatus, OpsTask[]>)

  return (
    <StatusBoard
      ariaLabel="حالات المهام"
      testId="tasks-kanban"
      emptyText="لا مهام في هذه الحالة"
      columns={TASK_STATUS_ORDER.map((st) => ({
        key: st,
        label: TASK_STATUS_AR[st],
        count: byStatus[st].length,
        children: byStatus[st].map((t) => <TaskCard key={t.id} task={t} onOpen={() => onOpenTask(t)} />),
      }))}
    />
  )
}
