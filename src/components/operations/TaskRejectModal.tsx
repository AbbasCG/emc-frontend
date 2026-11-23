import { useState, type FormEvent } from 'react'
import { AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { taskApiMessage } from '@/api/taskErrors'
import { rejectTask, type BoardTask } from '@/api/operationsBoardApi'
import { CenteredModal } from '@/components/ui/CenteredModal'

type Props = {
  task: Pick<BoardTask, 'id' | 'title'> | null
  open: boolean
  onClose: () => void
  onRejected: () => void
  /** The call that records the decline. Defaults to the management endpoint; «مهامي» passes the own-only one. */
  reject?: (id: number, reason: string) => Promise<void>
  /** The decline did not go through (the task changed under us, 404 / 409): the caller re-reads its sources. */
  onFailed?: () => void
}

/** The server requires at least 3 characters for the decline reason of a task. */
export const TASK_DECLINE_MIN = 3
/** ... and at most 1000. */
export const TASK_DECLINE_MAX = 1000

export default function TaskRejectModal({ task, open, onClose, onRejected, onFailed, reject = rejectTask }: Props) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A new task (or a re-opened window) starts blank: never the reason typed for the previous one.
  const [seen, setSeen] = useState({ open, id: task?.id })
  if (seen.open !== open || seen.id !== task?.id) {
    setSeen({ open, id: task?.id })
    setReason('')
    setError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!task) return
    if (reason.trim().length < TASK_DECLINE_MIN) {
      setError('سبب الاعتذار إجباري (3 أحرف على الأقل).')
      return
    }
    setError(null)

    try {
      setSubmitting(true)
      await reject(task.id, reason.trim())
      toast.success('تم تسجيل الاعتذار وإشعار المدير لإعادة التوجيه')
      setReason('')
      onRejected()
      onClose()
    } catch (err: unknown) {
      setError(taskApiMessage(err, 'تعذر تسجيل الاعتذار'))
      onFailed?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CenteredModal
      open={open && task !== null}
      onClose={onClose}
      size="md"
      testId="task-reject-modal"
      busy={submitting}
      dirty={reason.trim() !== ''}
      title={
        <span className="block">
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-600">
            <AlertCircle size={13} aria-hidden="true" />
            الاعتذار عن استلام المهمة
          </span>
          <span className="mt-1 block truncate text-base font-black text-deepBlue">{task?.title}</span>
        </span>
      }
      footer={(requestClose) => (
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={requestClose} disabled={submitting} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            تراجع
          </button>
          <button
            type="submit"
            form="task-reject-form"
            disabled={submitting}
            className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
          >
            {submitting ? 'جاري الإرسال...' : 'تأكيد الاعتذار'}
          </button>
        </div>
      )}
    >
      <form id="task-reject-form" onSubmit={handleSubmit} noValidate className="space-y-4 text-right">
        <p className="text-xs font-medium leading-relaxed text-slate-600">
          سيتم إشعار مدير الإدارة باعتذارك مع ذكر السبب، ليتمكن من إعادة توجيه المهمة لعضو آخر أو تعديل متطلباتها.
        </p>
        <div>
          <label htmlFor="task-reject-reason" className="mb-1.5 block text-xs font-black text-deepBlue">
            سبب الاعتذار <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <textarea
            id="task-reject-reason"
            rows={4}
            value={reason}
            maxLength={TASK_DECLINE_MAX}
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'task-reject-error' : undefined}
            onChange={(e) => setReason(e.target.value)}
            placeholder="وضح سبب الاعتذار (مثال: تعارض مواعيد، ضغط مهام حالي، عدم توافر المهارة المطلوبة...)"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-deepBlue placeholder:text-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
          />
          {error ? (
            <p id="task-reject-error" role="alert" className="mt-1 text-[11px] font-bold text-rose-600">
              {error}
            </p>
          ) : null}
        </div>
      </form>
    </CenteredModal>
  )
}
