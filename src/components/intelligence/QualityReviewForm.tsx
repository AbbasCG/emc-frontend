import { useState } from 'react'
import type { FormEvent } from 'react'

const DIMENSIONS: { key: keyof FormState; label: string }[] = [
  { key: 'overall_score', label: 'التقييم الإجمالي (٠–١٠٠)' },
  { key: 'objective_clarity', label: 'وضوح الأهداف' },
  { key: 'content_quality', label: 'جودة المحتوى' },
  { key: 'instructor_score', label: 'أداء المدرب' },
  { key: 'organization_score', label: 'التنظيم' },
  { key: 'time_commitment', label: 'الالتزام الزمني' },
  { key: 'completion_score', label: 'الإتمام' },
  { key: 'output_quality', label: 'جودة المخرجات' },
  { key: 'repeatability', label: 'قابلية التكرار' },
]

type FormState = {
  reviewable_label: string
  overall_score: number
  objective_clarity: number
  content_quality: number
  instructor_score: number
  organization_score: number
  time_commitment: number
  completion_score: number
  output_quality: number
  repeatability: number
  notes: string
  recommendations: string
}

const initial: FormState = {
  reviewable_label: '',
  overall_score: 75,
  objective_clarity: 8,
  content_quality: 8,
  instructor_score: 8,
  organization_score: 7,
  time_commitment: 7,
  completion_score: 8,
  output_quality: 7,
  repeatability: 8,
  notes: '',
  recommendations: '',
}

export default function QualityReviewForm({
  onSubmit,
}: {
  onSubmit: (payload: FormState) => Promise<void>
}) {
  const [values, setValues] = useState<FormState>(initial)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit(values)
      setValues(initial)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 text-right">
      <label className="grid gap-2">
        <span className="text-xs font-black text-deepBlue">عنصر المراجعة</span>
        <input
          required
          value={values.reviewable_label}
          onChange={(e) => setValues((v) => ({ ...v, reviewable_label: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-deepBlue"
          placeholder="مثال: ورشة تقييم الأثر"
        />
      </label>

      {DIMENSIONS.map(({ key, label }) => (
        <label key={key} className="grid gap-2">
          <span className="text-xs font-black text-deepBlue">{label}</span>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={key === 'overall_score' ? 0 : 0}
              max={key === 'overall_score' ? 100 : 10}
              step={1}
              value={values[key] as number}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [key]: Number(e.target.value) } as FormState))
              }
              className="w-full accent-customBlue"
            />
            <span className="w-10 text-center text-sm font-black text-customOrange">{values[key]}</span>
          </div>
        </label>
      ))}

      <label className="grid gap-2">
        <span className="text-xs font-black text-deepBlue">ملاحظات</span>
        <textarea
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          rows={3}
          className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-xs font-black text-deepBlue">توصيات</span>
        <textarea
          value={values.recommendations}
          onChange={(e) => setValues((v) => ({ ...v, recommendations: e.target.value }))}
          rows={3}
          className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-deepBlue py-3 text-sm font-black text-white disabled:opacity-50"
      >
        {busy ? 'جارٍ الحفظ...' : 'حفظ المراجعة'}
      </button>
    </form>
  )
}
