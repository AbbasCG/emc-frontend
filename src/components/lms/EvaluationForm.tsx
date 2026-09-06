import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import type { EvaluationPayload } from '@/api/studentApi'

type Props = {
  courseLabel?: string
  defaultCourseId?: number
  defaultRegistrationId?: number
  onSubmit: (payload: EvaluationPayload) => Promise<void>
}

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex flex-col gap-2 text-right sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-black text-deepBlue">{label}</span>
      <div className="flex flex-row-reverse gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={[
              'h-9 w-9 rounded-lg text-lg transition',
              n <= value ? 'bg-customOrange text-white shadow-sm' : 'bg-slate-100 text-slate-400',
            ].join(' ')}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

export default function EvaluationForm({
  courseLabel,
  defaultCourseId,
  defaultRegistrationId,
  onSubmit,
}: Props) {
  const [overall, setOverall] = useState(5)
  const [content, setContent] = useState(5)
  const [instructor, setInstructor] = useState(5)
  const [organization, setOrganization] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onSubmit({
        course_id: defaultCourseId,
        registration_id: defaultRegistrationId,
        overall_rating: overall,
        content_quality: content,
        instructor_quality: instructor,
        organization_quality: organization,
        comment: comment.trim() || undefined,
      })
      setDone(true)
    } catch {
      setError('تعذر إرسال التقييم. تحقق من الاتصال بالخادم.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl bg-emerald-50 px-6 py-8 text-center font-black text-emerald-800 ring-1 ring-emerald-100"
      >
        شكراً لك تم استلام تقييمك بنجاح.
      </motion.div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-[1.35rem] bg-white p-6 shadow-xl ring-1 ring-deepBlue/[0.06] sm:p-8"
    >
      <div className="text-right">
        <h2 className="text-xl font-black text-deepBlue">تقييم تجربة التعلم</h2>
        {courseLabel && <p className="mt-2 text-sm font-bold text-slate-500">{courseLabel}</p>}
      </div>

      <div className="space-y-6 rounded-2xl bg-slate-50/80 p-5 ring-1 ring-slate-100">
        <StarRow label="التقييم العام" value={overall} onChange={setOverall} />
        <StarRow label="جودة المحتوى" value={content} onChange={setContent} />
        <StarRow label="أداء المدرب" value={instructor} onChange={setInstructor} />
        <StarRow label="التنظيم والإدارة" value={organization} onChange={setOrganization} />
      </div>

      <label className="grid gap-2 text-right">
        <span className="text-sm font-black text-deepBlue">تعليقات إضافية</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="شاركنا انطباعك باختصار..."
          className="resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-right font-semibold text-deepBlue outline-none focus:border-customBlue"
        />
      </label>

      {error && <p className="text-right text-xs font-bold text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-deepBlue py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-deepBlue/90 disabled:opacity-60"
      >
        {busy ? 'جارٍ الإرسال...' : 'إرسال التقييم'}
      </button>
    </form>
  )
}
