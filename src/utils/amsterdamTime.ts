// ── Shared Amsterdam timezone formatter ──────────────────────────────────────
// Canonical low-level formatter for any screen that must render the EXACT same
// wall-clock time regardless of viewer role (student/instructor/admin) — e.g.
// placement-test oral interview bookings. Backend always returns UTC-offset
// ISO 8601 strings; this module is the single place that converts them to
// Europe/Amsterdam local time for display. Do not slice ISO strings by hand
// (e.g. `iso.slice(11, 16)`) — that reads raw UTC digits and reintroduces the
// exact timezone-mismatch bug this file exists to prevent.

export const AMSTERDAM_TIME_ZONE = 'Europe/Amsterdam'

const dmyFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: AMSTERDAM_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
})
const hm24Fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: AMSTERDAM_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false,
})
const arLongFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  timeZone: AMSTERDAM_TIME_ZONE, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return isNaN(d.getTime()) ? null : d
}

/** ISO datetime → "الخميس، 16 يوليو 2026 — 14:30" (Amsterdam local, 24h). */
export function formatAmsterdamDateTime(value: string | Date | null | undefined, locale: 'ar' | 'en' = 'ar'): string {
  const d = parse(value)
  if (!d) return '—'
  if (locale === 'ar') return `${arLongFmt.format(d)} — ${hm24Fmt.format(d)}`
  return `${dmyFmt.format(d)} ${hm24Fmt.format(d)}`
}

/** ISO datetime → "الخميس، 16 يوليو 2026" (Amsterdam local date only). */
export function formatAmsterdamDate(value: string | Date | null | undefined): string {
  const d = parse(value)
  return d ? arLongFmt.format(d) : '—'
}

/** ISO datetime → "21/07/2026" (Amsterdam local, DD/MM/YYYY — matches admin/instructor date convention). */
export function formatAmsterdamDMY(value: string | Date | null | undefined): string {
  const d = parse(value)
  return d ? dmyFmt.format(d) : '—'
}

/** ISO datetime → "14:30" (Amsterdam local, 24h). */
export function formatAmsterdamTime24(value: string | Date | null | undefined): string {
  const d = parse(value)
  return d ? hm24Fmt.format(d) : ''
}

/** Two ISO datetimes → "14:30–15:00" (Amsterdam local, 24h). */
export function formatAmsterdamTimeRange(
  startValue: string | Date | null | undefined,
  endValue: string | Date | null | undefined,
): string {
  const start = formatAmsterdamTime24(startValue)
  if (!start) return '—'
  const end = formatAmsterdamTime24(endValue)
  return end ? `${start}–${end}` : start
}

/**
 * Formats an already-wall-clock "YYYY-MM-DD" date string as "DD/MM/YYYY" via
 * pure string splitting — no `Date` object, no timezone conversion.
 *
 * Use this (not `formatAmsterdamDMY`) for values like `LmsSession.date` that
 * the backend already returns as Europe/Amsterdam wall-clock values with no
 * UTC offset. Feeding a naive "2026-08-05T10:00:00" string into `new Date()`
 * has the runtime parse it as local time in whatever timezone the browser/
 * test environment happens to be in, then `Intl`'s `timeZone: 'Europe/
 * Amsterdam'` option re-converts it — a double conversion that silently
 * drifts the displayed time whenever the runtime's local zone isn't
 * Amsterdam. `formatAmsterdamDMY`/`formatAmsterdamTime24` remain correct for
 * genuine UTC-offset ISO instants (e.g. oral-assessment booking times) —
 * this pair is only for the session wall-clock fields.
 */
export function formatWallClockDMY(value: string | null | undefined): string {
  if (!value) return '—'
  const datePart = value.slice(0, 10)
  const m = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}

/** "HH:MM" (or "HH:MM:SS") wall-clock string → "HH:MM", passed through
 *  unchanged — no Date parsing, no timezone conversion. The backend already
 *  returns 24-hour wall-clock values. */
export function formatWallClockTime24(value: string | null | undefined): string {
  if (!value) return '—'
  const m = value.match(/^(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : value
}
