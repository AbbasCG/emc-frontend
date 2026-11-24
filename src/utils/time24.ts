/**
 * ONE formatter for the time of day on the ticket pages and on both work boards: 24-hour `HH:mm` («22:28», never «10:28 م»).
 *
 * DISPLAY ONLY. It reads an ISO string / epoch / Date and returns text; nothing stored or sent to the server is changed.
 *
 * Rules that matter:
 *  - `hourCycle: 'h23'` (not `hour12: false`): some locales answer `hour12: false` with the h24 cycle and print midnight as
 *    «24:05». h23 is 00-23, so midnight is «00:05».
 *  - The time zone is the CALLER's: no `timeZone` means the viewer's own zone (what the ticket pages have always shown);
 *    a page that is pinned to a zone (Europe/Amsterdam) passes it. This file never picks a zone by itself.
 *  - The numerals are the caller's too: the default locale prints Latin digits (what the ticket pages and boards show today);
 *    a page that has always printed Arabic-Indic digits passes its own locale.
 *  - An unusable value (empty, unparsable) is «—», never «Invalid Date» or a crash.
 */

/** Gregorian calendar, Latin digits: the locale the ticket and board pages already use. */
export const TIME24_LOCALE = 'ar-SA-u-ca-gregory-nu-latn'

export type TimeInput = string | number | Date | null | undefined

export interface Time24Options {
  /** IANA zone; omitted = the viewer's own zone. */
  timeZone?: string
  /** BCP-47 locale; controls the digits and the date words. */
  locale?: string
}

const EMPTY = '—'

const cache = new Map<string, Intl.DateTimeFormat>()

function formatter(kind: string, locale: string, timeZone: string | undefined, build: () => Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${kind}|${locale}|${timeZone ?? ''}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { ...build(), ...(timeZone ? { timeZone } : {}) })
    cache.set(key, f)
  }

  return f
}

/** A usable Date from whatever the API sent, or null. */
export function toDate(value: TimeInput): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)

  return Number.isFinite(d.getTime()) ? d : null
}

/** «22:28» / «00:05». */
export function formatTime24(value: TimeInput, opts: Time24Options = {}): string {
  const d = toDate(value)
  if (!d) return EMPTY
  try {
    return formatter('time', opts.locale ?? TIME24_LOCALE, opts.timeZone, () => ({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })).format(d)
  } catch {
    return EMPTY
  }
}

/** The medium date followed by the 24-hour time: «26‏/11‏/2026، 22:28». */
export function formatDateTime24(value: TimeInput, opts: Time24Options = {}): string {
  const d = toDate(value)
  if (!d) return EMPTY
  try {
    return formatter('datetime', opts.locale ?? TIME24_LOCALE, opts.timeZone, () => ({ dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' })).format(d)
  } catch {
    return EMPTY
  }
}
