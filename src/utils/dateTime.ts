const TZ = 'Europe/Amsterdam'

function localDay(d: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = parts.find((p) => p.type === 'year')?.value ?? '0'
  const mo = parts.find((p) => p.type === 'month')?.value ?? '0'
  const dy = parts.find((p) => p.type === 'day')?.value ?? '0'
  return new Date(`${y}-${mo}-${dy}T00:00:00`).getTime()
}

function timeStr(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('ar', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    numberingSystem: 'latn',
  }).format(d)
}

/** "الاثنين، 6 يوليو 2026" — full Arabic weekday + day + month name + year, Western digits. */
function longArabicDateStr(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('ar', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(d)
}

/**
 * Canonical EMC date+time display: "الثلاثاء، 18 أغسطس 2026 — 20:46".
 * Reuse this (never a one-off Intl.DateTimeFormat call) so every page renders
 * dates identically across the platform.
 */
export function formatDateTime(
  dateStr: string | null | undefined,
  _locale = 'ar',
  timezone = TZ,
): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  try {
    return `${longArabicDateStr(date, timezone)} — ${timeStr(date, timezone)}`
  } catch {
    return dateStr.slice(0, 16)
  }
}

/**
 * Canonical EMC date-only display: "الاثنين، 6 يوليو 2026" — no time, no
 * leading-zero day, full Arabic month/weekday names. Reuse this everywhere a
 * date-only value is shown; never format dates inline with a raw
 * `Intl.DateTimeFormat` call or numeric dd/mm/yyyy.
 */
export function formatDate(
  dateStr: string | null | undefined,
  _locale = 'ar',
  timezone = TZ,
): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  try {
    return longArabicDateStr(date, timezone)
  } catch {
    return dateStr.slice(0, 10)
  }
}

/** Explicit aliases matching the platform-wide naming convention. */
export const formatArabicDate = formatDate
export const formatArabicDateTime = formatDateTime

/**
 * Human-relative Arabic date:
 * - Same calendar day  → "اليوم، 14:25"
 * - Yesterday          → "أمس، 09:10"
 * - Within 7 days      → "منذ 3 أيام"
 * - Older              → "10 يونيو 2026"
 */
export function formatRelativeDate(
  dateStr: string | null | undefined,
  timezone = TZ,
): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'

  const todayMs = localDay(new Date(), timezone)
  const dateMs = localDay(date, timezone)
  const diffDays = Math.round((todayMs - dateMs) / 86_400_000)

  if (diffDays === 0) return `اليوم، ${timeStr(date, timezone)}`
  if (diffDays === 1) return `أمس، ${timeStr(date, timezone)}`
  if (diffDays === -1) return `غداً، ${timeStr(date, timezone)}`
  if (diffDays > 1 && diffDays < 7) return `منذ ${String(diffDays)} أيام`
  if (diffDays < -1 && diffDays > -7) return `بعد ${String(Math.abs(diffDays))} أيام`
  return formatDate(dateStr, 'ar', timezone)
}

/**
 * Last-login cell: relative for recent, date-only for older.
 */
export function formatLastLogin(
  dateStr: string | null | undefined,
  timezone = TZ,
): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'

  const todayMs = localDay(new Date(), timezone)
  const dateMs = localDay(date, timezone)
  const diffDays = Math.round((todayMs - dateMs) / 86_400_000)

  if (diffDays === 0) return `اليوم، ${timeStr(date, timezone)}`
  if (diffDays === 1) return `أمس، ${timeStr(date, timezone)}`
  if (diffDays === -1) return `غداً، ${timeStr(date, timezone)}`
  if (diffDays > 1 && diffDays < 7) return `منذ ${String(diffDays)} أيام`
  if (diffDays >= 7 && diffDays < 30) return `منذ ${String(diffDays)} يوماً`
  if (diffDays < -1 && diffDays > -7) return `بعد ${String(Math.abs(diffDays))} أيام`
  return formatDate(dateStr, 'ar', timezone)
}

/**
 * Notification timestamp: short and always readable.
 * Same day → "14:25"  |  Yesterday → "أمس"  |  Older → "10 يون"
 */
export function formatNotificationDate(
  dateStr: string | null | undefined,
  timezone = TZ,
): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const todayMs = localDay(new Date(), timezone)
  const dateMs = localDay(date, timezone)
  const diffDays = Math.round((todayMs - dateMs) / 86_400_000)

  if (diffDays === 0) return timeStr(date, timezone)
  if (diffDays === 1) return 'أمس'
  if (diffDays === -1) return 'غداً'
  if (diffDays > 1 && diffDays < 7) return `منذ ${String(diffDays)} أيام`
  if (diffDays < -1 && diffDays > -7) return `بعد ${String(Math.abs(diffDays))} أيام`
  try {
    return new Intl.DateTimeFormat('ar', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      numberingSystem: 'latn',
    }).format(date)
  } catch {
    return formatDate(dateStr, 'ar', timezone)
  }
}

/**
 * "18 يونيو 2026، 23:00 - 00:30" or cross-day: "18 يونيو 2026، 23:00 - 19 يونيو 2026، 00:30"
 * Both datetimes are converted from UTC to Europe/Amsterdam for display.
 */
export function formatAmsterdamDateTimeRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  timezone = TZ,
): string {
  if (!startsAt) return '—'
  const start = new Date(startsAt)
  if (isNaN(start.getTime())) return '—'

  const startDate = formatDate(startsAt, 'ar', timezone)
  const startTime = timeStr(start, timezone)

  if (!endsAt) return `${startDate}، ${startTime}`

  const end = new Date(endsAt)
  if (isNaN(end.getTime())) return `${startDate}، ${startTime}`

  const endTime = timeStr(end, timezone)

  if (localDay(end, timezone) !== localDay(start, timezone)) {
    const endDate = formatDate(endsAt, 'ar', timezone)
    return `${startDate}، ${startTime} - ${endDate}، ${endTime}`
  }

  return `${startDate}، ${startTime} - ${endTime}`
}
