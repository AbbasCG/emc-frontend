import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { OpsTask, TaskPriority, TaskStatus } from '@/types/operations'
import { TASK_PRIORITY_AR, TASK_STATUS_AR } from '@/data/operationsLabels'
import ChecklistEditor from './ChecklistEditor'
import CommentThread from './CommentThread'
import OpsPriorityBadge from './OpsPriorityBadge'
import OpsTaskStatusBadge from './OpsTaskStatusBadge'

type Props = {
  task: OpsTask | null
  open: boolean
  onClose: () => void
  onPatch: (patch: Partial<OpsTask>) => Promise<void>
  onToggleChecklist: (id: number, done: boolean) => Promise<void>
  onComment: (text: string) => Promise<void>
}

export default function TaskDetailPanel({
  task,
  open,
  onClose,
  onPatch,
  onToggleChecklist,
  onComment,
}: Props) {
  return (
    <AnimatePresence>
      {open && task && (
        <>
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 120, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-white/20 bg-white shadow-2xl"
            dir="rtl"
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">مهمة تشغيل</p>
                <h2 className="mt-1 text-lg font-black text-deepBlue">{task.title}</h2>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <OpsTaskStatusBadge status={task.status} />
                  <OpsPriorityBadge p={task.priority} />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-deepBlue"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              <section className="text-right">
                <p className="text-xs font-black text-slate-400">الوصف</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-deepBlue/80">
                  {task.description ?? '—'}
                </p>
                <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500">
                  <span>الإدارة: {task.department_name}</span>
                  <span>المسؤول: {task.assignee_name ?? '—'}</span>
                  {task.related_label && (
                    <span className="text-customBlue">مرتبط: {task.related_label}</span>
                  )}
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-right text-xs font-black text-deepBlue">
                  الحالة
                  <select
                    value={task.status}
                    onChange={(e) => onPatch({ status: e.target.value as TaskStatus })}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-deepBlue"
                  >
                    {(Object.keys(TASK_STATUS_AR) as TaskStatus[]).map((k) => (
                      <option key={k} value={k}>
                        {TASK_STATUS_AR[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-right text-xs font-black text-deepBlue">
                  الأولوية
                  <select
                    value={task.priority}
                    onChange={(e) => onPatch({ priority: e.target.value as TaskPriority })}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-deepBlue"
                  >
                    {(Object.keys(TASK_PRIORITY_AR) as TaskPriority[]).map((k) => (
                      <option key={k} value={k}>
                        {TASK_PRIORITY_AR[k]}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              {task.checklist && task.checklist.length > 0 && (
                <section className="text-right">
                  <h4 className="text-xs font-black text-slate-400">قائمة التحقق</h4>
                  <div className="mt-2">
                    <ChecklistEditor items={task.checklist} onToggle={onToggleChecklist} />
                  </div>
                </section>
              )}

              <CommentThread comments={task.comments ?? []} onAdd={onComment} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
