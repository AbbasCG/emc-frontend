import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Calendar, CheckCircle2, ClipboardList, Loader2, RefreshCw, Send, Star, X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { fetchAssignmentUploadRules, submitStudentAssignment } from '@/api/studentApi'
import { mapAssignmentUploadError, type UploadErrorInfo } from '@/api/uploadErrors'
import AssignmentFilePicker from '@/components/lms/AssignmentFilePicker'
import AssignmentAttachmentList from '@/components/lms/AssignmentAttachmentList'
import { FALLBACK_UPLOAD_RULES, type AssignmentUploadRules, type PickedFile } from '@/lib/assignmentUploadRules'
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

function clientError(message: string): UploadErrorInfo {
  return { kind: 'unknown', message, details: [], retryable: false, status: null, retryAfter: null }
}

/** 65 → «1:05». */
function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function AssignmentSubmitModal({ assignment, onClose, onSuccess }: Props) {
  const [text, setText] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<PickedFile[]>([])
  const [rules, setRules] = useState<AssignmentUploadRules>(FALLBACK_UPLOAD_RULES)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState<UploadErrorInfo | null>(null)
  // Seconds left of a server-imposed wait (429 retry_after); resending is blocked until it reaches 0.
  const [cooldown, setCooldown] = useState(0)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const errorRef = useRef<HTMLDivElement | null>(null)
  // Synchronous guards: a state update lands after the next click, a ref does not.
  const submittingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  useFocusTrap(panelRef, {
    active: Boolean(assignment),
    onEscape: () => {
      if (!submittingRef.current) onClose()
    },
  })

  // Server rules (cached per session); the built-in fallback is already in place until they arrive.
  useEffect(() => {
    if (!assignment) return
    let alive = true
    void fetchAssignmentUploadRules().then((r) => {
      if (alive) setRules(r)
    })
    return () => {
      alive = false
    }
  }, [assignment])

  // The modal going away (closed by the parent, navigated off) must not leave an upload running.
  useEffect(() => {
    if (assignment) return
    abortRef.current?.abort()
  }, [assignment])
  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    [],
  )

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    if (submitError) errorRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [submitError])

  // Clear the draft during render when the modal closes (react.dev "adjusting state
  // when a prop changes") — no extra committed render, same reset as before.
  const [seenAssignment, setSeenAssignment] = useState(assignment)
  if (seenAssignment !== assignment) {
    setSeenAssignment(assignment)
    if (!assignment) {
      setText('')
      setNotes('')
      setFiles([])
      setSubmitError(null)
      setSubmitting(false)
      setProgress(null)
      setCooldown(0)
    }
  }

  const isResubmission = isNeedsResubmission(assignment?.status)

  function requestClose() {
    if (!submittingRef.current) onClose()
  }

  function stopUpload() {
    abortRef.current?.abort()
  }

  async function send() {
    if (submittingRef.current || !assignment || cooldown > 0) return
    if (NON_SUBMITTABLE.includes(assignment.status) && !isResubmission) {
      setSubmitError(clientError('تم تسليم هذا الواجب مسبقاً ولا يمكن إعادة التسليم إلا بطلب من المدرس.'))
      return
    }
    if (!assignment.assignment_id || assignment.assignment_id <= 0) {
      setSubmitError(clientError('تعذّر تحديد الواجب. حدّث الصفحة وحاول مرة أخرى.'))
      return
    }
    if (!text.trim() && files.length === 0) {
      setSubmitError(clientError('أضف إجابة نصية أو مرفقاً على الأقل.'))
      return
    }

    const picked = files.map((p) => p.file)
    const controller = new AbortController()
    abortRef.current = controller
    submittingRef.current = true
    setSubmitting(true)
    setSubmitError(null)
    setProgress(0)

    let succeeded = false
    try {
      await submitStudentAssignment(
        assignment.assignment_id,
        {
          text_answer: text.trim() || undefined,
          answer_text: text.trim() || undefined,
          notes: notes.trim() || undefined,
          files: picked,
        },
        {
          signal: controller.signal,
          onProgress: (p) => setProgress((prev) => Math.max(prev ?? 0, p.percent)),
        },
      )
      succeeded = true
    } catch (err) {
      // Nothing the student typed or picked is cleared: they can fix the cause and resend.
      const mapped = mapAssignmentUploadError(err, { files: picked })
      setSubmitError(mapped)
      setCooldown(mapped.retryAfter ?? 0)
    } finally {
      submittingRef.current = false
      abortRef.current = null
      setSubmitting(false)
      setProgress(null)
    }

    if (succeeded) {
      toast.success(isResubmission ? 'تمت إعادة تسليم الواجب بنجاح.' : 'تم تسليم الواجب بنجاح.')
      try {
        await onSuccess?.()
      } catch {
        // The submission is saved; a failed refresh must not read as a failed upload.
      }
      onClose()
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void send()
  }

  const isReadOnly = !!assignment && NON_SUBMITTABLE.includes(assignment.status) && !isResubmission

  const dueLabel = assignment?.due_at ? formatLmsDateTime(assignment.due_at) : null
  const submittedLabel = assignment?.submitted_at ? formatLmsDateTime(assignment.submitted_at) : null
  const previousFiles = assignment?.attachments ?? []
  const uploadComplete = progress != null && progress >= 100

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
            onClick={requestClose}
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
                  onClick={requestClose}
                  disabled={submitting}
                  aria-label="إغلاق نافذة التسليم"
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
                  {previousFiles.length > 0 ?
                    <AssignmentAttachmentList attachments={previousFiles} title="ملفاتك المُسلَّمة" />
                  : null}
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
                <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-5 py-5 text-right">
                  {isResubmission && !submitError && (
                    <div className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-[12px] font-bold text-orange-800">
                      <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>طلب المدرس إعادة تسليم هذا الواجب. يمكنك إرسال نسخة جديدة.</span>
                    </div>
                  )}
                  {isResubmission && previousFiles.length > 0 ?
                    <AssignmentAttachmentList attachments={previousFiles} title="ملفاتك المُسلَّمة سابقاً" />
                  : null}
                  {submitError ?
                    <div
                      ref={errorRef}
                      role={submitError.kind === 'aborted' ? 'status' : 'alert'}
                      data-testid="assignment-submit-error"
                      className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-[12px] font-bold ${
                        submitError.kind === 'aborted' ?
                          'border-slate-200 bg-slate-50 text-navy'
                        : 'border-rose-200 bg-rose-50 text-rose-800'
                      }`}
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="leading-relaxed">{submitError.message}</p>
                        {submitError.details.length > 0 ?
                          <ul className="mt-1.5 list-disc space-y-1 pr-4 font-semibold">
                            {submitError.details.map((d, i) => (
                              <li key={`${d.fileName ?? 'general'}-${i}`} className="break-words">
                                {d.fileName ?
                                  <>
                                    <bdi dir="auto" className="break-all font-black">
                                      {d.fileName}
                                    </bdi>
                                    {' — '}
                                  </>
                                : null}
                                {d.message}
                              </li>
                            ))}
                          </ul>
                        : null}
                        {submitError.retryable ?
                          <button
                            type="button"
                            onClick={() => void send()}
                            disabled={submitting || cooldown > 0}
                            className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-[12px] font-black text-rose-800 transition hover:bg-rose-100 disabled:opacity-50"
                          >
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                            إعادة المحاولة
                            {cooldown > 0 ?
                              <span className="tabular-nums" aria-live="off">
                                {' '}
                                بعد {formatCountdown(cooldown)}
                              </span>
                            : null}
                          </button>
                        : null}
                      </div>
                    </div>
                  : null}

                  <label className="grid gap-2">
                    <span className="text-xs font-black text-navy">إجابة نصية</span>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={5}
                      disabled={submitting}
                      placeholder="اكتب إجابتك هنا…"
                      className="resize-none rounded-2xl border border-navy/10 bg-slate-50/80 px-4 py-3 font-semibold text-navy outline-none transition focus:border-customBlue/50 focus:ring-4 focus:ring-customBlue/10 disabled:opacity-60"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-black text-navy">ملاحظات (اختياري)</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      disabled={submitting}
                      placeholder="ملاحظة للمدرب…"
                      className="resize-none rounded-2xl border border-navy/10 bg-slate-50/80 px-4 py-3 font-semibold text-navy outline-none transition focus:border-customBlue/50 focus:ring-4 focus:ring-customBlue/10 disabled:opacity-60"
                    />
                  </label>

                  <AssignmentFilePicker files={files} onChange={setFiles} rules={rules} disabled={submitting} />
                </div>

                <div className="sticky bottom-0 shrink-0 border-t border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur-sm">
                  {submitting && files.length > 0 ?
                    <div className="mb-3 grid gap-1.5" data-testid="assignment-upload-progress">
                      <div className="flex items-center justify-between gap-3 text-[12px] font-bold text-navy">
                        <span aria-live="polite">
                          {uploadComplete ? 'اكتمل الرفع، جارٍ حفظ التسليم…' : 'جارٍ رفع الملفات…'}
                        </span>
                        <span className="tabular-nums">{progress ?? 0}%</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label="تقدّم رفع الملفات"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress ?? 0}
                        className="h-2 overflow-hidden rounded-full bg-slate-100"
                      >
                        <div
                          className="h-full rounded-full bg-customBlue transition-[width] duration-200 motion-reduce:transition-none"
                          style={{ width: `${progress ?? 0}%` }}
                        />
                      </div>
                    </div>
                  : null}
                  <div className="flex items-center justify-end gap-2">
                    {submitting ?
                      <button
                        type="button"
                        onClick={stopUpload}
                        className="min-h-10 rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-navy transition hover:bg-slate-50"
                      >
                        إيقاف الرفع
                      </button>
                    : <button
                        type="button"
                        onClick={requestClose}
                        className="min-h-10 rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-navy transition hover:bg-slate-50"
                      >
                        إلغاء
                      </button>
                    }
                    <button
                      type="submit"
                      disabled={submitting || cooldown > 0}
                      className="inline-flex min-h-10 min-w-[130px] items-center justify-center gap-2 rounded-xl bg-customBlue px-5 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:bg-ocean disabled:opacity-50"
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
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
