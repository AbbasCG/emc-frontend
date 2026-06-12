import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { SubmissionDetail } from '@/types/lms'
import type { ReviewPayload } from '@/api/instructorApi'
import { formatDateTime } from '@/utils/dateTime'

type Props = {
  submission: SubmissionDetail
  onSubmit: (payload: ReviewPayload) => Promise<void>
  onClose?: () => void
}

export default function SubmissionReviewPanel({ submission, onSubmit, onClose }: Props) {
  const [score, setScore] = useState(submission.score ?? 0)
  const [feedback, setFeedback] = useState(submission.feedback ?? '')
  const [status, setStatus] = useState<ReviewPayload['status']>(
    submission.status === 'needs_revision' ? 'needs_revision' : 'reviewed',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setScore(submission.score ?? 0)
    setFeedback(submission.feedback ?? '')
    setStatus(submission.status === 'needs_revision' ? 'needs_revision' : 'reviewed')
  }, [submission.id, submission.score, submission.feedback, submission.status])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onSubmit({ score: Number(score), feedback: feedback || undefined, status })
      onClose?.()
    } catch {
      setError('تعذر حفظ التقييم. حاول مرة أخرى.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-deepBlue/[0.08] bg-white p-6 shadow-xl ring-1 ring-white"
    >
      <div className="text-right">
        <h3 className="text-lg font-black text-deepBlue">{submission.assignment_title}</h3>
        <p className="mt-1 text-sm font-bold text-slate-500">
          {submission.student_name}
          {submission.course_name ? ` · ${submission.course_name}` : ''}
        </p>
        {submission.submitted_at && (
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            تاريخ التسليم: {formatDateTime(submission.submitted_at)}
          </p>
        )}
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm font-medium leading-relaxed text-deepBlue/80 ring-1 ring-slate-100">
          {submission.body_text ?? submission.body_preview ?? 'لا يوجد نص.'}
        </p>
        {submission.file_url && (
          <a
            href={submission.file_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-xs font-black text-customBlue hover:underline"
          >
            تنزيل الملف المرفق
          </a>
        )}
      </div>

      <label className="grid gap-2 text-right">
        <span className="text-xs font-black text-deepBlue">
          الدرجة {submission.max_score != null ? `(من ${submission.max_score})` : ''}
        </span>
        <input
          type="number"
          min={0}
          max={submission.max_score ?? 100}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right font-black text-deepBlue outline-none focus:border-customBlue"
        />
      </label>

      <label className="grid gap-2 text-right">
        <span className="text-xs font-black text-deepBlue">ملاحظات المدرب</span>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none focus:border-customBlue"
        />
      </label>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="text-xs font-black text-slate-500">حالة المراجعة:</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ReviewPayload['status'])}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-deepBlue"
        >
          <option value="reviewed">تمت المراجعة</option>
          <option value="needs_revision">يحتاج إعادة تسليم</option>
        </select>
      </div>

      {error && <p className="text-right text-xs font-bold text-red-600">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black text-slate-600"
          >
            إغلاق
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-customOrange px-6 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-60"
        >
          {busy ? 'جارٍ الحفظ...' : 'حفظ التقييم'}
        </button>
      </div>
    </form>
  )
}
