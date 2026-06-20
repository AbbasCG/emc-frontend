import { useCallback, useEffect, useState } from 'react'
import { Activity, TrendingUp, CheckCircle2, BookOpen } from 'lucide-react'
import { adminListProgress } from '@/api/adminLmsApi'
import { LmsEmptyState } from '@/components/lms'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { fmtDate, normCourseTitle, normStatus } from '@/components/lms/lmsFormatters'

type ProgressRow = {
  id: number
  user_id?: number | null
  user_name?: string | null
  user_email?: string | null
  course_id?: number | null
  course_title?: string | null
  course_name?: string | null
  progress_percentage?: number | null
  completed_sessions?: number | null
  total_sessions?: number | null
  attendance_percentage?: number | null
  status?: string | null
  completed_at?: string | null
  last_activity_at?: string | null
  updated_at?: string | null
  label?: string | null
  subtitle?: string | null
  user?: { name?: string | null } | null
  course?: { title?: string | null } | null
}

function normRow(r: ProgressRow): ProgressRow {
  return {
    ...r,
    user_name: r.user_name ?? r.user?.name ?? r.label ?? '—',
    course_title: normCourseTitle(r.course_title ?? r.course_name ?? r.course?.title ?? r.subtitle),
    progress_percentage: r.progress_percentage ?? 0,
    status: r.status ?? 'in_progress',
  }
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const fill = clamped >= 100 ? 'bg-emerald-400' : clamped >= 50 ? 'bg-customBlue' : 'bg-customOrange'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-deepBlue/[0.08]">
        <div className={`h-full rounded-full transition-all ${fill}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-black text-deepBlue/60 font-latin">{clamped}%</span>
    </div>
  )
}

const statusBadge: Record<string, string> = {
  completed:   'bg-emerald-50 text-emerald-700 ring-emerald-100',
  in_progress: 'bg-customBlue/[0.07] text-customBlue ring-customBlue/10',
  not_started: 'bg-slate-50 text-slate-500 ring-slate-100',
}

export default function AdminLmsProgressPage() {
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminListProgress()
      .then((list) => setRows((list as ProgressRow[]).map(normRow)))
      .catch(() => setError('تعذّر تحميل بيانات التقدم.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (r.user_name ?? '').toLowerCase().includes(q)
      || (r.course_title ?? '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || r.status === filterStatus
    return matchSearch && matchStatus
  })

  const total = rows.length
  const completed = rows.filter((r) => r.status === 'completed').length
  const inProgress = rows.filter((r) => r.status === 'in_progress').length
  const avgPct = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.progress_percentage ?? 0), 0) / rows.length)
    : 0

  const kpis = [
    { label: 'إجمالي السجلات', value: total,      icon: Activity,    variant: 'brand'   as const },
    { label: 'جارٍ',           value: inProgress, icon: TrendingUp,  variant: 'accent'  as const },
    { label: 'مكتمل',          value: completed,  icon: CheckCircle2, variant: 'success' as const },
    { label: 'متوسط التقدم',   value: `${avgPct}%`, icon: BookOpen,  variant: 'muted'   as const },
  ]

  return (
    <AdminLmsShell
      title="إدارة التقدم"
      description="متابعة تقدم المتعلمين عبر الدورات"
      breadcrumb="التقدم"
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
          placeholder="بحث عن متعلم أو دورة…"
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
          <option value="in_progress">جارٍ</option>
          <option value="completed">مكتمل</option>
          <option value="not_started">لم يبدأ</option>
        </select>
      </div>

      {/* Table */}
      {!loading && (
        filtered.length === 0 ? (
          <LmsEmptyState
            icon={Activity}
            title="لا توجد بيانات تقدم"
            description={search || filterStatus ? 'جرّب تغيير معايير البحث.' : 'لم يُسجَّل تقدم أي متعلم بعد.'}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">المتعلم</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">الدورة</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">نسبة التقدم</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">الجلسات</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">الحالة</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">آخر نشاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((r) => {
                    const st = r.status ?? 'in_progress'
                    const bdg = statusBadge[st] ?? 'bg-slate-50 text-slate-500 ring-slate-100'
                    const lastActivity = r.last_activity_at ?? r.completed_at ?? r.updated_at
                    const sessionsLabel = (r.total_sessions ?? 0) > 0
                      ? `${r.completed_sessions ?? 0} / ${r.total_sessions}`
                      : '—'
                    return (
                      <tr key={r.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <p className="font-bold text-deepBlue">{r.user_name}</p>
                          {r.user_email && (
                            <p className="mt-0.5 text-[11px] font-medium text-deepBlue/35 font-latin">{r.user_email}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-deepBlue/70 line-clamp-1">{r.course_title}</td>
                        <td className="px-5 py-4">
                          <ProgressBar pct={r.progress_percentage ?? 0} />
                        </td>
                        <td className="px-5 py-4 text-sm font-black text-deepBlue/60 font-latin">{sessionsLabel}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${bdg}`}>
                            {normStatus(st)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-deepBlue/45">
                          {fmtDate(lastActivity)}
                        </td>
                      </tr>
                    )
                  })}
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
