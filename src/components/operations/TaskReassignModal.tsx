import { useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowRightLeft, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { reassignTask, type BoardTask } from '@/api/operationsBoardApi'
import type { DepartmentMember } from '@/api/operationsReportsApi'
import { taskApiMessage } from '@/api/taskErrors'
import { fetchTaskScopeMembers } from '@/api/taskScopeApi'
import { CenteredModal } from '@/components/ui/CenteredModal'

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
  const [membersError, setMembersError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // A new task (or a re-opened window) starts blank: never the member or note chosen for the previous one.
  // The members of the previous task (or of a card with no department at all) are never offered for this one either.
  const departmentId = task?.department?.id ?? null
  const [seen, setSeen] = useState({ open, id: task?.id, departmentId })
  if (seen.open !== open || seen.id !== task?.id || seen.departmentId !== departmentId) {
    setSeen({ open, id: task?.id, departmentId })
    setSelectedMember('')
    setNotes('')
    setMembers([])
    setMembersError(null)
    setLoadingMembers(false)
  }

  useEffect(() => {
    if (open && task?.department?.id) {
      let live = true
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the loading flag must flip before the members request starts, whenever the task or visibility changes
      setLoadingMembers(true)
      // The members of the viewer's own write scope: a leader sees only the departments they lead, a global actor every one.
      fetchTaskScopeMembers(task.department.id)
        .then((m) => {
          if (!live) return
          setMembers(m)
          setMembersError(null)
          setLoadingMembers(false)
        })
        .catch((err: unknown) => {
          if (!live) return
          setMembers([])
          setMembersError(taskApiMessage(err, 'تعذّر تحميل أعضاء الإدارة.'))
          setLoadingMembers(false)
        })

      return () => {
        live = false
      }
    }
  }, [open, task])

  if (!task) return null

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
      toast.error(taskApiMessage(err, 'تعذر إعادة الإسناد'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CenteredModal
      open={open && task !== null}
      onClose={onClose}
      size="md"
      testId="task-reassign-modal"
      busy={submitting}
      dirty={selectedMember !== '' || notes.trim() !== ''}
      title={
        <span className="block">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-customBlue">
            <ArrowRightLeft size={13} aria-hidden="true" />
            إعادة توجيه / إسناد المهمة
          </span>
          <span className="mt-1 block truncate text-base font-black text-deepBlue">{task.title}</span>
        </span>
      }
      footer={(requestClose) => (
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={requestClose} disabled={submitting} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            إلغاء
          </button>
          <button
            type="submit"
            form="task-reassign-form"
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-xl bg-customBlue px-5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-customBlue/90 disabled:opacity-50"
          >
            <UserCheck size={14} aria-hidden="true" />
            <span>{submitting ? 'جاري الإسناد...' : 'تأكيد الإسناد للعضو'}</span>
          </button>
        </div>
      )}
    >
      <div className="space-y-4 text-right">
        {/* إذا كانت المهمة مرفوضة: إظهار سبب الرفض بوضوح للمدير */}
        {/* A task that someone already holds (not a declined one): the move is not harmless, so it is said before it is confirmed. */}
        {task.assigned_to && task.acceptance_status !== 'rejected' ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-right text-xs font-bold leading-relaxed text-amber-900" data-testid="reassign-confirm-note">
            هذه المهمة مسندة حاليًا إلى {task.assigned_to.name}. إعادة إسنادها تنقلها إلى العضو الجديد وتعيد حالة القبول إلى «بانتظار الموافقة»، وأي ملاحظات تكتبها هنا تحلّ محل ملاحظات المهمة الحالية.
          </div>
        ) : null}

        {task.rejection_reason && (
          <div className="rounded-2xl border border-rose-200/60 bg-rose-50 p-3.5 text-right">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-black text-rose-700">
              <AlertCircle size={14} aria-hidden="true" />
              <span>سبب اعتذار العضو السابق ({task.assigned_to?.name}):</span>
            </div>
            <p className="text-xs font-medium leading-relaxed text-rose-900">&quot;{task.rejection_reason}&quot;</p>
          </div>
        )}

        <form id="task-reassign-form" onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="task-reassign-member" className="mb-1.5 block text-xs font-black text-deepBlue">
              توجيه المهمة إلى عضو جديد <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            {loadingMembers ? (
              <p className="text-xs text-slate-400">جاري تحميل الأعضاء...</p>
            ) : membersError ? (
              <p role="alert" className="text-xs font-bold text-rose-600" data-testid="reassign-members-error">{membersError}</p>
            ) : (
              <select
                id="task-reassign-member"
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
            <label htmlFor="task-reassign-notes" className="mb-1.5 block text-xs font-black text-deepBlue">
              ملاحظات أو تعديلات توجيهية (اختياري)
            </label>
            <textarea
              id="task-reassign-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="توجيهات أو تعديل على متطلبات المهمة..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-deepBlue placeholder:text-slate-400 focus:border-customBlue"
            />
          </div>
        </form>
      </div>
    </CenteredModal>
  )
}
