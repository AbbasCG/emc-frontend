import { CalendarCheck2, CalendarDays, CheckCircle2, FileClock } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MeetingStats } from '@/api/meetingsApi'

function Card({ icon, label, value, tone, loading }: { icon: ReactNode; label: string; value: number; tone: string; loading: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-line bg-white p-4 shadow-sm sm:gap-4 sm:p-5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-muted-500">{label}</p>
        {loading ? (
          <span className="mt-1 block h-7 w-12 animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />
        ) : (
          <p className="text-lg font-black tabular-nums text-navy sm:text-2xl" data-testid={`kpi-${label}`}>{value}</p>
        )}
      </div>
    </div>
  )
}

/** Four counts over the meetings the viewer may read (not over the current filter). */
export function MeetingsKpis({ stats, loading }: { stats: MeetingStats | null; loading: boolean }) {
  const wait = loading && !stats
  return (
    <section aria-label="ملخص الاجتماعات" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Card icon={<CalendarCheck2 size={22} />} label="إجمالي الاجتماعات" value={stats?.total ?? 0} tone="bg-brand-50 text-brand-600" loading={wait} />
      <Card icon={<CalendarDays size={22} />} label="اجتماعات هذا الشهر" value={stats?.this_month ?? 0} tone="bg-brand-50 text-brand-600" loading={wait} />
      <Card icon={<FileClock size={22} />} label="بانتظار التقرير" value={stats?.awaiting_report ?? 0} tone="bg-accent-50 text-accent-700" loading={wait} />
      <Card icon={<CheckCircle2 size={22} />} label="تم رفع التقرير" value={stats?.with_report ?? 0} tone="bg-emerald-50 text-emerald-700" loading={wait} />
    </section>
  )
}
