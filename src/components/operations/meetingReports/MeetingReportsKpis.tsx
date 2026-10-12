import { CalendarDays, Clock, FileText, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MeetingReportsStats } from '@/api/operationsReportsApi'
import { formatDay } from './meetingReportsUi'

/**
 * Four headline figures. Each one is computed by the server over the reports
 * the viewer may read (not over the current filter), and shows an em dash
 * rather than a misleading 0 while loading or when the data cannot support it
 * (no attendance recorded yet, no report filed yet).
 */

function Card({ icon, label, value, hint, loading }: { icon: ReactNode; label: string; value: string; hint?: string; loading: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-line bg-white p-4 shadow-sm sm:gap-4 sm:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 sm:h-12 sm:w-12" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-muted-500">{label}</p>
        {loading ? (
          <span className="mt-1 block h-7 w-16 animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />
        ) : (
          <p className="break-words text-lg font-black leading-tight tabular-nums text-navy sm:text-2xl" data-testid={`kpi-${label}`}>{value}</p>
        )}
        {hint && !loading && <p className="truncate text-[11px] font-semibold text-muted-400">{hint}</p>}
      </div>
    </div>
  )
}

export function MeetingReportsKpis({ stats, loading }: { stats: MeetingReportsStats | null; loading: boolean }) {
  const showLoading = loading && !stats
  return (
    <section aria-label="ملخص التقارير" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Card icon={<FileText size={22} />} label="إجمالي التقارير" value={String(stats?.total ?? 0)} loading={showLoading} />
      <Card icon={<CalendarDays size={22} />} label="تقارير هذا الشهر" value={String(stats?.this_month ?? 0)} loading={showLoading} />
      <Card
        icon={<Users size={22} />}
        label="نسبة الحضور"
        value={stats?.attendance_rate != null ? `${stats.attendance_rate}%` : '—'}
        hint={stats?.attendance_rate == null ? 'لم يُسجَّل حضور بعد' : 'من التقارير المسجَّلة'}
        loading={showLoading}
      />
      <Card
        icon={<Clock size={22} />}
        label="آخر تقرير"
        value={stats?.latest_at ? formatDay(stats.latest_at) : '—'}
        hint={stats?.latest_at ? undefined : 'لا تقارير بعد'}
        loading={showLoading}
      />
    </section>
  )
}
