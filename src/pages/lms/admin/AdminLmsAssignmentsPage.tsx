import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, ClipboardCheck, Hourglass, CheckSquare } from 'lucide-react'
import { adminListAssignments } from '@/api/adminLmsApi'
import { LmsEmptyState, LmsStatusBadge } from '@/components/lms'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { fmtDate, normCourseTitle, normInstructor } from '@/components/lms/lmsFormatters'

type AssignmentRow = {
  id: number
  title?: string | null
  course_id?: number | null
  course_title?: string | null
  course_name?: string | null
  instructor_id?: number | null
  instructor_name?: string | null
  due_date?: string | null
  due_at?: string | null
  deadline?: string | null
  max_score?: number | null
  status?: string | null
  submissions_count?: number | null
  pending_count?: number | null
  graded_count?: number | null
  course?: { title?: string | null } | null
  instructor?: { name?: string | null } | null
}

function normRow(r: AssignmentRow): AssignmentRow {
  return {
    ...r,
    course_title: normCourseTitle(r.course_title ?? r.course_name ?? r.course?.title),
    instructor_name: normInstructor(r.instructor_name ?? r.instructor?.name),
    due_date: r.due_date ?? r.due_at ?? r.deadline,
    status: r.status ?? 'active',
    submissions_count: r.submissions_count ?? 0,
    pending_count: r.pending_count ?? 0,
    graded_count: r.graded_count ?? 0,
  }
}

function Chip({ count, label, variant }: { count: number; label: string; variant: 'blue' | 'amber' | 'emerald' }) {
  const cls = {
    blue:    'bg-customBlue/[0.07] text-customBlue ring-customBlue/10',
    amber:   'bg-amber-50 text-amber-700 ring-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  }[variant]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ring-1 ${cls}`}>
      {count} <span className="font-medium opacity-70">{label}</span>
    </span>
  )
}

export default function AdminLmsAssignmentsPage() {
  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminListAssignments()
      .then((list) => setRows((list as AssignmentRow[]).map(normRow)))
      .catch(() => setError('تعذّر تحميل الواجبات.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (r.title ?? '').toLowerCase().includes(q)
      || (r.course_title ?? '').toLowerCase().includes(q)
      || (r.instructor_name ?? '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || r.status === filterStatus
    return matchSearch && matchStatus
  })

  const total = rows.length
  const active = rows.filter((r) => r.status === 'active').length
  const pendingReview = rows.reduce((s, r) => s + (r.pending_count ?? 0), 0)
  const graded = rows.reduce((s, r) => s + (r.graded_count ?? 0), 0)

  const kpis = [
    { label: 'إجمالي الواجبات', value: total,       icon: ClipboardList,  variant: 'brand'   as const },
    { label: 'نشطة',            value: active,       icon: ClipboardCheck, variant: 'muted'   as const },
    { label: 'بانتظار المراجعة', value: pendingReview, icon: Hourglass,   variant: 'accent'  as const },
    { label: 'تمت المراجعة',    value: graded,       icon: CheckSquare,    variant: 'success' as const },
  ]

  return (
    <AdminLmsShell
      title="إدارة الواجبات"
      description="متابعة الواجبات وحالات التسليم عبر الدورات"
      breadcrumb="الواجبات"
      kpis={kpis}
      loading={loading}
      error={error}
      onRetry={load}
      onRefresh={load}
    >
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="بحث عن واجب أو دورة أو مدرب…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 flex-1 min-w-48 rounded-xl border border-deepBlue/[0.10] bg-white px-3 text-sm font-semibold text-deepBlue placeholder:font-medium placeholder:text-deepBlue/30 shadow-sm focus:outline-none focus:ring-2 focus:ring-customBlue/30"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-xl border border-deepBlue/[0.10] bg-white px-3 text-sm font-bold text-deepBlue shadow-sm focus:outline-none focus:ring-2 focus:ring-customBlue/30"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="archived">أرشيف</option>
        </select>
      </div>

      {/* Table */}
      {!loading && (
        filtered.length === 0 ? (
          <LmsEmptyState
            icon={ClipboardList}
            title="لا توجد واجبات"
            description={search || filterStatus ? 'جرّب تغيير معايير البحث.' : 'لم يتم إضافة أي واجبات بعد.'}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">الواجب / الدورة</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">المدرب</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">تاريخ التسليم</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">التسليمات</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <p className="font-bold text-deepBlue line-clamp-1">{r.title ?? '—'}</p>
                        <p className="mt-0.5 text-xs font-semibold text-deepBlue/45">{r.course_title}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-deepBlue/70">{r.instructor_name}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-deepBlue/70">
                        {fmtDate(r.due_date)}
                        {r.max_score != null && (
                          <p className="mt-0.5 text-xs font-medium text-deepBlue/35">{r.max_score} نقطة</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          <Chip count={r.submissions_count ?? 0} label="إجمالي" variant="blue" />
                          {(r.pending_count ?? 0) > 0 && (
                            <Chip count={r.pending_count!} label="مراجعة" variant="amber" />
                          )}
                          {(r.graded_count ?? 0) > 0 && (
                            <Chip count={r.graded_count!} label="مُقيَّم" variant="emerald" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <LmsStatusBadge status={r.status ?? 'active'} kind="neutral" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-50 px-5 py-2.5 text-xs font-bold text-deepBlue/35">
              عرض {filtered.length} من {total}
            </div>
          </div>
        )
      )}
    </AdminLmsShell>
  )
}
