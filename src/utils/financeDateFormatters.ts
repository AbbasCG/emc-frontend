/**
 * Central finance date/time formatting for /dashboard/finance/*.
 * Visual reference: /dashboard/admin/workshop-requests
 * Date display: 04 يوليو 2026 (ar + long month + latn digits)
 * Time display: 23:45 (24h, separate line in UI via FinanceDate)
 * Date-only API values (YYYY-MM-DD) are never shifted through UTC.
 * Timestamps use Europe/Amsterdam.
 */

export const FINANCE_TZ = 'Europe/Amsterdam' as const

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/
const BIDI_MARKS = /[\u200E\u200F\u061C]/g

/** Matches workshop-requests table date cell */
export const FINANCE_DATE_VALUE_CLASS =
  'finance-date-value text-[12px] font-semibold tabular-nums text-slate-400'

/** Secondary time line under finance dates */
export const FINANCE_TIME_VALUE_CLASS =
  'finance-time-value mt-0.5 text-[10px] font-normal tabular-nums text-slate-400'

/** @deprecated Use FINANCE_DATE_VALUE_CLASS */
export const FINANCE_DATE_CLASS = 'finance-date-value'

export function isFinanceDateOnly(value: string | number | Date | null | undefined): boolean {
  if (value === null || value === undefined) return false
  if (value instanceof Date) return false
  return DATE_ONLY_RE.test(String(value).trim())
}

export function toValidDate(
  value: string | number | Date | null | undefined,
): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  const s = String(value).trim()
  if (!s) return null
  if (DATE_ONLY_RE.test(s)) return new Date(`${s}T12:00:00`)

  const date = new Date(s)
  return Number.isNaN(date.getTime()) ? null : date
}

function stripBidi(s: string): string {
  return s.replace(BIDI_MARKS, '').trim()
}

/**
 * Arabic long-month date — same pattern as WorkshopRequestDetailPage.formatDate.
 * Examples: 04 يوليو 2026
 */
export function formatFinanceDate(
  value: string | number | Date | null | undefined,
): string {
  if (!value) return '—'

  const raw = String(value).trim()
  const dateOnly = DATE_ONLY_RE.test(raw)
  const date = dateOnly ? new Date(`${raw}T12:00:00`) : toValidDate(value)
  if (!date || Number.isNaN(date.getTime())) return '—'

  try {
    return stripBidi(
      new Intl.DateTimeFormat('ar', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        numberingSystem: 'latn',
        ...(dateOnly ? {} : { timeZone: FINANCE_TZ }),
      }).format(date),
    )
  } catch {
    return '—'
  }
}

/** @deprecated Alias — use formatFinanceDate */
export function formatFinanceDateOnlyString(iso: string): string {
  return formatFinanceDate(iso)
}

/** 24-hour time HH:mm — English digits */
export function formatFinanceTime(
  value: string | number | Date | null | undefined,
): string {
  if (!value || isFinanceDateOnly(value)) return '—'

  const date = toValidDate(value)
  if (!date) return '—'

  try {
    return stripBidi(
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: FINANCE_TZ,
      }).format(date),
    )
  } catch {
    return '—'
  }
}

export function formatFinanceDateTimeParts(
  value: string | number | Date | null | undefined,
): { date: string; time: string } {
  if (!value) return { date: '—', time: '' }

  const date = formatFinanceDate(value)
  const time = isFinanceDateOnly(value) ? '' : formatFinanceTime(value)
  return { date, time: time === '—' ? '' : time }
}

/** For exports/labels — date and time separated by space (not used in UI tables) */
export function formatFinanceDateTime(
  value: string | number | Date | null | undefined,
): string {
  const { date, time } = formatFinanceDateTimeParts(value)
  if (!time) return date
  return `${date} ${time}`
}
