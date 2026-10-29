import { CheckCircle2, CircleDot, Clock, FileClock, XCircle } from 'lucide-react'
import type { MeetingDisplayStatus } from '@/types/operations'
import { DISPLAY_STATUS_META, TONE_CLASS } from './meetingsUi'

const ICON = {
  scheduled: Clock,
  in_progress: CircleDot,
  awaiting_report: FileClock,
  report_submitted: CheckCircle2,
  cancelled: XCircle,
} as const

/** The one badge a meeting wears. Plain Arabic, never the raw status value. */
export function MeetingStatusBadge({ status }: { status: MeetingDisplayStatus }) {
  const meta = DISPLAY_STATUS_META[status]
  const Icon = ICON[status]
  return (
    <span
      data-testid="meeting-status"
      title={meta.hint}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${TONE_CLASS[meta.tone]}`}
    >
      <Icon size={12} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
