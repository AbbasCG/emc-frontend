import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  ClipboardList,
  Download,
  FileText,
  Loader2,
  Star,
  User,
  X,
} from 'lucide-react'
import type { SubmissionDetail } from '@/types/lms'
import type { ReviewPayload } from '@/api/instructorApi'
import LmsStatusBadge from './LmsStatusBadge'
import { formatDate, formatDateTime } from '@/utils/dateTime'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'

type Props = {
  submission: SubmissionDetail | null
  loading?: boolean
  onSubmit: (payload: ReviewPayload) => Promise<void>
  onClose: () => void
}

function displayText(value: string | null | undefined): string {
  const s = String(value ?? '').trim()
  return s || 'غير متوفر'
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
  }
  return (name[0] ?? '?').toUpperCase()
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof User
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <h4 className="mb-3 flex items-center gap-2 text-[12px] font-black text-[#22334A]">
        <Icon className="h-4 w-4 text-[#2691C2]" />
        {title}
      </h4>
      {children}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="shrink-0 text-[11px] font-bold text-slate-400">{label}</span>
      <span className="text-left text-[12px] font-black text-[#22334A]">{value}</span>
    </div>
  )
}

export default function SubmissionReviewPanel({
  submission,
  loading = false,
  onSubmit,
  onClose,
}: Props) {
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [status, setStatus] = useState<ReviewPayload['status']>('reviewed')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!submission) return
    setScore(submission.score != null ? String(submission.score) : '')
    setFeedback(submission.feedback ?? '')
    setStatus(submission.status === 'needs_revision' ? 'needs_revision' : 'reviewed')
    setError('')
  }, [submission?.id, submission?.score, submission?.feedback, submission?.status])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!submission) return
    setError('')
    setBusy(true)
    try {
      const numericScore = score.trim() === '' ? 0 : Number(score)
      if (Number.isNaN(numericScore)) {
        setError('أدخل درجة صالحة.')
        return
      }
      const max = submission.max_score ?? submission.assignment?.max_score
      if (max != null && numericScore > max) {
        setError(`الدرجة لا يمكن أن تتجاوز ${max}.`)
        return
      }
      await onSubmit({
        score: numericScore,
        feedback: feedback.trim() || undefined,
        status,
      })
    } catch {
      setError('تعذّر حفظ التقييم. حاول مرة أخرى.')
    } finally {
      setBusy(false)
    }
  }

  const maxScore = submission?.max_score ?? submission?.assignment?.max_score ?? null
  const avatarUrl = resolvePublicAssetUrl(submission?.student_avatar ?? null)

  return (
    <AnimatePresence>
      {submission && (
        <motion.div
          key="submission-review-drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 overflow-hidden"
          dir="rtl"
        >
          <div
            className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 42 }}
            className="absolute inset-y-0 left-0 flex w-full max-w-[520px] flex-col overflow-hidden bg-white shadow-[0_0_80px_-10px_rgba(15,23,42,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 border-b border-slate-100 bg-gradient-to-bl from-[#22334A] to-[#2691C2] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                    مراجعة التسليم
                  </p>
                  <h2 className="mt-1 truncate text-[1.05rem] font-black text-white">
                    {displayText(submission.assignment_title)}
                  </h2>
                  <div className="mt-2">
                    <LmsStatusBadge status={submission.status} kind="submission" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="إغلاق"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#2691C2]">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-[12px] font-bold text-slate-500">جارٍ تحميل التفاصيل...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Section title="بيانات الطالب" icon={User}>
                    <div className="mb-3 flex items-center gap-3">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2691C2]/15 text-[13px] font-black text-[#2691C2]">
                          {initials(submission.student_name)}
                        </div>
                      )}
                      <div>
                        <p className="text-[13px] font-black text-[#22334A]">
                          {submission.student_name}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {displayText(submission.student_email)}
                        </p>
                      </div>
                    </div>
                    <InfoRow label="تاريخ التسليم" value={
                      submission.submitted_at
                        ? formatDateTime(submission.submitted_at)
                        : 'غير متوفر'
                    } />
                  </Section>

                  <Section title="بيانات الدورة" icon={BookOpen}>
                    <InfoRow label="الدورة" value={displayText(submission.course_name)} />
                    {submission.learning_path?.title && (
                      <InfoRow label="المسار التعليمي" value={submission.learning_path.title} />
                    )}
                  </Section>

                  <Section title="تفاصيل الواجب" icon={ClipboardList}>
                    <InfoRow label="عنوان الواجب" value={displayText(submission.assignment_title)} />
                    {submission.assignment?.due_date && (
                      <InfoRow
                        label="موعد التسليم"
                        value={formatDate(submission.assignment.due_date)}
                      />
                    )}
                    <InfoRow
                      label="الدرجة القصوى"
                      value={maxScore != null ? String(maxScore) : 'غير متوفر'}
                    />
                  </Section>

                  <Section title="إجابة الطالب" icon={FileText}>
                    <p className="whitespace-pre-wrap rounded-xl bg-white p-3 text-[12px] font-medium leading-relaxed text-[#22334A]/85 ring-1 ring-slate-100">
                      {displayText(submission.body_text ?? submission.body_preview)}
                    </p>
                  </Section>

                  <Section title="الملف المرفق" icon={Download}>
                    {submission.file_url ? (
                      <a
                        href={resolvePublicAssetUrl(submission.file_url) ?? submission.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-black text-[#2691C2] ring-1 ring-[#2691C2]/20 transition hover:bg-[#2691C2]/5"
                      >
                        <Download className="h-4 w-4" />
                        تنزيل الملف المرفق
                      </a>
                    ) : (
                      <p className="text-[12px] font-semibold text-slate-400">غير متوفر</p>
                    )}
                  </Section>

                  <Section title="التقييم" icon={Star}>
                    <div className="space-y-3">
                      <label className="grid gap-1.5">
                        <span className="text-[11px] font-black text-[#22334A]">
                          الدرجة {maxScore != null ? `(من ${maxScore})` : ''}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={maxScore ?? undefined}
                          value={score}
                          onChange={(e) => setScore(e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-right text-[13px] font-black text-[#22334A] outline-none focus:border-[#2691C2] focus:ring-2 focus:ring-[#2691C2]/15"
                          placeholder="0"
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-[11px] font-black text-[#22334A]">ملاحظات المدرب</span>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={4}
                          className="resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-right text-[12px] font-semibold text-[#22334A] outline-none focus:border-[#2691C2] focus:ring-2 focus:ring-[#2691C2]/15"
                          placeholder="اكتب ملاحظاتك للطالب..."
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-[11px] font-black text-[#22334A]">حالة المراجعة</span>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as ReviewPayload['status'])}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-black text-[#22334A] outline-none focus:border-[#2691C2]"
                        >
                          <option value="reviewed">تمت المراجعة</option>
                          <option value="needs_revision">يحتاج إعادة تسليم</option>
                        </select>
                      </label>

                      {error && (
                        <p className="text-[11px] font-bold text-red-600">{error}</p>
                      )}
                    </div>
                  </Section>
                </form>
              )}
            </div>

            {/* Footer */}
            {!loading && (
              <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    إغلاق
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      const form = (e.currentTarget.closest('aside') as HTMLElement | null)
                        ?.querySelector('form')
                      form?.requestSubmit()
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#EC943C] px-4 py-2.5 text-[12px] font-black text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جارٍ الحفظ...
                      </>
                    ) : (
                      'حفظ التقييم'
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
