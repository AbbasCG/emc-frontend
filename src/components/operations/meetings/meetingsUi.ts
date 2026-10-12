import { MEETING_TYPE_AR } from '@/data/operationsLabels'
import type { MeetingDisplayStatus, MeetingType, OpsMeeting } from '@/types/operations'
import { formatDay } from '@/components/operations/meetingReports/meetingReportsUi'

export { formatDay }

/**
 * Presentation helpers shared by the admin schedule and the lounge. The badge
 * for a meeting is always one of five plain Arabic states; no raw enum value
 * (`in_progress`, `awaiting_report`, `external_partner`...) ever reaches the screen.
 */

export type StatusTone = 'neutral' | 'info' | 'live' | 'warn' | 'success' | 'muted'

export const DISPLAY_STATUS_META: Record<MeetingDisplayStatus, { label: string; tone: StatusTone; hint: string }> = {
  scheduled: { label: 'مجدول', tone: 'info', hint: 'لم يحن موعده بعد' },
  in_progress: { label: 'جارٍ الآن', tone: 'live', hint: 'الاجتماع منعقد حاليًا' },
  awaiting_report: { label: 'بانتظار رفع التقرير', tone: 'warn', hint: 'انعقد الاجتماع ولم يُرفع تقريره بعد' },
  report_submitted: { label: 'تم رفع التقرير', tone: 'success', hint: 'التقرير الرسمي متاح لإدارة الجودة' },
  cancelled: { label: 'ملغى', tone: 'muted', hint: 'لا يُرفع تقرير لاجتماع ملغى' },
}

export const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-brand-50 text-brand-700 ring-brand-200',
  live: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warn: 'bg-accent-50 text-accent-800 ring-accent-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  muted: 'bg-slate-100 text-slate-500 ring-slate-200',
}

export function meetingTypeLabel(type: MeetingType): string {
  return MEETING_TYPE_AR[type] ?? MEETING_TYPE_AR.general
}

/** "10:00" or "10:00 – 11:30", or an empty string. */
export function timeRange(m: Pick<OpsMeeting, 'start_time' | 'end_time'>): string {
  if (!m.start_time) return ''
  return m.end_time ? `${m.start_time} – ${m.end_time}` : m.start_time
}

export type MeetingFilters = {
  q: string
  type: MeetingType | ''
  department_id: number | ''
  date_from: string
  date_to: string
  report_status: '' | 'submitted' | 'pending'
}

export const EMPTY_MEETING_FILTERS: MeetingFilters = { q: '', type: '', department_id: '', date_from: '', date_to: '', report_status: '' }

export function activeMeetingFilterCount(f: MeetingFilters): number {
  return [f.q.trim() !== '', f.type !== '', f.department_id !== '', f.date_from !== '', f.date_to !== '', f.report_status !== ''].filter(Boolean).length
}
