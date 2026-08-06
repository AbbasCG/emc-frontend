import type { OpsTask, TaskStatus } from '@/types/operations'
import { TASK_STATUS_AR, TASK_STATUS_ORDER } from '@/data/operationsLabels'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'

type Props = {
  tasks: OpsTask[]
  onOpenTask: (t: OpsTask) => void
}

export default function KanbanBoard({ tasks, onOpenTask }: Props) {
  const byStatus = TASK_STATUS_ORDER.reduce<Record<TaskStatus, OpsTask[]>>((acc, st) => {
    acc[st] = tasks.filter((t) => t.status === st)
    return acc
  }, {} as Record<TaskStatus, OpsTask[]>)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1" dir="rtl">
      {TASK_STATUS_ORDER.map((st) => (
        <KanbanColumn key={st} title={TASK_STATUS_AR[st]} count={byStatus[st].length}>
          {byStatus[st].map((t) => (
            <TaskCard key={t.id} task={t} onOpen={() => onOpenTask(t)} />
          ))}
        </KanbanColumn>
      ))}
    </div>
  )
}
