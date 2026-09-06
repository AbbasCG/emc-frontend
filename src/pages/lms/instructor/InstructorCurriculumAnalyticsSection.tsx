import { useEffect, useState } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { fetchCurriculumAnalytics, MATERIAL_SCOPE_LABELS, type CurriculumAnalytics } from '@/api/courseContentApi'

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-wide text-deepBlue/40">{label}</p>
      <p className="mt-1.5 text-[20px] font-black text-deepBlue">{value}</p>
    </div>
  )
}

export function InstructorCurriculumAnalyticsSection({ groupId }: { groupId: number }) {
  const [data, setData] = useState<CurriculumAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  /** Retry from the error state — outside any effect, so it may flip to the loading
   *  state synchronously. */
  function load() {
    setLoading(true)
    setError(false)
    fetchCurriculumAnalytics(groupId).then(setData).catch(() => setError(true)).finally(() => setLoading(false))
  }

  // Re-arm the loading state during render when the group changes (react.dev
  // "adjusting state when a prop changes"); mount is covered by the initial values.
  const [seenGroupId, setSeenGroupId] = useState(groupId)
  if (seenGroupId !== groupId) {
    setSeenGroupId(groupId)
    setLoading(true)
    setError(false)
  }

  useEffect(() => {
    let alive = true
    fetchCurriculumAnalytics(groupId)
      .then((d) => { if (alive) setData(d) })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [groupId])

  if (loading) {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
  }
  if (error || !data) {
    return (
      <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 py-10 text-center">
        <p className="text-[13px] font-semibold text-red-500">تعذّر تحميل تحليلات المنهج</p>
        <button type="button" onClick={load} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-deepBlue px-4 py-2 text-[11px] font-black text-white">
          <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
        </button>
      </div>
    )
  }

  const { summary, modules, lessons, materials } = data

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-[#0077B6]" />
        <p className="text-[13px] font-black text-deepBlue">تحليلات المنهج</p>
      </div>

      {summary.eligible_students === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-10 text-center">
          <p className="text-[12px] font-semibold text-deepBlue/40">لا يوجد طلاب مؤهلون في هذا الصف بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="الطلاب المؤهلون" value={summary.eligible_students} />
          <Kpi label="لم يبدأوا" value={summary.not_started_students} />
          <Kpi label="قيد التقدم" value={summary.in_progress_students} />
          <Kpi label="مكتملون" value={summary.completed_students} />
          <Kpi label="متوسط تقدم المنهج" value={`${summary.average_course_progress_percentage}%`} />
          <Kpi label="الوحدات النشطة" value={summary.modules_count} />
          <Kpi label="الدروس النشطة" value={summary.lessons_count} />
          <Kpi label="المواد" value={summary.materials_count} />
        </div>
      )}

      {modules.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-black text-deepBlue/50">تقدم الوحدات</p>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-right text-[11px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-deepBlue/40">
                <tr><th className="px-3 py-2">الوحدة</th><th className="px-3 py-2">الدروس</th><th className="px-3 py-2">نسبة الإنجاز</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modules.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 font-bold text-deepBlue">{m.title}</td>
                    <td className="px-3 py-2 text-deepBlue/60">{m.eligible_lessons}</td>
                    <td className="px-3 py-2 font-black text-[#0077B6]">{m.completion_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lessons.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-black text-deepBlue/50">تقدم الدروس</p>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-right text-[11px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-deepBlue/40">
                <tr><th className="px-3 py-2">الدرس</th><th className="px-3 py-2">مكتمل / مؤهل</th><th className="px-3 py-2">نسبة الإنجاز</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lessons.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2 font-bold text-deepBlue">{l.title}</td>
                    <td className="px-3 py-2 text-deepBlue/60">{l.completed_students} / {l.eligible_students}</td>
                    <td className="px-3 py-2 font-black text-[#0077B6]">{l.completion_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[11px] font-black text-deepBlue/50">تفاعل الطلاب مع المواد</p>
        {materials.length === 0 ? (
          <p className="text-[11px] font-semibold text-deepBlue/35">لا توجد بيانات تفاعل بعد</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-right text-[11px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-deepBlue/40">
                <tr><th className="px-3 py-2">المادة</th><th className="px-3 py-2">النطاق</th><th className="px-3 py-2">التفاعلات</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 font-bold text-deepBlue">{m.title}</td>
                    <td className="px-3 py-2 text-deepBlue/60">{MATERIAL_SCOPE_LABELS[m.scope]}</td>
                    <td className="px-3 py-2 font-black text-[#0077B6]">{m.total_interactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
