import OpsTaskTabs from '@/components/operations/OpsTaskTabs'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import KanbanBoard from '@/components/operations/KanbanBoard'
import OpsLoadError from '@/components/operations/OpsLoadError'
import TaskDetailPanel from '@/components/operations/TaskDetailPanel'
import { useTasksWorkspace } from '../hooks/useTasksWorkspace'

export default function OpsTasksKanbanPage() {
  const { tasks, loading, error, reload, selected, panelOpen, openTask, closePanel, onPatch, onToggleChecklist, onComment } =
    useTasksWorkspace('kanban')

  if (loading) return <OpsPageSkeleton />

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-[1.35rem] bg-white p-6 shadow-md ring-1 ring-deepBlue/[0.06] md:flex-row md:items-center md:justify-between">
        <div className="text-right">
          <h1 className="text-xl font-black text-deepBlue">إدارة المهام — لوحة كانبان</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">كل مهام الفريق موزّعة على مراحل دورة الحياة</p>
        </div>
        <OpsTaskTabs />
      </header>

      {error ? (
        <OpsLoadError title="تعذّر تحميل لوحة المهام" onRetry={() => void reload()} />
      ) : (
        <KanbanBoard tasks={tasks} onOpenTask={openTask} />
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
