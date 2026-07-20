import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, Clock, RefreshCw, UserCheck, XCircle } from 'lucide-react'
import { LmsEmptyState, LmsPageSkeleton } from '@/components/lms'
import { fetchStudentAttendance, fetchStudentAttendanceSummary, type StudentAttendanceSummary } from '@/api/studentApi'
import type { StudentAttendanceRecord } from '@/types/lms'
import { formatLmsDateTime } from '@/components/lms/lmsFormatters'
import { StudentBackButton } from '@/components/shared/StudentBackButton'

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  present: 'حاضر',
  absent:  'غائب',
  late:    'متأخر',
  excused: 'معذور',
}

function statusLabel(raw: string): string {
  const key = raw.trim().toLowerCase()
  if (STATUS_LABELS[key]) return STATUS_LABELS[key]
  if (key.includes('present') || key.includes('حاض')) return 'حاضر'
  if (key.includes('absent')  || key.includes('غائ')) return 'غائب'
  if (key.includes('late')    || key.includes('متأ')) return 'متأخر'
  if (key.includes('excuse')  || key.includes('معذ')) return 'معذور'
  return raw.trim() || '—'
}

function statusColors(raw: string): string {
  const s = statusLabel(raw)
  if (s === 'حاضر')  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (s === 'غائب')  return 'bg-red-50 text-red-700 border-red-200'
  if (s === 'متأخر') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (s === 'معذور') return 'bg-blue-50 text-blue-700 border-blue-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

function statusIcon(raw: string) {
  const s = statusLabel(raw)
  if (s === 'حاضر')  return <CheckCircle2 className="h-3 w-3" />
  if (s === 'غائب')  return <XCircle className="h-3 w-3" />
  if (s === 'متأخر') return <Clock className="h-3 w-3" />
  return <UserCheck className="h-3 w-3" />
}

function sessionWhen(row: StudentAttendanceRecord): string {
  const raw = row.starts_at ?? row.date
  if (!raw) return '—'
  return formatLmsDateTime(raw)
}

// ── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  colorClass,
}: {
  label: string
  value: string | number
  colorClass: string
}) {
  return (
    <div className={`rounded-2xl border p-4 ${colorClass}`}>
      <p className="text-[11px] font-black uppercase tracking-wide opacity-60">{label}</p>
      <p className="mt-1.5 text-2xl font-black tabular-nums leading-none">{value}</p>
    </div>
  )
}

// ── Attendance Card ─────────────────────────────────────────────────────────

