import { REPORTING_TIMEZONE } from './range'

/** One number format across the tabs: Latin digits, thousands separators (the platform's existing convention). */
export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Math.round(n).toLocaleString('en-US')
}

/** Signed percentage with one decimal, e.g. `+12.5%`; `0.0%` is shown without a sign. */
export function fmtPct(n: number | null | undefined, signed = false): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const sign = signed && n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

const dayMonth = new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const dayMonthYear = new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const instantDate = new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric', timeZone: REPORTING_TIMEZONE })
const instantTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: REPORTING_TIMEZONE })

/** `2026-11-10` → «10 نوفمبر» (a calendar date: no zone shift). */
export function fmtDay(date: string): string {
  return dayMonth.format(new Date(`${date}T00:00:00Z`))
}

/** `2026-11-10` → «10 نوفمبر 2026». */
export function fmtDayFull(date: string): string {
  return dayMonthYear.format(new Date(`${date}T00:00:00Z`))
}

/** An instant (ISO 8601) in the reporting zone, e.g. «10 نوفمبر 2026 · 14:30». Date and time are formatted apart so bidi cannot reorder them. */
export function fmtInstant(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : `${instantDate.format(d)} · ${instantTime.format(d)}`
}

/** «من 10 نوفمبر إلى 16 نوفمبر 2026» or a single day. */
export function fmtPeriod(from: string, to: string): string {
  return from === to ? fmtDayFull(from) : `من ${fmtDay(from)} إلى ${fmtDayFull(to)}`
}
