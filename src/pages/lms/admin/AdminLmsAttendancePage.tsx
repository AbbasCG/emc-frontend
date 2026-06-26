import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, UserCheck, UserX, Clock4 } from 'lucide-react'
import { adminListAttendance } from '@/api/adminLmsApi'
import { LmsEmptyState } from '@/components/lms'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { LmsFilterBar, countActiveFilters, lmsSelectClass } from '@/components/lms/management'
import { fmtDate, fmtNum } from '@/components/lms/lmsFormatters'

type AttendanceRecord = {
  id: number
  user_id?: number | null
  session_id?: number | null
  status?: string | null
  notes?: string | null
  checked_in_at?: string | null
  attendance_date?: string | null
  session_title?: string | null
  session_date?: string | null
  course_title?: string | null
  user_name?: string | null
  user?: { name?: string | null; email?: string | null } | null
  session?: { title?: string | null; name?: string | null; session_date?: string | null; start_at?: string | null } | null
  course?: { id?: number | null; title?: string | null } | null
  label?: string
  subtitle?: string | null
  updated_at?: string | null
}

function normRecord(r: AttendanceRecord): AttendanceRecord {
  const sessionTitle = r.session_title ?? r.session?.title ?? r.session?.name ?? r.label ?? null
  const sessionDate  = r.session_date ?? r.attendance_date ?? r.session?.session_date ?? r.session?.start_at ?? r.checked_in_at ?? null
  const courseTitle  = r.course_title ?? r.course?.title ?? r.subtitle ?? null
  return {
    ...r,
    session_title: sessionTitle ?? '—',
    session_date:  sessionDate,
    course_title:  courseTitle ?? 'دورة غير مرتبطة',
    user_name:     r.user_name ?? r.user?.name ?? '—',
    status:        r.status ?? 'absent',
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
  const [filterCourse, setFilterCourse] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminListAttendance()
      .then((list) => setRows((list as AttendanceRecord[]).map(normRecord)))
      .catch(() => setError('تعذّر تحميل سجلات الحضور. تحقق من الاتصال وأعد المحاولة.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const courseOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = [{ value: '', label: 'كل الدورات' }]
    for (const r of rows) {
      const title = r.course_title ?? ''
      if (title && title !== 'دورة غير مرتبطة' && !seen.has(title)) {
        seen.add(title)
        opts.push({ value: title, label: title })
      }
    }
    return opts
  }, [rows])

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (r.user_name ?? '').toLowerCase().includes(q)
      || (r.session_title ?? '').toLowerCase().includes(q)
      || (r.course_title ?? '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || r.status === filterStatus
    const matchCourse = !filterCourse || r.course_title === filterCourse
    const sessionDate = (r.session_date ?? '').slice(0, 10)
    const matchDateFrom = !dateFrom || sessionDate >= dateFrom
    const matchDateTo = !dateTo || sessionDate <= dateTo
    return matchSearch && matchStatus && matchCourse && matchDateFrom && matchDateTo
  })

  const total   = rows.length
  const present = rows.filter((r) => r.status === 'present').length
  const absent  = rows.filter((r) => r.status === 'absent').length
  const late    = rows.filter((r) => r.status === 'late').length
  const excused = rows.filter((r) => r.status === 'excused').length
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0

  const activeCount = countActiveFilters([search, filterStatus, filterCourse, dateFrom, dateTo])

  function clearFilters() {
    setSearch('')
    setFilterStatus('')
    setFilterCourse('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <AdminLmsShell
      title="إدارة الحضور"
      description="سجلات الحضور لكل الجلسات والمتعلمين"
      breadcrumb="الحضور"
      kpis={[
        { label: 'إجمالي السجلات', value: fmtNum(total), icon: Users, variant: 'brand' },
        { label: 'حاضر', value: fmtNum(present), icon: UserCheck, variant: 'success' },
        { label: 'غائب', value: fmtNum(absent), icon: UserX, variant: 'accent' },
        { label: 'متأخر', value: fmtNum(late), icon: Clock4, variant: 'warning' },
        { label: 'نسبة الحضور %', value: `${attendanceRate}%`, icon: Clock4, variant: 'muted' },
      ]}
      loading={loading}
      error={error}
      onRetry={load}
      onRefresh={load}
    >
      <LmsFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث عن متعلم أو جلسة أو دورة…"
        activeFilterCount={activeCount}
        resultCount={filtered.length}
        totalCount={total}
        onReset={clearFilters}
        primary={
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={lmsSelectClass()}>
            <option value="">كل الحالات</option>
            <option value="present">حاضر</option>
            <option value="absent">غائب</option>
            <option value="late">متأخر</option>
            <option value="excused">معذور</option>
          </select>
        }
        secondary={
          <>
            {courseOptions.length > 1 ?
              <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={lmsSelectClass()}>
                {courseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            : null}
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={lmsSelectClass()} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={lmsSelectClass()} />
            {(late + excused) > 0 ?
              <span className="text-[11px] font-semibold text-amber-600">
                {fmtNum(late)} متأخر · {fmtNum(excused)} معذور
              </span>
            : null}
          </>
        }
      />

      {!loading && (
        filtered.length === 0 ?
          <LmsEmptyState
            icon={UserCheck}
            title="لا توجد سجلات حضور"
            description={activeCount > 0 ? 'جرّب تغيير معايير البحث.' : 'لم تُسجَّل أي سجلات حضور بعد.'}
          />
        : (
          <>
            <p className="text-right text-[12px] font-bold text-deepBlue/40">
              عرض {fmtNum(filtered.length)} من {fmtNum(total)} سجل
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r, i) => {
                const st = r.status ?? 'absent'
                const cls = statusBg[st] ?? 'bg-slate-50 text-slate-500 ring-1 ring-slate-100'
                const lbl = statusLabel[st] ?? st
                const accentTop = st === 'present' ? 'border-t-emerald-400'
                  : st === 'late' ? 'border-t-amber-400'
                  : st === 'excused' ? 'border-t-sky-400'
                  : 'border-t-rose-400'
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className={`flex flex-col gap-3 overflow-hidden rounded-2xl border border-deepBlue/[0.07] bg-white p-4 shadow-sm border-t-[3px] ${accentTop}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 text-right">
                        <p className="truncate font-black text-deepBlue">{r.user_name}</p>
                        <p className="mt-0.5 line-clamp-1 text-[12px] font-semibold text-deepBlue/50">{r.session_title}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black ${cls}`}>{lbl}</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-deepBlue/[0.05] pt-2.5 text-[11px] font-semibold text-deepBlue/50">
                      <span className="truncate max-w-[55%] rounded-full bg-customBlue/[0.07] px-2 py-0.5 text-[10px] font-black text-customBlue">
                        {r.course_title}
                      </span>
                      <span dir="ltr">{fmtDate(r.session_date)}</span>
                    </div>

                    {r.notes && (
                      <p className="line-clamp-2 rounded-xl bg-slate-50 px-3 py-2 text-right text-[11px] text-deepBlue/45">{r.notes}</p>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </>
        )
      )}
    </AdminLmsShell>
  )
}
