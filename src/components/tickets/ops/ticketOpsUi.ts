import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from '@/types/ticket'

/**
 * Presentation only: labels, tones and formatting for the ticket work queue. No rule about what a
 * user may do lives here; permissions come from the server's `capabilities`.
 */

export const CLOSED_STATUSES: TicketStatus[] = ['RESOLVED', 'REJECTED_BY_ADMIN', 'UNRESOLVED']
export const isClosed = (status: string): boolean => (CLOSED_STATUSES as string[]).includes(status)

export const STATUS_META: Record<TicketStatus, { label: string; short: string; badge: string; dot: string; column: string }> = {
  PENDING_APPROVAL: { label: 'بانتظار الاعتماد', short: 'بانتظار الاعتماد', badge: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500', column: 'border-amber-300' },
  ASSIGNED: { label: 'معتمدة ومحالة', short: 'محالة', badge: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500', column: 'border-sky-300' },
  IN_PROGRESS: { label: 'قيد المعالجة', short: 'قيد المعالجة', badge: 'bg-violet-50 text-violet-800 ring-violet-200', dot: 'bg-violet-500', column: 'border-violet-300' },
  RESOLVED: { label: 'تم الحل', short: 'تم الحل', badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500', column: 'border-emerald-300' },
  UNRESOLVED: { label: 'تعذر الحل', short: 'تعذر الحل', badge: 'bg-orange-50 text-orange-800 ring-orange-200', dot: 'bg-orange-500', column: 'border-orange-300' },
  REJECTED_BY_ADMIN: { label: 'مرفوضة إداريًا', short: 'مرفوضة', badge: 'bg-rose-50 text-rose-800 ring-rose-200', dot: 'bg-rose-500', column: 'border-rose-300' },
  REJECTED_BY_ASSIGNEE: { label: 'اعتذر المكلف', short: 'اعتذر المكلف', badge: 'bg-slate-100 text-slate-700 ring-slate-300', dot: 'bg-slate-500', column: 'border-slate-300' },
}

export const PRIORITY_META: Record<TicketPriority, { label: string; badge: string; bar: string; rank: number }> = {
  LOW: { label: 'منخفضة', badge: 'bg-slate-100 text-slate-700 ring-slate-200', bar: 'bg-slate-300', rank: 1 },
  MEDIUM: { label: 'متوسطة', badge: 'bg-sky-50 text-sky-800 ring-sky-200', bar: 'bg-sky-400', rank: 2 },
  HIGH: { label: 'عالية', badge: 'bg-amber-50 text-amber-800 ring-amber-300', bar: 'bg-amber-500', rank: 3 },
  CRITICAL: { label: 'حرجة', badge: 'bg-rose-50 text-rose-800 ring-rose-300', bar: 'bg-rose-500', rank: 4 },
}

export const CATEGORY_META: Record<TicketCategory, { label: string; badge: string }> = {
  OLD_ISSUE: { label: 'مشكلة', badge: 'bg-amber-50 text-amber-800 ring-amber-200' },
  NEW_SUGGESTION: { label: 'مقترح', badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
}

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(Object.entries(STATUS_META).map(([k, v]) => [k, v.label]))
export const PRIORITY_LABELS: Record<string, string> = Object.fromEntries(Object.entries(PRIORITY_META).map(([k, v]) => [k, v.label]))
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(Object.entries(CATEGORY_META).map(([k, v]) => [k, v.label]))

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'created_at', label: 'تاريخ الإنشاء' },
  { value: 'last_activity', label: 'آخر نشاط' },
  { value: 'updated_at', label: 'آخر تحديث' },
  { value: 'priority', label: 'الأولوية' },
  { value: 'due', label: 'الموعد المتوقع' },
  { value: 'status', label: 'الحالة' },
  { value: 'title', label: 'العنوان' },
  { value: 'ticket_number', label: 'رقم التذكرة' },
]

export const SEVERITY_META: Record<string, { badge: string; bar: string }> = {
  critical: { badge: 'bg-rose-50 text-rose-800 ring-rose-300', bar: 'bg-rose-500' },
  high: { badge: 'bg-amber-50 text-amber-800 ring-amber-300', bar: 'bg-amber-500' },
  medium: { badge: 'bg-sky-50 text-sky-800 ring-sky-200', bar: 'bg-sky-400' },
  low: { badge: 'bg-slate-100 text-slate-700 ring-slate-200', bar: 'bg-slate-300' },
  info: { badge: 'bg-slate-100 text-slate-600 ring-slate-200', bar: 'bg-slate-300' },
}

/**
 * What each activity-log action means to a reader. The names are the ones the backend writes
 * (TicketController, TicketActions); an unknown future action still renders, with its raw code,
 * rather than being dropped.
 */
export const TIMELINE_META: Record<string, { label: string; tone: 'info' | 'good' | 'bad' | 'warn' | 'note' }> = {
  SUBMITTED: { label: 'أُنشئت التذكرة', tone: 'info' },
  APPROVED_AND_ASSIGNED: { label: 'اعتُمدت وأُحيلت', tone: 'good' },
  REJECTED_BY_ADMIN: { label: 'رُفضت من الإدارة', tone: 'bad' },
  ACCEPTED_BY_ASSIGNEE: { label: 'قَبِل المكلف التكليف', tone: 'good' },
  REJECTED_BY_ASSIGNEE: { label: 'اعتذر المكلف', tone: 'warn' },
  REASSIGNED: { label: 'أُعيد التوجيه', tone: 'info' },
  RESOLVED: { label: 'تم الحل', tone: 'good' },
  MARKED_UNRESOLVED: { label: 'تعذر الحل', tone: 'warn' },
  PRIORITY_CHANGED: { label: 'تغيّرت الأولوية', tone: 'info' },
  COMMENT: { label: 'تعقيب', tone: 'note' },
  INTERNAL_NOTE: { label: 'ملاحظة داخلية', tone: 'note' },
}

const LOCALE = 'ar-SA-u-ca-gregory-nu-latn'

export function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—'
  const t = Date.parse(raw)

  return Number.isFinite(t) ? new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' }).format(new Date(t)) : '—'
}

export function formatDateTime(raw: string | null | undefined): string {
  if (!raw) return '—'
  const t = Date.parse(raw)

  return Number.isFinite(t) ? new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(t)) : '—'
}

