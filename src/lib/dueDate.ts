import { formatDateTime } from '@/components/tickets/ops/ticketOpsUi'

/**
 * Due dates as the server really sends them:
 *  - a task's `due_date` is a DATE cast: `2026-11-30T00:00:00.000000Z` (midnight UTC, no time of day);
 *  - `due_datetime` / a ticket's `expected_resolution_time` are real instants in UTC.
 * A date with no time of day is due at the END of that day in the viewer's own calendar, so it is held as the plain
 * `YYYY-MM-DD` and never read as midnight UTC (which would call it overdue the evening before, or shift the day).
 */

const MIDNIGHT_UTC = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?(?:Z|\+00:00)$/
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** `2026-11-30T00:00:00.000000Z` -> `2026-11-30`; anything else unchanged. */
export function normalizeDateOnly(raw: string | null | undefined): string | null {
  if (!raw) return null
  const m = MIDNIGHT_UTC.exec(raw)

  return m ? m[1] : raw
}

export const isDateOnly = (raw: string): boolean => DATE_ONLY.test(normalizeDateOnly(raw) ?? '')

/** The moment the work falls due, in ms: the end of the LOCAL day for a date-only value. */
export function dueMs(raw: string | null | undefined): number | null {
  const v = normalizeDateOnly(raw)
  if (!v) return null
  const ms = Date.parse(DATE_ONLY.test(v) ? `${v}T23:59:59` : v)

  return Number.isFinite(ms) ? ms : null
}

const DAY = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { dateStyle: 'medium' })

/** A due value for display, in the viewer's calendar: the day alone for a date-only value, else date and time. */
export function formatDue(raw: string | null | undefined): string {
  const v = normalizeDateOnly(raw)
  if (!v) return '—'
  if (DATE_ONLY.test(v)) {
    const [y, m, d] = v.split('-').map(Number)

    return DAY.format(new Date(y, m - 1, d))
  }

  return formatDateTime(v)
}
