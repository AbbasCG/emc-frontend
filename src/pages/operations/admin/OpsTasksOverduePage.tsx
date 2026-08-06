import { motion } from 'framer-motion'
import OpsTaskTabs from '@/components/operations/OpsTaskTabs'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import TaskCard from '@/components/operations/TaskCard'
import TaskDetailPanel from '@/components/operations/TaskDetailPanel'
import EmptyState from '@/components/dashboard/EmptyState'
import { AlarmClock } from 'lucide-react'
import { useTasksWorkspace } from '../hooks/useTasksWorkspace'

export default function OpsTasksOverduePage() {
  const { tasks, loading, selected, panelOpen, openTask, closePanel, onPatch, onToggleChecklist, onComment } =
    useTasksWorkspace('overdue')

  if (loading) return <OpsPageSkeleton />

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-[1.35rem] border border-red-100 bg-gradient-to-bl from-red-50/80 to-white p-6 shadow-md md:flex-row md:items-center md:justify-between">
        <div className="text-right">
          <h1 className="text-xl font-black text-deepBlue">المهام المتأخرة</h1>
          <p className="mt-1 text-xs font-semibold text-red-700/80">أولوية التصحيح والمتابعة الميدانية</p>
        </div>
        <OpsTaskTabs />
      </header>

      {tasks.length === 0 ? (
        <EmptyState
          icon={AlarmClock}
          title="لا توجد مهام متأخرة"
          description="جميع المهام ضمن وعد التسليم أو مكتملة."
        />
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((t) => (
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
