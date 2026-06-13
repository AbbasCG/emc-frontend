import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { submitStudentAssignment } from '@/api/studentApi'
import type { StudentAssignment } from '@/types/lms'
import toast from '@/lib/toast'

const NON_SUBMITTABLE: StudentAssignment['status'][] = ['submitted', 'graded']

type Props = {
  assignment: StudentAssignment | null
  onClose: () => void
  onSuccess?: () => void | Promise<void>
}

export default function AssignmentSubmitModal({ assignment, onClose, onSuccess }: Props) {
  const [text, setText] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [succeeded, setSucceeded] = useState(false)

  useEffect(() => {
    if (!assignment) {
      setText('')
      setNotes('')
      setFile(null)
      setSucceeded(false)
      setSubmitting(false)
    }
  }, [assignment])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!assignment) return
    if (NON_SUBMITTABLE.includes(assignment.status)) {
      toast.error('تم تسليم هذا الواجب مسبقاً.')
      return
    }
    if (!assignment.assignment_id || assignment.assignment_id <= 0) {
      toast.error('تعذّر تحديد الواجب. حدّث الصفحة وحاول مرة أخرى.')
      return
    }
    if (!text.trim() && !file) {
      toast.error('أضف إجابة نصية أو مرفقاً على الأقل.')
      return
    }
    setSubmitting(true)
    setSucceeded(false)
    try {
      await submitStudentAssignment(assignment.assignment_id, {
        text_answer: text.trim() || undefined,
        answer_text: text.trim() || undefined,
        notes: notes.trim() || undefined,
        file,
      })
      setSucceeded(true)
      toast.success('تم تسليم الواجب بنجاح.')
      await onSuccess?.()
      window.setTimeout(() => {
        onClose()
      }, 1200)
    } catch {
      toast.error('فشل التسليم. تحقق من الحقول أو حاول لاحقاً.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {assignment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assignment-submit-title"
          onClick={() => !submitting && onClose()}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(ev) => ev.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-deepBlue/10"
          >
            {succeeded ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" aria-hidden />
                <h2 className="mt-4 text-lg font-black text-deepBlue">تم تسليم الواجب بنجاح</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">جارٍ تحديث حالة التسليم…</p>
              </div>
            ) : (
              <>
                <h2 id="assignment-submit-title" className="text-right text-lg font-black text-deepBlue">
                  تسليم الواجب
                </h2>
                <p className="mt-1 text-right text-sm font-bold text-slate-500">{assignment.title}</p>
                {assignment.course_name && (
                  <p className="mt-0.5 text-right text-[11px] font-semibold text-slate-400">{assignment.course_name}</p>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-right">
                  <label className="grid gap-2">
                    <span className="text-xs font-black text-deepBlue">إجابة نصية</span>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={5}
                      disabled={submitting}
                      placeholder="اكتب إجابتك هنا…"
                      className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue outline-none focus:border-customBlue disabled:opacity-60"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black text-deepBlue">ملاحظات (اختياري)</span>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={submitting}
                      placeholder="ملاحظة للمدرب…"
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue outline-none focus:border-customBlue disabled:opacity-60"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black text-deepBlue">مرفق (اختياري)</span>
                    <input
                      type="file"
                      disabled={submitting}
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="text-sm font-semibold text-deepBlue disabled:opacity-60"
                    />
                  </label>
                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={onClose}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black text-slate-600"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-6 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-60"
                    >
                      {submitting ?
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          جارٍ الإرسال…
                        </>
                      : <>
                          <Send size={14} />
                          إرسال التسليم
                        </>
                      }
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
