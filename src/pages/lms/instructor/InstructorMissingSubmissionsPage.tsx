import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { fetchMissingSubmissions, type MissingSubmissionsRow } from '@/api/instructorApi'
import { InstructorHero, InstructorEmptyState } from '@/components/instructor'
import toast from '@/lib/toast'
import { formatDateTime } from '@/utils/dateTime'

export default function InstructorMissingSubmissionsPage() {
  const [rows, setRows] = useState<MissingSubmissionsRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchMissingSubmissions()
      .then(setRows)
      .catch(() => toast.error('تعذّر تحميل التسليمات المفقودة'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5 pb-16 font-[Cairo,sans-serif]" dir="rtl">
      <InstructorHero
        title="التسليمات المفقودة"
        subtitle="الطلاب الذين لم يقوموا بتسليم واجباتهم بعد، عبر جميع الدورات"
        backTo="/dashboard/instructor/assignments/dashboard"
        backLabel="لوحة الواجبات"
      />

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : rows.length === 0 ? (
        <InstructorEmptyState icon={AlertTriangle} title="لا توجد تسليمات مفقودة" description="جميع الطلاب قاموا بتسليم واجباتهم" />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.assignment_id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[13px] font-black text-deepBlue">{row.assignment_title}</p>
                  <p className="text-[10px] font-semibold text-deepBlue/45">
                    {row.course_title ?? '—'} {row.deadline ? `· الموعد النهائي: ${formatDateTime(row.deadline)}` : ''}
                  </p>
                </div>
                <span className="rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-600">
                  {row.missing_count} طالب لم يسلّم
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.students.map((s) => (
                  <span key={s.user_id} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-deepBlue/60">
                    {s.name ?? s.email ?? `#${s.user_id}`}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
