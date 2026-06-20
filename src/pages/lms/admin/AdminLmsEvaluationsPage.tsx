import { useCallback, useEffect, useState } from 'react'
import { Star, FileSearch } from 'lucide-react'
import { adminListEvaluations } from '@/api/adminLmsApi'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { fmtDate, normCourseTitle } from '@/components/lms/lmsFormatters'

type EvaluationRow = {
  id: number
  label?: string | null
  title?: string | null
  subtitle?: string | null
  course_title?: string | null
  course_name?: string | null
  student_name?: string | null
  rating?: number | null
  score?: number | null
  status?: string | null
  submitted_at?: string | null
  updated_at?: string | null
}

function normEval(r: EvaluationRow): EvaluationRow {
  return {
    ...r,
    title: r.title ?? r.label,
    course_title: normCourseTitle(r.course_title ?? r.course_name),
    student_name: r.student_name ?? r.subtitle,
  }
}

function StarRow({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < n ? 'fill-customOrange text-customOrange' : 'text-slate-200'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  )
}

export default function AdminLmsEvaluationsPage() {
  const [rows, setRows] = useState<EvaluationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminListEvaluations()
      .then((list) => setRows((list as EvaluationRow[]).map(normEval)))
      .catch(() => setError('تعذّر تحميل التقييمات.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const total = rows.length
  const rated = rows.filter((r) => r.rating != null || r.score != null).length
  const avgRating = rows.length
    ? (rows.reduce((s, r) => s + (r.rating ?? r.score ?? 0), 0) / rows.length).toFixed(1)
    : '—'

  const kpis = [
    { label: 'إجمالي التقييمات', value: total,      icon: Star,       variant: 'brand'   as const },
    { label: 'مع تقييم',         value: rated,       icon: Star,       variant: 'accent'  as const },
    { label: 'متوسط التقييم',    value: avgRating,   icon: FileSearch, variant: 'success' as const },
  ]

  return (
    <AdminLmsShell
      title="إدارة التقييمات"
      description="استطلاعات وتقييمات المتعلمين بعد الدورات"
      breadcrumb="التقييمات"
      kpis={kpis}
      loading={loading}
      error={error}
      onRetry={load}
      onRefresh={load}
    >
      {!loading && (
        rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-deepBlue/[0.12] bg-white/60 py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-customOrange/10 ring-1 ring-customOrange/20">
              <Star size={28} className="text-customOrange" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-base font-black text-deepBlue">لا توجد تقييمات متاحة حالياً</p>
              <p className="mt-1 text-sm font-medium text-deepBlue/45">
                ستظهر تقييمات المتعلمين هنا بمجرد إكمال الدورات وتقديم الاستطلاعات.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">التقييم / الدورة</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">المتعلم</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">التقييم</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <p className="font-bold text-deepBlue line-clamp-1">{r.title ?? '—'}</p>
                        <p className="mt-0.5 text-xs font-semibold text-deepBlue/45">{r.course_title}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-deepBlue/70">{r.student_name ?? '—'}</td>
                      <td className="px-5 py-4">
                        {r.rating != null
                          ? <StarRow n={r.rating} />
                          : r.score != null
                            ? <span className="font-black text-deepBlue/70">{r.score}</span>
                            : <span className="text-deepBlue/30 text-xs">—</span>
                        }
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-deepBlue/60">
                        {fmtDate(r.submitted_at ?? r.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </AdminLmsShell>
  )
}
