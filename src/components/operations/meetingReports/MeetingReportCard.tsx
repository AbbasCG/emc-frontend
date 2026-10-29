import { Building2, CalendarDays, ChevronLeft, UserRound, Users } from 'lucide-react'
import type { MeetingReport } from '@/api/operationsReportsApi'
import { MEETING_TYPE_AR } from '@/data/operationsLabels'
import { formatDay } from './meetingReportsUi'

/**
 * One report as a card. Cards (not a table) at every width: a table with this
 * many columns overflows on a phone, and the meaningful signal here (who/when/
 * how many attended) reads better as chips. Every field the card shows is
 * either guaranteed by the normalizer or has an explicit fallback, so a legacy
 * row with no department or author renders cleanly.
 */
export function MeetingReportCard({ report, onOpen }: { report: MeetingReport; onOpen: (id: number) => void }) {
  // Attendance recorded with the report (meeting participants), else the department report's ratings.
  const total = report.attendance?.invited ?? report.ratings_count
  const attended = Math.min(report.attendance?.attended ?? report.attended_count, total)
  const pct = total > 0 ? Math.round((attended / total) * 100) : null

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(report.id)}
        className="group flex w-full flex-col gap-4 rounded-3xl border border-line bg-white p-5 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:flex-row sm:items-center"
      >
        <span
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50 text-brand-700"
          aria-hidden="true"
        >
          <CalendarDays size={20} />
        </span>

        <span className="min-w-0 flex-1 space-y-2">
          <span className="block truncate text-base font-black text-navy">{report.title}</span>
          {report.meeting && (
            <span className="inline-flex items-center rounded-full bg-accent-50 px-2.5 py-0.5 text-[11px] font-black text-accent-800 ring-1 ring-accent-200" data-testid="report-source">
              {MEETING_TYPE_AR[report.meeting.type]}
            </span>
          )}
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} aria-hidden="true" />
              {formatDay(report.meeting_date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={13} aria-hidden="true" />
              {report.department?.name ?? 'غير محدّدة'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UserRound size={13} aria-hidden="true" />
              {report.author?.name ?? 'غير معروف'}
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-4 sm:justify-end">
          {pct !== null ? (
            <span className="min-w-[8rem]">
              <span className="flex items-center justify-between text-[11px] font-black text-muted-600">
                <span className="inline-flex items-center gap-1">
                  <Users size={12} aria-hidden="true" />
                  الحضور
                </span>
                <span className="tabular-nums" dir="ltr">{attended}/{total}</span>
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <span className="block h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
              </span>
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-muted-500">بلا سجل حضور</span>
          )}
          <span className="hidden items-center gap-1 text-xs font-black text-brand-600 transition group-hover:gap-2 sm:inline-flex">
            عرض التفاصيل
            <ChevronLeft size={14} aria-hidden="true" />
          </span>
        </span>
      </button>
    </li>
  )
}
