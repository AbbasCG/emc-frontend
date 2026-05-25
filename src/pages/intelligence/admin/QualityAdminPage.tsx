import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  IntelligencePageSkeleton,
  QualityReviewForm,
  QualityScoreRing,
} from '@/components/intelligence'
import EmptyState from '@/components/dashboard/EmptyState'
import { ClipboardCheck } from 'lucide-react'
import { createQualityReview, fetchQualityReviews } from '@/api/qualityApi'

import type { QualityReview } from '@/types/intelligence'

export default function QualityAdminPage() {
  const [rows, setRows] = useState<QualityReview[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<QualityReview | null>(null)

  async function load() {
    setLoadError(null)
    setLoading(true)
    try {
      setRows(await fetchQualityReviews())
    } catch {
      setLoadError('تعذّر تحميل مراجعات الجودة. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <IntelligencePageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )

  return (
    <div className="space-y-10">
      <header className="text-right">
        <h1 className="text-2xl font-black text-deepBlue">مراجعات الجودة</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">نظام تقييم متعدد الأبعاد مع حلقات النقاط</p>
      </header>

      <div className="grid gap-10 xl:grid-cols-2">
        <section className="rounded-[1.35rem] bg-white p-6 shadow-xl ring-1 ring-deepBlue/[0.06]">
          <h2 className="text-center text-sm font-black text-deepBlue">مراجعة جديدة</h2>
          <div className="mt-6">
            <QualityReviewForm
              onSubmit={async (payload) => {
                try {
                  const row = await createQualityReview({
                    ...payload,
                    reviewer_name: 'مراجع EMC',
                    status: 'submitted',
                  } as QualityReview)
                  setRows((r) => [row, ...r])
                } catch {
                  const id = Math.max(0, ...rows.map((x) => x.id)) + 1
                  setRows((r) => [
                    {
                      id,
                      reviewer_name: 'مراجع EMC',
                      status: 'submitted',
                      reviewed_at: new Date().toISOString().slice(0, 10),
                      ...payload,
                    } as QualityReview,
                    ...r,
                  ])
                }
              }}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-right text-sm font-black text-deepBlue">السجل</h2>
          {rows.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="لا مراجعات" />
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => (
                <motion.li
                  key={r.id}
                  layout
                  className={`cursor-pointer rounded-2xl bg-white p-4 text-right shadow-md ring-1 transition ${
                    selected?.id === r.id ? 'ring-customBlue/40' : 'ring-deepBlue/[0.06]'
                  }`}
                  onClick={() => setSelected(r)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <QualityScoreRing score={r.overall_score} max={100} label="" size={72} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-deepBlue">{r.reviewable_label}</p>
                      <p className="mt-1 text-[11px] font-bold text-slate-500">{r.reviewer_name}</p>
                      <p className="mt-2 text-[10px] font-black text-customOrange">{r.reviewed_at ?? 'مسودة'}</p>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {selected && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.35rem] bg-gradient-to-bl from-deepBlue/[0.03] to-white p-8 ring-1 ring-deepBlue/[0.06]"
        >
          <h3 className="text-right text-lg font-black text-deepBlue">تفاصيل المراجعة #{selected.id}</h3>
          <div className="mt-8 flex flex-wrap justify-center gap-10">
            <QualityScoreRing score={selected.overall_score} max={100} label="الإجمالي" />
            <QualityScoreRing score={(selected.objective_clarity ?? 0) * 10} max={100} label="وضوح الأهداف" />
            <QualityScoreRing score={(selected.content_quality ?? 0) * 10} max={100} label="المحتوى" />
            <QualityScoreRing score={(selected.instructor_score ?? 0) * 10} max={100} label="المدرب" />
          </div>
          <div className="mt-8 grid gap-4 text-right text-sm font-semibold text-slate-700">
            <p>
              <span className="font-black text-deepBlue">ملاحظات: </span>
              {selected.notes ?? '—'}
            </p>
            <p>
              <span className="font-black text-deepBlue">توصيات: </span>
              {selected.recommendations ?? '—'}
            </p>
          </div>
        </motion.section>
      )}
    </div>
  )
}
