import { useCallback, useEffect, useState } from 'react'
import { CalendarRange, Clock, CalendarCheck2, CheckCircle2 } from 'lucide-react'
import { adminListSessions } from '@/api/adminLmsApi'
import type { LmsSession } from '@/types/lms'
import { LmsStatusBadge, LmsEmptyState } from '@/components/lms'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { fmtDate, normCourseTitle, normInstructor } from '@/components/lms/lmsFormatters'

type Row = LmsSession & {
  course_title?: string | null
  session_date?: string | null
  start_time?: string | null
  end_time?: string | null
}

function statusStripe(status: string) {
  if (status === 'live') return 'border-r-2 border-emerald-400'
  if (status === 'scheduled') return 'border-r-2 border-customBlue/50'
  if (status === 'cancelled') return 'border-r-2 border-rose-300'
  return 'border-r-2 border-slate-200'
}

function SessionRow({ row }: { row: Row }) {
  const courseTitle = normCourseTitle(row.course_title ?? row.course_name)
  const instructorName = normInstructor(row.instructor_name)
  const rawDate = row.session_date ?? row.starts_at ?? row.date
  const timeStr = row.start_time ? row.start_time.slice(0, 5) : null
  const displayDate = fmtDate(rawDate)

  return (
    <tr className={`transition-colors hover:bg-slate-50/60 ${statusStripe(row.status)}`}>
      <td className="px-5 py-4">
        <p className="font-bold text-deepBlue line-clamp-1">{row.title ?? courseTitle}</p>
        <p className="mt-0.5 text-xs font-semibold text-deepBlue/45 line-clamp-1">{courseTitle}</p>
      </td>
      <td className="px-5 py-4">
        <p className="text-sm font-semibold text-deepBlue/70">{instructorName}</p>
      </td>
      <td className="px-5 py-4">
        <p className="text-sm font-semibold text-deepBlue/80">{displayDate}</p>
        {timeStr && <p className="mt-0.5 text-xs font-medium text-deepBlue/40 font-latin">{timeStr}</p>}
      </td>
      <td className="px-5 py-4">
        <LmsStatusBadge status={row.status} kind="session" />
      </td>
      {row.meeting_link && (
        <td className="px-5 py-4">
          <a
            href={row.meeting_link}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-customBlue/10 px-2.5 py-1 text-xs font-black text-customBlue hover:bg-customBlue/20 transition"
          >
            رابط
          </a>
        </td>
      )}
    </tr>
  )
}

export default function AdminLmsSessionsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminListSessions()
      .then((list) => setRows(list as Row[]))
      .catch(() => setError('تعذّر تحميل الجلسات. تحقق من الاتصال وحاول مرة أخرى.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (r.title ?? '').toLowerCase().includes(q)
      || (r.course_name ?? '').toLowerCase().includes(q)
      || (r.instructor_name ?? '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || r.status === filterStatus
    return matchSearch && matchStatus
  })

  const total = rows.length
  const upcoming = rows.filter((r) => r.status === 'scheduled').length
  const live = rows.filter((r) => r.status === 'live').length
  const completed = rows.filter((r) => r.status === 'completed').length

  const kpis = [
    { label: 'إجمالي الجلسات', value: total, icon: CalendarRange, variant: 'brand' as const },
    { label: 'قادمة', value: upcoming, icon: Clock, variant: 'muted' as const },
    { label: 'مباشرة الآن', value: live, icon: CalendarCheck2, variant: 'accent' as const },
    { label: 'مكتملة', value: completed, icon: CheckCircle2, variant: 'success' as const },
  ]

  return (
    <AdminLmsShell
      title="إدارة الجلسات"
      description="جدولة الجلسات وحالتها والمدربون المسؤولون عنها"
      breadcrumb="الجلسات"
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
          placeholder="بحث عن جلسة أو دورة أو مدرب…"
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
          <option value="scheduled">قادمة</option>
          <option value="live">مباشرة</option>
          <option value="completed">مكتملة</option>
          <option value="cancelled">ملغاة</option>
        </select>
      </div>

      {/* Table */}
      {!loading && (
        filtered.length === 0 ? (
          <LmsEmptyState
            icon={CalendarRange}
            title="لا توجد جلسات"
            description={search || filterStatus ? 'جرّب تغيير معايير البحث.' : 'لم يتم إضافة أي جلسات بعد.'}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">الجلسة / الدورة</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">المدرب</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">التاريخ</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((row) => <SessionRow key={row.id} row={row} />)}
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