function AttendanceCard({ row }: { row: StudentAttendanceRecord }) {
  const when = sessionWhen(row)
  const sl   = statusLabel(String(row.status))
  const sc   = statusColors(String(row.status))

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[#22334A]/[0.07] bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${sc}`}>
          {statusIcon(String(row.status))}
          {sl}
        </span>
        {row.course_title && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#2691C2]/20 bg-[#2691C2]/[0.06] px-2.5 py-1 text-[11px] font-bold text-[#1a6fa0]">
            <BookOpen className="h-3 w-3" />
            {row.course_title}
          </span>
        )}
      </div>

      <h3 className="text-[14px] font-black leading-snug text-[#0F172A]">{row.session_title}</h3>

      {when !== '—' && (
        <div className="flex items-center gap-2 rounded-xl border border-[#22334A]/[0.07] bg-slate-50/70 px-3 py-2">
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#22334A]/40" />
          <p className="text-[12px] font-bold tabular-nums text-[#22334A]">{when}</p>
        </div>
      )}

      {row.notes?.trim() && (
        <p className="rounded-xl border border-[#22334A]/[0.06] bg-slate-50/50 px-3 py-2 text-[12px] font-medium leading-relaxed text-[#0F172A]/70">
          {row.notes}
        </p>
      )}
    </article>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function StudentAttendancePage() {
  const [rows, setRows]         = useState<StudentAttendanceRecord[]>([])
  const [summary, setSummary]   = useState<StudentAttendanceSummary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function load(mode: 'initial' | 'refresh' = 'initial') {
    if (mode === 'initial') setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const [attendance, statsSummary] = await Promise.all([
        fetchStudentAttendance(),
        fetchStudentAttendanceSummary(),
      ])
      setRows(attendance)
      setSummary(statsSummary)
    } catch {
      setError('تعذّر تحميل سجل الحضور.')
      setRows([])
    } finally {
      if (mode === 'initial') setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void load('initial') }, [])

  const stats = useMemo(() => {
    const present = rows.filter((r) => statusLabel(String(r.status)) === 'حاضر').length
    const absent  = rows.filter((r) => statusLabel(String(r.status)) === 'غائب').length
    const late    = rows.filter((r) => statusLabel(String(r.status)) === 'متأخر').length
    const total   = rows.length
    const pct     = total > 0 ? Math.round(((present + late) / total) * 100) : null
    return { present, absent, late, total, pct }
  }, [rows])

  if (loading && rows.length === 0) return <LmsPageSkeleton />

  return (
    <div className="space-y-6 pb-10 text-right" dir="rtl">

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-[#22334A]/[0.06] bg-gradient-to-bl from-white/95 to-[#2691C2]/[0.03] p-6 shadow-sm ring-1 ring-[#22334A]/[0.04]">
        <div>
          <h1 className="text-2xl font-black text-[#22334A]">سجل الحضور</h1>
          <p className="mt-1.5 text-[13px] font-semibold text-[#22334A]/55">
            متابعة حضورك في جميع جلسات دوراتك المسجّلة
          </p>
          {error && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-950">
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load('refresh')}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#22334A]/10 bg-[#22334A]/[0.04] px-4 py-2 text-[11px] font-black text-[#22334A] transition hover:bg-[#22334A]/[0.07] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          {refreshing ? 'جارٍ التحديث…' : 'تحديث'}
        </button>
      </header>

      <StudentBackButton fallback="/dashboard/student" label="العودة إلى لوحة الطالب" />

      {/* Stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="إجمالي الجلسات" value={stats.total} colorClass="border-[#22334A]/[0.07] bg-white text-[#22334A]" />
          <StatCard label="حاضر" value={stats.present} colorClass="border-emerald-200/70 bg-emerald-50/60 text-emerald-700" />
          <StatCard label="غائب" value={stats.absent} colorClass="border-red-200/70 bg-red-50/60 text-red-700" />
          <StatCard
            label="نسبة الحضور"
            value={stats.pct != null ? `${stats.pct}%` : '—'}
            colorClass={
              stats.pct == null ? 'border-slate-200 bg-slate-50 text-slate-500'
              : stats.pct >= 80 ? 'border-emerald-200/70 bg-emerald-50/60 text-emerald-700'
              : stats.pct >= 60 ? 'border-amber-200/70 bg-amber-50/60 text-amber-700'
              : 'border-red-200/70 bg-red-50/60 text-red-700'
            }
          />
        </div>
      )}

      {/* Streaks + risk level — backend-computed by AttendanceStatisticsService, never recalculated here. */}
      {summary && summary.total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="تتابع حضور حالي" value={summary.current_attendance_streak} colorClass="border-emerald-200/70 bg-emerald-50/60 text-emerald-700" />
          <StatCard label="تتابع غياب حالي" value={summary.current_absence_streak} colorClass="border-red-200/70 bg-red-50/60 text-red-700" />
          <StatCard label="أطول تتابع حضور" value={summary.longest_attendance_streak} colorClass="border-[#22334A]/[0.07] bg-white text-[#22334A]" />
          <StatCard
            label="مستوى الخطر"
            value={summary.risk_level === 'high' ? 'مرتفع' : summary.risk_level === 'medium' ? 'متوسط' : 'منخفض'}
            colorClass={
              summary.risk_level === 'high' ? 'border-red-200/70 bg-red-50/60 text-red-700'
              : summary.risk_level === 'medium' ? 'border-amber-200/70 bg-amber-50/60 text-amber-700'
              : 'border-emerald-200/70 bg-emerald-50/60 text-emerald-700'
            }
          />
        </div>
      )}

      {/* Cards */}
      {rows.length === 0 ? (
        <div className="rounded-3xl bg-white/80 ring-1 ring-[#22334A]/[0.06]">
          <LmsEmptyState
            icon={UserCheck}
            title="لا توجد سجلات حضور بعد"
            description="عند تسجيل حضورك في الجلسات ستظهر هنا."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <AttendanceCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  )
}
