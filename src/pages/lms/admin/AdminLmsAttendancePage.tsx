import { useCallback, useEffect, useState } from 'react'
import { Users, UserCheck, UserX, Clock4, ShieldCheck } from 'lucide-react'
import { adminListAttendance } from '@/api/adminLmsApi'
import { LmsEmptyState } from '@/components/lms'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { fmtDate } from '@/components/lms/lmsFormatters'

type AttendanceRecord = {
  id: number
  user_id?: number | null
  session_id?: number | null
  status?: string | null
  notes?: string | null
  checked_in_at?: string | null
  session_title?: string | null
  session_date?: string | null
  course_title?: string | null
  user_name?: string | null
  user?: { name?: string | null; email?: string | null } | null
  session?: { title?: string | null; session_date?: string | null } | null
  label?: string
  subtitle?: string | null
  updated_at?: string | null
}

function normRecord(r: AttendanceRecord): AttendanceRecord {
  return {
    ...r,
    session_title: r.session_title ?? r.session?.title ?? r.label ?? '—',
    session_date: r.session_date ?? r.session?.session_date ?? r.checked_in_at,
    course_title: r.course_title ?? r.subtitle ?? 'دورة غير مرتبطة',
    user_name: r.user_name ?? r.user?.name ?? '—',
    status: r.status ?? 'absent',
  }
}

const statusBg: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  absent:  'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
  late:    'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  excused: 'bg-sky-50 text-customBlue ring-1 ring-sky-100',
}

const statusLabel: Record<string, string> = {
  present: 'حاضر',
  absent:  'غائب',
  late:    'متأخر',
  excused: 'معذور',
}

export default function AdminLmsAttendancePage() {
  const [rows, setRows] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminListAttendance()
      .then((list) => setRows((list as AttendanceRecord[]).map(normRecord)))
      .catch(() => setError('تعذّر تحميل سجلات الحضور.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (r.user_name ?? '').toLowerCase().includes(q)
      || (r.session_title ?? '').toLowerCase().includes(q)
      || (r.course_title ?? '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || r.status === filterStatus
    return matchSearch && matchStatus
  })

  const total = rows.length
  const present = rows.filter((r) => r.status === 'present').length
  const absent = rows.filter((r) => r.status === 'absent').length
  const late = rows.filter((r) => r.status === 'late').length
  const excused = rows.filter((r) => r.status === 'excused').length

  const kpis = [
    { label: 'إجمالي السجلات', value: total,   icon: Users,      variant: 'brand'   as const },
    { label: 'حاضر',           value: present,  icon: UserCheck,  variant: 'success' as const },
    { label: 'غائب',           value: absent,   icon: UserX,      variant: 'accent'  as const },
    { label: 'متأخر / معذور',  value: late + excused, icon: Clock4, variant: 'muted' as const },
  ]

  return (
    <AdminLmsShell
      title="إدارة الحضور"
      description="سجلات الحضور لكل الجلسات والمتعلمين"
      breadcrumb="الحضور"
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
          placeholder="بحث عن متعلم أو جلسة أو دورة…"
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
          <option value="present">حاضر</option>
          <option value="absent">غائب</option>
          <option value="late">متأخر</option>
          <option value="excused">معذور</option>
        </select>
      </div>

      {/* Table */}
      {!loading && (
        filtered.length === 0 ? (
          <LmsEmptyState
            icon={ShieldCheck}
            title="لا توجد سجلات حضور"
            description={search || filterStatus ? 'جرّب تغيير معايير البحث.' : 'لم تُسجَّل أي سجلات حضور بعد.'}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">المتعلم</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">الجلسة</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">الدورة</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">التاريخ</th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wide text-slate-400">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((r) => {
                    const st = r.status ?? 'absent'
                    const cls = statusBg[st] ?? 'bg-slate-50 text-slate-500 ring-1 ring-slate-100'
                    const lbl = statusLabel[st] ?? st
                    return (
                      <tr key={r.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-5 py-4 font-bold text-deepBlue">{r.user_name}</td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-deepBlue/80 line-clamp-1">{r.session_title}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-black bg-customBlue/[0.07] text-customBlue ring-1 ring-customBlue/10">
                            {r.course_title}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-deepBlue/60">
                          {fmtDate(r.session_date)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${cls}`}>
                            {lbl}
                          </span>
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
