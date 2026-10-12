import { Building2, CalendarDays, Clock, Eye, FileText, UserRound } from 'lucide-react'
import type { OpsMeeting } from '@/types/operations'
import { MeetingStatusBadge } from '@/components/operations/meetings/MeetingStatusBadge'
import { formatDay, meetingTypeLabel, timeRange } from '@/components/operations/meetings/meetingsUi'

type Props = {
  m: OpsMeeting
  /** Open the details panel. */
  onOpen: (id: number) => void
  /** File the meeting's report. Offered only while the server says this viewer may. */
  onUploadReport?: (id: number) => void
}

/**
 * One meeting. The report area follows the server's capabilities and never
 * invents a state:
 *  - report exists  -> "تم رفع التقرير" badge + "عرض التقرير"; NO upload button
 *  - none, may file -> "رفع التقرير"
 *  - none, may not  -> a plain hint, no button
 */
export default function MeetingCard({ m, onOpen, onUploadReport }: Props) {
  const caps = m.capabilities
  const day = formatDay(m.meeting_date)
  const time = timeRange(m)

  return (
    <li className="rounded-3xl border border-line bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-black text-accent-700">{meetingTypeLabel(m.type)}</span>
        <MeetingStatusBadge status={m.display_status} />
      </div>

      <button
        type="button"
        onClick={() => onOpen(m.id)}
        className="mt-3 block w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <h3 className="text-base font-black leading-snug text-navy">{m.title}</h3>
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-500">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={13} aria-hidden="true" />
          {day}
          {time && (
            <span dir="ltr" className="ms-1 text-muted-400">
              {time}
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Building2 size={13} aria-hidden="true" />
          {m.department?.name ?? 'غير محدّدة'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UserRound size={13} aria-hidden="true" />
          المنظِّم: {m.organizer?.name ?? 'غير معروف'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="min-w-0 text-[11px] font-bold text-muted-500">
          {m.has_report ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <FileText size={13} aria-hidden="true" />
              التقرير الرسمي متاح لإدارة الجودة
            </span>
          ) : m.display_status === 'awaiting_report' && !caps.can_upload_report ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} aria-hidden="true" />
              يرفع التقرير مسؤول الاجتماع أو قائد الإدارة
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(m.id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-xs font-black text-navy transition hover:bg-slate-50"
          >
            <Eye size={14} aria-hidden="true" />
            {m.has_report && caps.can_view_report ? 'عرض التقرير' : 'التفاصيل'}
          </button>
          {onUploadReport && !m.has_report && caps.can_upload_report && (
            <button
              type="button"
              onClick={() => onUploadReport(m.id)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-black text-white transition hover:bg-brand-600"
            >
              <FileText size={14} aria-hidden="true" />
              رفع التقرير
            </button>
          )}
        </div>
      </div>
    </li>
  )
}
