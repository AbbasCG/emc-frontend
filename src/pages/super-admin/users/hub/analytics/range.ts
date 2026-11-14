/**
 * The reporting window of the analytics tabs.
 *
 * Days are calendar days in the REPORTING zone (the backend's `users-analytics.timezone`, Europe/Amsterdam), not the
 * browser's: «اليوم» must be the same day for everyone who opens the page. Everything here works on `YYYY-MM-DD` strings;
 * the server validates and converts them.
 */

export const REPORTING_TIMEZONE = 'Europe/Amsterdam'
/** Mirrors config('users-analytics.max_range_days'). */
export const MAX_RANGE_DAYS = 366

export type RangePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom'

export const RANGE_PRESETS: ReadonlyArray<{ id: RangePreset; labelAr: string }> = [
  { id: 'today', labelAr: 'اليوم' },
  { id: 'yesterday', labelAr: 'أمس' },
  { id: '7d', labelAr: 'آخر 7 أيام' },
  { id: '30d', labelAr: 'آخر 30 يومًا' },
  { id: '90d', labelAr: 'آخر 90 يومًا' },
  { id: 'custom', labelAr: 'فترة مخصصة' },
]

export const DEFAULT_PRESET: RangePreset = '30d'

export interface ResolvedRange {
  preset: RangePreset
  from: string
  to: string
  days: number
}

/** Today's date in the reporting zone, `YYYY-MM-DD`. */
export function todayInReportingZone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORTING_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

const DAY_MS = 86_400_000

function toUtcMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** `date` shifted by whole calendar days (pure date arithmetic, no zone, so DST cannot skew it). */
export function addDays(date: string, delta: number): string {
  return new Date(toUtcMs(date) + delta * DAY_MS).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS) + 1
}

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return new Date(toUtcMs(value)).toISOString().slice(0, 10) === value
}

export type RangeError = 'format' | 'order' | 'future' | 'too_long'

export const RANGE_ERROR_AR: Record<RangeError, string> = {
  format: 'أدخل تاريخًا صحيحًا.',
  order: 'يجب ألا يكون تاريخ البداية بعد تاريخ النهاية.',
  future: 'لا يمكن أن تنتهي الفترة في المستقبل.',
  too_long: `أطول فترة مسموحة ${MAX_RANGE_DAYS} يومًا.`,
}

/** The same rules the server enforces, so a bad custom range is explained before a request is made. */
export function validateRange(from: string, to: string, today: string): RangeError | null {
  if (!isIsoDate(from) || !isIsoDate(to)) return 'format'
  if (from > to) return 'order'
  if (to > today) return 'future'
  if (daysBetween(from, to) > MAX_RANGE_DAYS) return 'too_long'
  return null
}

export function presetRange(preset: Exclude<RangePreset, 'custom'>, today: string): ResolvedRange {
  switch (preset) {
    case 'today':
      return { preset, from: today, to: today, days: 1 }
    case 'yesterday': {
      const y = addDays(today, -1)
      return { preset, from: y, to: y, days: 1 }
    }
    case '7d':
      return { preset, from: addDays(today, -6), to: today, days: 7 }
    case '30d':
      return { preset, from: addDays(today, -29), to: today, days: 30 }
    case '90d':
      return { preset, from: addDays(today, -89), to: today, days: 90 }
  }
}

/**
 * Reads `?range=&from=&to=` from the URL. An unknown preset or an invalid custom range falls back to the default window
 * (the URL is user input).
 */
export function rangeFromParams(
  preset: string | null,
  from: string | null,
  to: string | null,
  today: string,
): ResolvedRange {
  if (preset === 'custom' && from && to && validateRange(from, to, today) === null) {
    return { preset: 'custom', from, to, days: daysBetween(from, to) }
  }
  const known = RANGE_PRESETS.find((p) => p.id === preset && p.id !== 'custom')
  return presetRange((known?.id as Exclude<RangePreset, 'custom'> | undefined) ?? (DEFAULT_PRESET as '30d'), today)
}