/** "منذ 3 ساعات" style age, in whole units; empty when the date is missing or in the future. */
export function ageText(raw: string | null | undefined, now: number = Date.now()): string {
  const t = raw ? Date.parse(raw) : NaN
  if (!Number.isFinite(t) || t > now) return ''
  const minutes = Math.floor((now - t) / 60000)
  if (minutes < 1) return 'الآن'
  if (minutes < 60) return `منذ ${minutes} د`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `منذ ${hours} س`

  return `منذ ${Math.floor(hours / 24)} يوم`
}

/** Hours as a short Arabic duration: "45 دقيقة", "3.5 ساعة", "2 يوم". */
export function formatHours(h: number | null): string {
  if (h === null) return '—'
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} دقيقة`
  if (h < 48) return `${Number.isInteger(h) ? h : h.toFixed(1)} ساعة`

  return `${(h / 24).toFixed(h % 24 === 0 ? 0 : 1)} يوم`
}

export type DeadlineState = 'overdue' | 'soon' | 'ok' | 'none' | 'closed'

/**
 * The deadline reading for a row. `is_delayed` is the server's (Ticket::getIsDelayedAttribute); the
 * "soon" and "ok" split is a display choice about the same recorded deadline, not a second rule.
 */
export function deadlineState(t: Pick<Ticket, 'status' | 'expected_resolution_time' | 'is_delayed'>, now: number = Date.now()): DeadlineState {
  if (isClosed(t.status)) return 'closed'
  if (!t.expected_resolution_time) return 'none'
  if (t.is_delayed) return 'overdue'
  const at = Date.parse(t.expected_resolution_time)
  if (!Number.isFinite(at)) return 'none'

  return at - now <= 24 * 3600 * 1000 ? 'soon' : 'ok'
}

export const DEADLINE_TONE: Record<DeadlineState, string> = {
  overdue: 'text-rose-700',
  soon: 'text-amber-700',
  ok: 'text-deepBlue/70',
  none: 'text-deepBlue/40',
  closed: 'text-deepBlue/50',
}
