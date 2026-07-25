import { useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Calendar, CheckCircle2, ClipboardList, Loader2, RefreshCw, Send, Star, X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { submitStudentAssignment } from '@/api/studentApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import AppFileUpload from '@/components/ui/AppFileUpload'
import type { StudentAssignment } from '@/types/lms'
import { formatLmsDateTime } from '@/components/lms/lmsFormatters'
import { isNeedsResubmission } from '@/utils/lmsAssignment'
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
  const [submitError, setSubmitError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useFocusTrap(panelRef, {
    active: Boolean(assignment),
    onEscape: () => {
      if (!submitting) onClose()
    },
  })

  // Clear the draft during render when the modal closes (react.dev "adjusting state
  // when a prop changes") — no extra committed render, same reset as before.
  const [seenAssignment, setSeenAssignment] = useState(assignment)
  if (seenAssignment !== assignment) {
    setSeenAssignment(assignment)
    if (!assignment) {
      setText('')
      setNotes('')
      setFile(null)
      setSubmitError(null)
      setSubmitting(false)
    }
  }

  const isResubmission = isNeedsResubmission(assignment?.status)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!assignment) return
    if (NON_SUBMITTABLE.includes(assignment.status) && !isResubmission) {
      setSubmitError('تم تسليم هذا الواجب مسبقاً ولا يمكن إعادة التسليم إلا بطلب من المدرس.')
      return
    }
    if (!assignment.assignment_id || assignment.assignment_id <= 0) {
      setSubmitError('تعذّر تحديد الواجب. حدّث الصفحة وحاول مرة أخرى.')
      return
    }
    if (!text.trim() && !file) {
      setSubmitError('أضف إجابة نصية أو مرفقاً على الأقل.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      await submitStudentAssignment(assignment.assignment_id, {
        text_answer: text.trim() || undefined,
        answer_text: text.trim() || undefined,
        notes: notes.trim() || undefined,
        file,
      })
      toast.success(isResubmission ? 'تمت إعادة تسليم الواجب بنجاح.' : 'تم تسليم الواجب بنجاح.')
      await onSuccess?.()
      onClose()
    } catch (err) {
      setSubmitError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const isReadOnly = !!assignment && NON_SUBMITTABLE.includes(assignment.status) && !isResubmission

  const dueLabel = assignment?.due_at ? formatLmsDateTime(assignment.due_at) : null
  const submittedLabel = assignment?.submitted_at ? formatLmsDateTime(assignment.submitted_at) : null

  return (
    <AnimatePresence>
      {assignment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0C2A4B]/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assignment-submit-title"
          dir="rtl"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="إغلاق"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
          />

          <motion.div
            ref={panelRef}
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            onClick={(ev) => ev.stopPropagation()}
            className="relative z-[1] flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#0C2A4B]/10 bg-white shadow-[0_24px_64px_-16px_rgba(12,42,75,0.35)]"
          >
            <div className="border-b border-slate-100 bg-gradient-to-l from-[#0C2A4B] to-[#1a2940] px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-[10px] font-black tracking-[0.14em] text-[#0077B6]">{isResubmission ? 'إعادة تسليم الواجب' : 'تسليم الواجب'}</p>
                  <h2 id="assignment-submit-title" className="mt-0.5 flex items-start justify-start gap-2 text-lg font-black leading-snug">
                    <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-[#F28C00]" aria-hidden />
                    {assignment.title}
                  </h2>
                  {assignment.course_name ?
                    <p className="mt-1 text-[12px] font-medium text-white/65">{assignment.course_name}</p>
                  : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap justify-start gap-2">
                {dueLabel ?
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/90">
                    <Calendar className="h-3.5 w-3.5 text-[#F28C00]" aria-hidden />
                    الموعد: {dueLabel}
                  </span>
                : null}
                {assignment.max_score != null ?
                  <span className="rounded-full bg-[#0077B6]/20 px-2.5 py-1 text-[11px] font-black text-[#0077B6]">
                    الدرجة القصوى: {assignment.max_score}
                  </span>
                : null}
              </div>
            </div>

            {isReadOnly ? (
              /* ── Read-only: already submitted, instructor hasn't requested resubmission ── */
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-right">
                  <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>تم تسليم هذا الواجب. لا يمكن إعادة التسليم إلا بطلب من المدرس.</span>
                  </div>
                  {submittedLabel && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-[#0C2A4B]/[0.07] bg-slate-50/70 px-3.5 py-2.5">
                      <Calendar className="h-4 w-4 shrink-0 text-[#0C2A4B]/40" aria-hidden />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-[#0C2A4B]/50">تاريخ التسليم</p>
                        <p className="text-[13px] font-black text-[#0C2A4B]">{submittedLabel}</p>
                      </div>
                    </div>
                  )}
                  {assignment?.score != null && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-[#0077B6]/15 bg-blue-50/50 px-3.5 py-2.5">
                      <Star className="h-4 w-4 shrink-0 text-[#F28C00]" aria-hidden />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-[#0C2A4B]/50">الدرجة</p>
                        <p className="text-[13px] font-black text-[#0C2A4B]">
                          {assignment.score}{assignment.max_score != null ? ` / ${assignment.max_score}` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                  {assignment?.feedback && (
                    <div className="rounded-xl border border-[#0077B6]/15 bg-blue-50/50 px-3.5 py-3">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-[#0077B6]/70">ملاحظات المدرب</p>
                      <p className="text-[12px] font-medium leading-relaxed text-[#0F172A]/80">{assignment.feedback}</p>
                    </div>
                  )}
                </div>
                <div className="sticky bottom-0 flex shrink-0 items-center justify-end border-t border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-[#0C2A4B] transition hover:bg-slate-50"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            ) : (
              /* ── Submission form ── */
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-right">
                  {isResubmission && !submitError && (
                    <div className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-[12px] font-bold text-orange-800">
                      <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>طلب المدرس إعادة تسليم هذا الواجب. يمكنك إرسال نسخة جديدة.</span>
                    </div>
                  )}
                  {submitError ?
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-bold text-rose-800"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>{submitError}</span>
                    </div>
                  : null}

                  <label className="grid gap-2">
                    <span className="text-xs font-black text-[#0C2A4B]">إجابة نصية</span>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={5}
                      disabled={submitting}
                      placeholder="اكتب إجابتك هنا…"
                      className="resize-none rounded-2xl border border-[#0C2A4B]/12 bg-slate-50/80 px-4 py-3 font-semibold text-[#0C2A4B] outline-none transition focus:border-[#0077B6]/50 focus:ring-4 focus:ring-[#0077B6]/10 disabled:opacity-60"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-black text-[#0C2A4B]">ملاحظات (اختياري)</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      disabled={submitting}
                      placeholder="ملاحظة للمدرب…"
                      className="resize-none rounded-2xl border border-[#0C2A4B]/12 bg-slate-50/80 px-4 py-3 font-semibold text-[#0C2A4B] outline-none transition focus:border-[#0077B6]/50 focus:ring-4 focus:ring-[#0077B6]/10 disabled:opacity-60"
                    />
                  </label>

                  <AppFileUpload
                    label="مرفق (اختياري)"
                    name="assignment_file"
                    file={file}
                    onChange={setFile}
                    compress={false}
                    hint="PDF · Word · صور"
                  />
                </div>

                <div className="sticky bottom-0 flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur-sm">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-[#0C2A4B] transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-xl bg-[#0077B6] px-5 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:bg-[#1e7dab] disabled:opacity-50"
                  >
                    {submitting ?
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        جارٍ الإرسال…
                      </>
                    : isResubmission ? (
                      <>
                        <RefreshCw size={14} aria-hidden />
                        إعادة تسليم الواجب
                      </>
                    ) : (
                      <>
                        <Send size={14} aria-hidden />
                        إرسال التسليم
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
