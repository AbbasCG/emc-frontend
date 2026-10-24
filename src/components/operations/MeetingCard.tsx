import { Building2, CalendarDays, Clock, Eye, FileText, Loader2, UserCheck, UserRound, UsersRound, Video } from 'lucide-react'
import type { OpsMeeting } from '@/types/operations'
import { MeetingStatusBadge } from '@/components/operations/meetings/MeetingStatusBadge'
import { formatMeetingWhen, meetingTypeLabel } from '@/components/operations/meetings/meetingsUi'

type Props = {
  m: OpsMeeting
  /** Open the details panel. */
  onOpen: (id: number) => void
  /** File the meeting's report. Offered only while the server says this viewer may. */
  onUploadReport?: (id: number) => void
  /** Record that the viewer joined (and open the link). Offered only while the server says they may. */
  onJoin?: (id: number) => void
  /** Record that the viewer attended (no link, or in person). */
  onConfirm?: (id: number) => void
  /** The meeting this card is currently joining, to disable its buttons. */
  busyId?: number | null
}

const AUDIENCE_LABEL = {
  explicit: 'مدعوّون بأسمائهم',
  department: 'كل أعضاء الإدارة',
  general: 'اجتماع عام',
} as const

/**
 * One meeting. The actions follow the server's capabilities and never invent a state:
 *  - may join            -> "انضمام" (opens the link and records it) or "تأكيد الحضور"
 *  - report exists       -> "تم رفع التقرير" badge; "عرض التقرير" only for who may read it
 *  - none, may file      -> "رفع التقرير"
 *  - none, may not       -> a plain hint, no button
 */
export default function MeetingCard({ m, onOpen, onUploadReport, onJoin, onConfirm, busyId = null }: Props) {
  const caps = m.capabilities
  const busy = busyId === m.id
  const joined = m.my_attendance !== null && m.my_attendance.status !== 'invited'
  const showJoin = caps.can_join && m.display_status !== 'cancelled' && m.display_status !== 'report_submitted'

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
        <span className="inline-flex items-center gap-1.5" data-testid="meeting-when">
          <CalendarDays size={13} aria-hidden="true" />
          {formatMeetingWhen(m)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Building2 size={13} aria-hidden="true" />
          {m.department?.name ?? 'غير محدّدة'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UserRound size={13} aria-hidden="true" />
          المنظِّم: {m.organizer?.name ?? 'غير معروف'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UsersRound size={13} aria-hidden="true" />
          {AUDIENCE_LABEL[m.audience]}
          {m.participants_count !== null && m.audience === 'explicit' ? ` (${m.participants_count})` : ''}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="min-w-0 text-[11px] font-bold text-muted-500">
          {joined ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700" data-testid="my-attendance">
              <UserCheck size={13} aria-hidden="true" />
              {m.my_attendance?.confirmed_at ? 'أكّدت حضورك' : 'سُجّل انضمامك'}
            </span>
          ) : m.has_report ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <FileText size={13} aria-hidden="true" />
              تم رفع التقرير الرسمي
            </span>
          ) : m.display_status === 'awaiting_report' && !caps.can_upload_report ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} aria-hidden="true" />
              يرفع التقرير مسؤول الاجتماع أو قائد الإدارة
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(m.id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-xs font-black text-navy transition hover:bg-slate-50"
          >
            <Eye size={14} aria-hidden="true" />
            {m.has_report && caps.can_view_report ? 'عرض التقرير' : 'التفاصيل'}
          </button>

          {showJoin && m.meeting_url && onJoin && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onJoin(m.id)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Video size={14} aria-hidden="true" />}
              انضمام
            </button>
          )}
          {showJoin && !m.meeting_url && caps.can_confirm_attendance && onConfirm && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onConfirm(m.id)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <UserCheck size={14} aria-hidden="true" />}
              تأكيد الحضور
            </button>
          )}

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
