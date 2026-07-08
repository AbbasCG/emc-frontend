// ── Shared timezone & locale constants ───────────────────────────────────────
// ar-EG-u-nu-latn  → Arabic month/weekday names, Latin (English) digits
// Europe/Amsterdam → canonical platform timezone

const TZ = 'Europe/Amsterdam'

const arDate = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ,
})
const arDateWithWeekday = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ,
})
const arDateShort = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  month: 'short', day: 'numeric', timeZone: TZ,
})
const en24h = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
})

// ── Internal: parse "YYYY-MM-DD" strings safely (avoids UTC-midnight shift) ──
function parseSafe(raw: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw)
}

// ── Primitive formatters ──────────────────────────────────────────────────────

/** ISO date/datetime → "10 يوليو 2026" */
export function fmtDate(raw: string | null | undefined): string {
  if (!raw) return '—'
  try { return arDate.format(parseSafe(raw)) } catch { return raw }
}

/** ISO datetime → "10 يوليو 2026، 19:00" — 24h, English digits, no AM/PM */
export function fmtDateTime(raw: string | null | undefined): string {
  if (!raw) return '—'
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return raw
    return `${arDate.format(d)}، ${en24h.format(d)}`
  } catch { return raw ?? '—' }
}

/** "HH:MM" or "HH:MM:SS" string → 24h display: "09:00" */
export function formatLmsTime(rawTime: string | null | undefined): string {
  if (!rawTime) return '—'
  try {
    const parts = rawTime.split(':')
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1] ?? '0', 10)
    if (isNaN(h) || isNaN(m)) return rawTime
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  } catch { return rawTime ?? '—' }
}

/** ISO date → "10 يوليو 2026" (alias for fmtDate) */
export const formatLmsDate = fmtDate

/** ISO datetime → "10 يوليو 2026، 19:00" — canonical student date+time */
export function formatLmsDateTime(raw: string | null | undefined): string {
  if (!raw) return '—'
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return raw
    return `${arDate.format(d)}، ${en24h.format(d)}`
  } catch { return raw ?? '—' }
}

// ── Canonical student formatters (use these everywhere in the student area) ──

/**
 * Canonical student date+time formatter.
 * Output: "9 يوليو 2026، 12:00"  (date، 24h time — English digits, Arabic month)
 */
export const formatStudentDateTime = formatLmsDateTime

/**
 * Canonical student date-only formatter.
 * Output: "9 يوليو 2026"
 */
export const formatStudentDate = fmtDate

/**
 * Date with weekday — for booking calendars and scheduling UIs.
 * Output: "الأربعاء، 9 يوليو 2026"
 */
export function formatStudentDateWithWeekday(raw: string | null | undefined): string {
  if (!raw) return '—'
  try { return arDateWithWeekday.format(parseSafe(raw)) } catch { return raw ?? '—' }
}

/**
 * Compact date for tabs and narrow UI — "9 يول"
 */
export function formatStudentDateShort(raw: string | null | undefined): string {
  if (!raw) return '—'
  try { return arDateShort.format(parseSafe(raw)) } catch { return raw ?? '—' }
}

/**
 * Extracts just the time portion from an ISO datetime string.
 * Output: "18:00"  (24h, English digits)
 */
export function formatStudentTimeFromIso(raw: string | null | undefined): string {
  if (!raw) return '—'
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return '—'
    return en24h.format(d)
  } catch { return '—' }
}

/**
 * Date + time range. Same-day: "9 يوليو 2026، 18:00 - 20:00"
 * Cross-day: "9 يوليو 2026، 23:00 - 10 يوليو 2026، 01:00"
 */
export function formatStudentDateTimeRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): string {
  if (!startsAt) return '—'
  try {
    const start = new Date(startsAt)
    if (isNaN(start.getTime())) return '—'
    const datePart  = arDate.format(start)
    const startTime = en24h.format(start)
    if (!endsAt) return `${datePart}، ${startTime}`
    const end = new Date(endsAt)
    if (isNaN(end.getTime())) return `${datePart}، ${startTime}`
    const endTime = en24h.format(end)
    const dayFmt = new Intl.DateTimeFormat('en', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    if (dayFmt.format(start) === dayFmt.format(end)) {
      return `${datePart}، ${startTime} - ${endTime}`
    }
    return `${datePart}، ${startTime} - ${arDate.format(end)}، ${endTime}`
  } catch { return startsAt ?? '—' }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function fmtNum(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}

export function normCourseTitle(raw: string | null | undefined): string {
  return raw?.trim() || 'دورة غير مرتبطة'
}

export function normInstructor(raw: string | null | undefined): string {
  return raw?.trim() || 'بدون مدرب'
}

export function normStatus(raw: string | null | undefined): string {
  if (!raw) return '—'
  const map: Record<string, string> = {
    scheduled:          'قادمة',
    live:               'مباشرة',
    completed:          'مكتملة',
    cancelled:          'ملغاة',
    active:             'نشط',
    archived:           'أرشيف',
    pending:            'معلّق',
    submitted:          'مُسلَّم',
    graded:             'مُقيَّم',
    present:            'حاضر',
    absent:             'غائب',
    late:               'متأخر',
    excused:            'معذور',
    in_progress:        'جارٍ',
    not_started:        'لم يبدأ',
  }
  return map[raw] ?? raw
}
