import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Award,
  CheckCircle,
  Clock,
  ExternalLink,
  KanbanSquare,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import OpsTaskTabs from '@/components/operations/OpsTaskTabs'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import TaskCard from '@/components/operations/TaskCard'
import TaskDetailPanel from '@/components/operations/TaskDetailPanel'
import TaskRejectModal from '@/components/operations/TaskRejectModal'
import EmptyState from '@/components/dashboard/EmptyState'
import {
  acceptTask,
  fetchPendingAcceptanceTasks,
  type BoardTask,
} from '@/api/operationsBoardApi'
import { useTasksWorkspace } from '../hooks/useTasksWorkspace'

export default function OpsTasksMyPage() {
  const {
    tasks,
    loading,
    selected,
    panelOpen,
    openTask,
    closePanel,
    onPatch,
    onToggleChecklist,
    onComment,
    reload,
  } = useTasksWorkspace('mine')

  const [pendingTasks, setPendingTasks] = useState<BoardTask[]>([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [rejectingTask, setRejectingTask] = useState<BoardTask | null>(null)
  const [actingId, setActingId] = useState<number | null>(null)

  const loadPending = async () => {
    try {
      setLoadingPending(true)
      const data = await fetchPendingAcceptanceTasks()
      setPendingTasks(data)
    } catch {
      setPendingTasks([])
    } finally {
      setLoadingPending(false)
    }
  }

  useEffect(() => {
    void loadPending()
  }, [])

  const handleAccept = async (task: BoardTask) => {
    setActingId(task.id)
    try {
      await acceptTask(task.id)
      toast.success('تمت الموافقة على استلام المهمة وانتقالها إلى لوحة الأجايل الخاصة بك')
      await loadPending()
      if (reload) reload()
    } catch {
      toast.error('تعذر قبول المهمة')
    } finally {
      setActingId(null)
    }
  }

  // Calculate cumulative hours for accepted/completed tasks
  const totalCompletedHours = tasks
    .filter((t) => t.status === 'done')
    .reduce((acc, t) => acc + (t.estimated_hours ?? 0), 0)

  if (loading) return <OpsPageSkeleton />

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-col gap-4 rounded-[1.6rem] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.06] md:flex-row md:items-center md:justify-between">
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-customBlue/10 px-2.5 py-0.5 text-[11px] font-black text-customBlue">
              مسؤولياتي المباشرة
            </span>
            <Link
              to="/dashboard/operations/board"
              className="inline-flex items-center gap-1.5 rounded-lg bg-deepBlue px-3 py-1 text-[11px] font-black text-white hover:bg-deepBlue/90 transition shadow-sm"
            >
              <KanbanSquare size={13} />
              الانتقال إلى الأجايل الخاص بي
              <ExternalLink size={11} />
            </Link>
          </div>
          <h1 className="mt-1.5 text-2xl font-black text-deepBlue">مهامي ومسؤولياتي</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            متابعة المهام المسندة إليك واعتماد استلامها ونقلها عبر مراحل الإنجاز
          </p>
        </div>
        <OpsTaskTabs />
      </header>

      {/* قسم مهام بانتظار الموافقة (Awaiting Acceptance) */}
      {pendingTasks.length > 0 && (
        <section className="rounded-3xl border-2 border-customBlue/30 bg-customBlue/[0.02] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-3 rounded-full bg-customBlue animate-ping" />
              <h2 className="text-sm font-black text-deepBlue">
                مهام بانتظار موافقتك على الاستلام ({pendingTasks.length})
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              يرجى مراجعة المهام وقبولها أو كتابة سبب الاعتذار
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingTasks.map((pt) => (
              <div
                key={pt.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-black text-deepBlue">{pt.title}</h3>
                    {pt.task_scope && (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                        {pt.task_scope === 'simple'
                          ? 'بسيطة'
                          : pt.task_scope === 'medium'
                            ? 'متوسطة'
                            : pt.task_scope === 'large'
                              ? 'كبيرة'
                              : 'استراتيجية'}
                      </span>
                    )}
                  </div>
                  {pt.description && (
                    <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {pt.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
                  {pt.points && (
                    <span className="flex items-center gap-1 text-customBlue">
                      <Sparkles size={11} /> {pt.points} نقطة
                    </span>
                  )}
                  {pt.estimated_hours && (
                    <span className="flex items-center gap-1 text-emerald-700">
                      <Clock size={11} /> {pt.estimated_hours} ساعة
                    </span>
                  )}
                  {pt.due_date && <span>التسليم: {pt.due_date.slice(0, 10)}</span>}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={actingId === pt.id}
                    onClick={() => void handleAccept(pt)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition"
                  >
                    <CheckCircle size={13} />
                    قبول المهمة
                  </button>
                  <button
                    type="button"
                    disabled={actingId === pt.id}
                    onClick={() => setRejectingTask(pt)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100 transition"
                  >
                    <XCircle size={13} />
                    اعتذار
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* المهام المسندة والمقبولة */}
      <div>
        <h2 className="text-base font-black text-deepBlue mb-3">مهامي المعتمدة والجاري العمل عليها</h2>
        {tasks.length === 0 ? (
          <EmptyState
            icon={User}
            title="لا مهام مسندة إليك حالياً"
            description="عند إسناد مهام جديدة وموافقتك عليها ستظهر في هذه القائمة ولوحة الأجايل الخاصة بك."
          />
        ) : (
          <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} onOpen={() => openTask(t)} />
            ))}
          </motion.div>
        )}
      </div>

      <TaskDetailPanel
        task={selected}
        open={panelOpen}
        onClose={closePanel}
        onPatch={onPatch}
        onToggleChecklist={onToggleChecklist}
        onComment={onComment}
      />

      <TaskRejectModal
        task={rejectingTask}
        open={Boolean(rejectingTask)}
        onClose={() => setRejectingTask(null)}
        onRejected={() => {
          void loadPending()
          if (reload) reload()
        }}
      />
    </div>
  )
}
