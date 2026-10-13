import type { HrRequestStatus, IncomingQuery } from '@/api/hrIncomingRequestsApi'

/** Presentation only: labels, tones and formatting for the HR incoming requests workspace. */

export const STATUS_META: Record<HrRequestStatus, { label: string; badge: string }> = {
  pending: { label: 'جديد', badge: 'bg-customOrange/10 text-customOrange ring-customOrange/30' },
  in_progress: { label: 'قيد المراجعة', badge: 'bg-customBlue/10 text-customBlue ring-customBlue/25' },
  approved: { label: 'مقبول', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rejected: { label: 'مرفوض', badge: 'bg-red-50 text-red-700 ring-red-200' },
}

export const STATUS_FILTERS: { value: HrRequestStatus | ''; label: string }[] = [
  { value: '', label: 'كل الحالات' },
  { value: 'pending', label: 'جديد' },
  { value: 'in_progress', label: 'قيد المراجعة' },
  { value: 'approved', label: 'مقبول' },
  { value: 'rejected', label: 'مرفوض' },
]

export type IncomingFilterState = Required<Pick<IncomingQuery, 'q' | 'status' | 'departmentId' | 'hasDraft' | 'dateFrom' | 'dateTo'>>

export const EMPTY_FILTERS: IncomingFilterState = { q: '', status: '', departmentId: '', hasDraft: '', dateFrom: '', dateTo: '' }

/** What HR knows about a request's candidates. Matching is computed on demand, so this is per session. */
export type MatchState = 'not_searched' | 'has_candidates' | 'no_candidates' | 'draft_created'

export const MATCH_STATE_META: Record<MatchState, { label: string; badge: string }> = {
  not_searched: { label: 'لم يتم البحث', badge: 'bg-slate-100 text-slate-600' },
  has_candidates: { label: 'يوجد مرشحون محتملون', badge: 'bg-emerald-50 text-emerald-700' },
  no_candidates: { label: 'لا يوجد مرشح مناسب', badge: 'bg-amber-50 text-amber-800' },
  draft_created: { label: 'تم إنشاء مسودة فرصة', badge: 'bg-customBlue/10 text-customBlue' },
}

export const MIN_SCORE_OPTIONS: { value: number; label: string }[] = [
  { value: 45, label: 'يحتاج مراجعة فأعلى (45+)' },
  { value: 65, label: 'مناسب فأعلى (65+)' },
  { value: 85, label: 'مناسب جدًا فقط (85+)' },
  { value: 0, label: 'عرض الكل' },
]

export function scoreTone(score: number): { badge: string; bar: string } {
  if (score >= 85) return { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' }
  if (score >= 65) return { badge: 'bg-customBlue/10 text-customBlue ring-customBlue/25', bar: 'bg-customBlue' }
  if (score >= 45) return { badge: 'bg-amber-50 text-amber-800 ring-amber-200', bar: 'bg-amber-400' }
  return { badge: 'bg-slate-100 text-slate-600 ring-slate-200', bar: 'bg-slate-300' }
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

/** One entry per non-empty line; with `commas` a comma or semicolon also separates entries (for skills). */
export function linesToList(text: string, commas = false): string[] {
  return text.split(commas ? /\r?\n|[،,؛;]/ : /\r?\n/).map((x) => x.trim()).filter(Boolean)
}
export const listToLines = (list: string[]): string => list.join('\n')
