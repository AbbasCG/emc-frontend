import { useEffect, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, ArrowRightLeft, UserCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiMessageOr } from '@/api/apiErrors'
import { reassignTask, type BoardTask } from '@/api/operationsBoardApi'
import { fetchDepartmentMembers, type DepartmentMember } from '@/api/operationsReportsApi'

type Props = {
  task: BoardTask | null
  open: boolean
  onClose: () => void
  onReassigned: () => void
}

export default function TaskReassignModal({ task, open, onClose, onReassigned }: Props) {
  const [members, setMembers] = useState<DepartmentMember[]>([])
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && task?.department?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the loading flag must flip before the members request starts, whenever the task or visibility changes
      setLoadingMembers(true)
      fetchDepartmentMembers(task.department.id)
        .then((m) => {
          setMembers(m)
          setLoadingMembers(false)
        })
        .catch(() => {
          setMembers([])
          setLoadingMembers(false)
        })
    }
  }, [open, task])

  if (!open || !task) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedMember) {
      toast.error('يرجى اختيار العضو الجديد')
      return
    }

    try {
      setSubmitting(true)
      await reassignTask(task.id, Number(selectedMember), notes.trim() || undefined)
      toast.success('تمت إعادة إسناد المهمة بنجاح')
      onReassigned()
      onClose()
    } catch (err: unknown) {
      toast.error(getApiMessageOr(err, 'تعذر إعادة الإسناد'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-deepBlue/10"
          dir="rtl"
        >
          <header className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-customBlue">
                <ArrowRightLeft size={13} />
                إعادة توجيه / إسناد المهمة
              </span>
              <h2 className="mt-1 text-base font-black text-deepBlue truncate max-w-sm">
                {task.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-deepBlue"
            >
              <X size={18} />
            </button>
          </header>

          {/* إذا كانت المهمة مرفوضة: إظهار سبب الرفض بوضوح للمدير */}
          {task.rejection_reason && (
            <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200/60 p-3.5 text-right">
              <div className="flex items-center gap-1.5 text-xs font-black text-rose-700 mb-1">
                <AlertCircle size={14} />
                <span>سبب اعتذار العضو السابق ({task.assigned_to?.name}):</span>
              </div>
              <p className="text-xs text-rose-900 font-medium leading-relaxed">
                "{task.rejection_reason}"
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-right">
            <div>
              <label className="block text-xs font-black text-deepBlue mb-1.5">
                توجيه المهمة إلى عضو جديد <span className="text-red-500">*</span>
              </label>
              {loadingMembers ? (
                <p className="text-xs text-slate-400">جاري تحميل الأعضاء...</p>
              ) : (
                <select
                  required
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-deepBlue"
                >
                  <option value="">-- اختر العضو الجديد --</option>
                  {members.map((m) => {
                    const memberId = m.user_id ?? m.id
                    return (
                      <option key={memberId} value={memberId}>
                        {m.name} ({m.job_title ?? m.role ?? 'عضو'})
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-deepBlue mb-1.5">
                ملاحظات أو تعديلات توجيهية (اختياري)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توجيهات أو تعديل على متطلبات المهمة..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-deepBlue placeholder:text-slate-400 focus:border-customBlue"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-xl bg-customBlue px-5 py-2 text-xs font-black text-white shadow-sm hover:bg-customBlue/90 disabled:opacity-50 transition"
              >
                <UserCheck size={14} />
                <span>{submitting ? 'جاري الإسناد...' : 'تأكيد الإسناد للعضو'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

