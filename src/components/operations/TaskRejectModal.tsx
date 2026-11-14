import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiMessageOr } from '@/api/apiErrors'
import { rejectTask, type BoardTask } from '@/api/operationsBoardApi'

type Props = {
  task: BoardTask | null
  open: boolean
  onClose: () => void
  onRejected: () => void
}

export default function TaskRejectModal({ task, open, onClose, onRejected }: Props) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open || !task) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      toast.error('يرجى كتابة سبب الاعتذار عن المهمة')
      return
    }

    try {
      setSubmitting(true)
      await rejectTask(task.id, reason)
      toast.success('تم تسجيل الاعتذار وإشعار المدير لإعادة التوجيه')
      onRejected()
      onClose()
    } catch (err: unknown) {
      toast.error(getApiMessageOr(err, 'تعذر تسجيل الاعتذار'))
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
          className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-deepBlue/10"
          dir="rtl"
        >
          <header className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-600">
                <AlertCircle size={13} />
                الاعتذار عن استلام المهمة
              </span>
              <h2 className="mt-1 text-base font-black text-deepBlue truncate max-w-xs">
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

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-right">
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              سيتم إشعار مدير الإدارة باعتذارك مع ذكر السبب، ليتمكن من إعادة توجيه المهمة لعضو آخر أو تعديل متطلباتها.
            </p>

            <div>
              <label className="block text-xs font-black text-deepBlue mb-1.5">
                سبب الاعتذار <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="وضح سبب الاعتذار (مثال: تعارض مواعيد، ضغط مهام حالي، عدم توافر المهارة المطلوبة...)"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-deepBlue placeholder:text-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                تراجع
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-black text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {submitting ? 'جاري الإرسال...' : 'تأكيد الاعتذار'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

