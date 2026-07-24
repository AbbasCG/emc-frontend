import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardList, ClipboardCheck, FileWarning, ListChecks } from 'lucide-react'
import { fetchAssignmentDashboard, type AssignmentDashboardCounters } from '@/api/instructorApi'
import { InstructorHero } from '@/components/instructor'
import toast from '@/lib/toast'

function Card({ label, value, icon: Icon, accent }: { label: string; value: number; icon: typeof ClipboardList; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wide text-deepBlue/40">{label}</p>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <p className="mt-1.5 text-[22px] font-black text-deepBlue">{value}</p>
    </div>
  )
}

export default function InstructorAssignmentDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<AssignmentDashboardCounters | null>(null)
  const [loading, setLoading] = useState(true)

  // `loading` starts true, so the mount fetch never has to arm it synchronously.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const counters = await fetchAssignmentDashboard()
        if (alive) setData(counters)
      } catch {
        if (alive) toast.error('تعذّر تحميل لوحة الواجبات')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  return (
    <div className="space-y-5 pb-16 font-[Cairo,sans-serif]" dir="rtl">
      <InstructorHero
        title="لوحة الواجبات"
        subtitle="نظرة عامة على واجباتك، التسليمات، والتقييمات المطلوبة"
        backTo="/dashboard/instructor/submissions"
        backLabel="التسليمات"
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : !data ? (
        <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 py-14 text-center text-[13px] font-semibold text-red-500">
          تعذّر تحميل البيانات
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card label="إجمالي الواجبات" value={data.assignments_total} icon={ClipboardList} accent="text-deepBlue/50" />
            <Card label="إجمالي التسليمات" value={data.submissions_total} icon={ListChecks} accent="text-sky-500" />
            <Card label="بانتظار المراجعة" value={data.pending_review} icon={FileWarning} accent="text-amber-500" />
            <Card label="تم تقييمها" value={data.graded} icon={CheckCircle2} accent="text-emerald-600" />
            <Card label="طلبات إعادة تسليم" value={data.needs_revision} icon={AlertTriangle} accent="text-orange-500" />
            <button
              type="button"
              onClick={() => navigate('/dashboard/instructor/assignments/missing-submissions')}
              className="rounded-2xl border border-red-200 bg-red-50/40 p-4 text-right transition hover:bg-red-50"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wide text-red-500/70">تسليمات مفقودة</p>
                <ClipboardCheck className="h-4 w-4 text-red-500" />
              </div>
              <p className="mt-1.5 text-[22px] font-black text-red-600">{data.missing_submissions}</p>
              <p className="mt-0.5 text-[10px] font-bold text-red-500/60">عرض التفاصيل ←</p>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
