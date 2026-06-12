import { useEffect, useState } from 'react'
import { RefreshCw, UserCheck } from 'lucide-react'
import { DashboardSection } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton } from '@/components/lms'
import { fetchStudentAttendance } from '@/api/studentApi'
import type { StudentAttendanceRecord } from '@/types/lms'
import { formatDateTime, formatRelativeDate } from '@/utils/dateTime'

const STATUS_LABELS: Record<string, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
  excused: 'معذور',
}

function statusLabel(raw: string): string {
  const key = raw.trim().toLowerCase()
  if (STATUS_LABELS[key]) return STATUS_LABELS[key]
  if (key.includes('present') || key.includes('حاض')) return 'حاضر'
  if (key.includes('absent') || key.includes('غائ')) return 'غائب'
  if (key.includes('late') || key.includes('متأ')) return 'متأخر'
  if (key.includes('excuse') || key.includes('معذ')) return 'معذور'
  return raw.trim() || '—'
}

function sessionWhen(row: StudentAttendanceRecord): string {
  const raw = row.starts_at ?? row.date
  if (!raw) return '—'
  const rel = formatRelativeDate(raw)
  if (rel.startsWith('اليوم') || rel.startsWith('أمس') || rel.startsWith('منذ')) return rel
  return formatDateTime(raw)
}

function markedWhen(raw: string | null | undefined): string {
  if (!raw) return '—'
  return formatRelativeDate(raw)
}

export default function StudentAttendancePage() {
  const [rows, setRows] = useState<StudentAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(mode: 'initial' | 'refresh' = 'initial') {
    if (mode === 'initial') setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      setRows(await fetchStudentAttendance())
    } catch {
      setError('تعذّر تحميل سجل الحضور.')
      setRows([])
    } finally {
      if (mode === 'initial') setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load('initial')
  }, [])

  if (loading && rows.length === 0) return <LmsPageSkeleton />

  return (
    <div className="space-y-10 text-right rtl" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-[1.35rem] border border-deepBlue/[0.06] bg-white p-6 shadow-sm ring-1 ring-deepBlue/[0.04]">
        <div>
          <h1 className="text-xl font-black text-deepBlue">سجل الحضور</h1>
          <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-relaxed text-muted-700">
            سجل حضورك في الجلسات من{' '}
            <span className="font-mono text-[11px]">GET /student/attendance</span>.
          </p>
          {error ?
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-950">
              {error}
            </p>
          : null}
        </div>
        <button
          type="button"
          onClick={() => void load('refresh')}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-2xl border border-deepBlue/10 bg-deepBlue/[0.04] px-4 py-2 text-[11px] font-black text-deepBlue transition hover:bg-deepBlue/[0.07] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          تحديث
        </button>
      </header>

      <DashboardSection title="سجل الجلسات" subtitle="الدورة، الجلسة، التاريخ، الحالة، والملاحظات.">
        {rows.length === 0 ?
          <LmsEmptyState
            icon={UserCheck}
            title="لا توجد سجلات حضور بعد"
            description="عند تسجيل حضورك في الجلسات ستظهر هنا."
          />
        : <div className="overflow-x-auto rounded-2xl border border-deepBlue/[0.06] bg-white shadow-sm ring-1 ring-deepBlue/[0.04]">
            <table className="min-w-full text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/90 text-[11px] font-black text-slate-500">
                  <th className="px-4 py-3">الدورة</th>
                  <th className="px-4 py-3">الجلسة</th>
                  <th className="px-4 py-3">التاريخ والوقت</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">ملاحظات</th>
                  <th className="px-4 py-3">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="text-[12px] font-semibold text-deepBlue">
                    <td className="px-4 py-3">{row.course_title ?? '—'}</td>
                    <td className="px-4 py-3">{row.session_title}</td>
                    <td className="px-4 py-3 whitespace-nowrap" dir="ltr">
                      {sessionWhen(row)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-customBlue ring-1 ring-sky-100">
                        {statusLabel(String(row.status))}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-4 py-3 text-slate-600">{row.notes?.trim() || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500" dir="ltr">
                      {markedWhen(row.marked_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </DashboardSection>
    </div>
  )
}
