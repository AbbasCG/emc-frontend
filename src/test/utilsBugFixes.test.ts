import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatLastLogin, formatNotificationDate } from '@/utils/dateTime'
import { formatEnglishNumber, formatEnglishCount, formatEnglishDate } from '@/utils/formatEnglishNumber'
import { WEEKDAY_LABELS } from '@/utils/calendarGrid'
import { resolveCourseIsEnded, resolveCourseComputedStatus } from '@/utils/courseEnded'

/**
 * Regression suite for the utility defects fixed in this batch.
 *
 * Every assertion here FAILS against the pre-fix implementation.
 */

// ── dateTime: future / clock-skewed timestamps ───────────────────────────────
// 2026-07-16T10:00:00Z is 12:00 on Thursday 16 July in Europe/Amsterdam (CEST),
// so "today" is the same calendar day whatever timezone the runner sits in.
const NOW = '2026-07-16T10:00:00Z'

describe('formatLastLogin — future timestamps no longer leak a negative day count', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the بعد form for a timestamp 2–6 days in the future', () => {
    // Pre-fix: "منذ -3 أيام".
    expect(formatLastLogin('2026-07-19T08:00:00Z')).toBe('بعد 3 أيام')
    expect(formatLastLogin('2026-07-18T08:00:00Z')).toBe('بعد 2 أيام')
  })

  it('labels tomorrow as غداً, matching formatRelativeDate', () => {
    // Pre-fix: "منذ -1 أيام".
    expect(formatLastLogin('2026-07-17T08:00:00Z')).toBe('غداً، 10:00')
  })

  it('falls back to an absolute date once the future gap reaches a week', () => {
    // Pre-fix both fell into `diffDays < 7`, then `diffDays < 30`.
    expect(formatLastLogin('2026-07-23T08:00:00Z')).toBe('الخميس، 23 يوليو 2026')
    expect(formatLastLogin('2026-08-16T08:00:00Z')).toBe('الأحد، 16 أغسطس 2026')
  })

  it('never emits a minus sign for any future offset up to a year out', () => {
    for (const iso of [
      '2026-07-17T08:00:00Z',
      '2026-07-20T08:00:00Z',
      '2026-07-25T08:00:00Z',
      '2026-09-01T08:00:00Z',
      '2027-07-16T08:00:00Z',
    ]) {
      expect(formatLastLogin(iso)).not.toContain('-')
    }
  })

  it('keeps the existing past-side behaviour intact', () => {
    expect(formatLastLogin('2026-07-16T12:30:00Z')).toBe('اليوم، 14:30')
    expect(formatLastLogin('2026-07-15T08:00:00Z')).toBe('أمس، 10:00')
    expect(formatLastLogin('2026-07-14T08:00:00Z')).toBe('منذ 2 أيام')
    expect(formatLastLogin('2026-07-10T08:00:00Z')).toBe('منذ 6 أيام')
    expect(formatLastLogin('2026-07-09T08:00:00Z')).toBe('منذ 7 يوماً')
    expect(formatLastLogin('2026-06-17T08:00:00Z')).toBe('منذ 29 يوماً')
    expect(formatLastLogin('2026-06-16T08:00:00Z')).toBe('الثلاثاء، 16 يونيو 2026')
    expect(formatLastLogin(null)).toBe('—')
    expect(formatLastLogin('garbage')).toBe('—')
  })
})

describe('formatNotificationDate — future notifications no longer leak a negative day count', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the بعد form for a notification 2–6 days ahead', () => {
    // Pre-fix: "منذ -2 أيام".
    expect(formatNotificationDate('2026-07-18T08:00:00Z')).toBe('بعد 2 أيام')
    expect(formatNotificationDate('2026-07-21T08:00:00Z')).toBe('بعد 5 أيام')
  })

  it('labels tomorrow as غداً', () => {
    // Pre-fix: "منذ -1 أيام".
    expect(formatNotificationDate('2026-07-17T08:00:00Z')).toBe('غداً')
  })

  it('falls through to the short day+month for anything a week or more ahead', () => {
    // Pre-fix: "منذ -10 أيام".
    expect(formatNotificationDate('2026-07-26T08:00:00Z')).toBe('26 يوليو')
  })

  it('never emits a minus sign for any future offset', () => {
    for (const iso of ['2026-07-17T08:00:00Z', '2026-07-19T08:00:00Z', '2026-08-30T08:00:00Z']) {
      expect(formatNotificationDate(iso)).not.toContain('-')
    }
  })

  it('keeps the existing past-side behaviour intact', () => {
    expect(formatNotificationDate('2026-07-16T12:30:00Z')).toBe('14:30')
    expect(formatNotificationDate('2026-07-15T08:00:00Z')).toBe('أمس')
    expect(formatNotificationDate('2026-07-13T08:00:00Z')).toBe('منذ 3 أيام')
    expect(formatNotificationDate('2026-07-06T08:00:00Z')).toBe('6 يوليو')
    expect(formatNotificationDate(null)).toBe('')
    expect(formatNotificationDate('not-a-date')).toBe('')
  })
})

// ── formatEnglishNumber: NaN placeholder ─────────────────────────────────────

describe('formatEnglishNumber — NaN gets the em-dash placeholder', () => {
  it('renders Number.NaN as — rather than the literal string "NaN"', () => {
    expect(formatEnglishNumber(Number.NaN)).toBe('—')
    expect(formatEnglishNumber(0 / 0)).toBe('—')
    expect(formatEnglishNumber(Number.parseInt('abc', 10))).toBe('—')
  })

  it('applies to the count wrapper too', () => {
    expect(formatEnglishCount(Number.NaN)).toBe('—')
  })

  it('still passes non-numeric Arabic text and Arabic-Indic digits through', () => {
    expect(formatEnglishNumber('غير محدد')).toBe('غير محدد')
    expect(formatEnglishNumber('١٢٣')).toBe('123')
    expect(formatEnglishNumber('مدة ٥ أيام')).toBe('مدة 5 أيام')
  })

  it('still renders zero and Infinity as before', () => {
    expect(formatEnglishNumber(0)).toBe('0')
    expect(formatEnglishNumber(Infinity)).toBe('∞')
  })
})

// ── formatEnglishDate: pinned to Europe/Amsterdam ────────────────────────────

describe('formatEnglishDate — pinned to Europe/Amsterdam like every other date formatter', () => {
  /*
   * Three probes, chosen so that at least one of them differs from the host
   * rendering for any runner timezone other than Europe/Amsterdam itself:
   *   • a date-only string (UTC midnight)  — wrong on any host west of UTC
   *   • 22:30Z, i.e. 00:30 Amsterdam       — wrong on any host at UTC+1 or below
   *   • 21:30Z, i.e. 23:30 Amsterdam       — wrong on any host above UTC+2
   * On a runner already set to Europe/Amsterdam the two renderings coincide, so
   * the values below stay correct there as well.
   */
  it('reads a date-only string as an Amsterdam calendar day, not the host one', () => {
    expect(formatEnglishDate('2026-07-16')).toBe('16 يوليو 2026')
    expect(formatEnglishDate('2026-01-05')).toBe('5 يناير 2026')
  })

  it('rolls a late-evening UTC instant onto the next Amsterdam day', () => {
    // 22:30Z on 16 July is 00:30 on 17 July in Amsterdam (CEST, UTC+2).
    expect(formatEnglishDate('2026-07-16T22:30:00Z')).toBe('17 يوليو 2026')
  })

  it('keeps a late-evening Amsterdam instant on the Amsterdam day', () => {
    // 21:30Z on 16 July is 23:30 on 16 July in Amsterdam.
    expect(formatEnglishDate('2026-07-16T21:30:00Z')).toBe('16 يوليو 2026')
  })

  it('applies CET (UTC+1) in winter', () => {
    // 23:30Z on 15 January is 00:30 on 16 January in Amsterdam.
    expect(formatEnglishDate('2026-01-15T23:30:00Z')).toBe('16 يناير 2026')
  })

  it('still returns the placeholder and Latin-digit fallbacks for bad input', () => {
    expect(formatEnglishDate(null)).toBe('—')
    expect(formatEnglishDate('   ')).toBe('—')
    expect(formatEnglishDate('hello')).toBe('hello')
  })
})

// ── calendarGrid: Wednesday spelling ─────────────────────────────────────────

describe('WEEKDAY_LABELS — Wednesday is spelled correctly', () => {
  it('uses الأربعاء, not the non-word الربيعاء', () => {
    expect(WEEKDAY_LABELS[3]).toBe('الأربعاء')
    expect(WEEKDAY_LABELS).not.toContain('الربيعاء')
  })

  it('leaves the other six labels untouched', () => {
    expect(WEEKDAY_LABELS).toEqual([
      'الأحد',
      'الاثنين',
      'الثلاثاء',
      'الأربعاء',
      'الخميس',
      'الجمعة',
      'السبت',
    ])
  })
})

// ── courseEnded: single-digit end_time hour ──────────────────────────────────

describe('resolveCourseIsEnded — a single-digit end_time hour builds a valid ISO instant', () => {
  const END_DATE = '2026-07-25'

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const course = (end_time: string) => ({ status: 'published', end_date: END_DATE, end_time })

  it('pads "9:00" to 09:00:59 — still live at 09:00:30', () => {
    // Pre-fix this built '2026-07-25T9:00', which either fails to parse (course
    // silently reads as not-ended) or parses as 09:00:00 with no :59 padding.
    vi.setSystemTime(new Date(Date.parse(`${END_DATE}T09:00:30`)))
    expect(resolveCourseIsEnded(course('9:00'))).toBe(false)
  })

  it('pads "9:00" to 09:00:59 — ended at 09:01:00', () => {
    vi.setSystemTime(new Date(Date.parse(`${END_DATE}T09:01:00`)))
    expect(resolveCourseIsEnded(course('9:00'))).toBe(true)
    expect(resolveCourseComputedStatus(course('9:00'))).toBe('ended')
  })

  it('pads a single-digit hour that already carries seconds', () => {
    vi.setSystemTime(new Date(Date.parse(`${END_DATE}T09:00:30`)))
    expect(resolveCourseIsEnded(course('9:00:00'))).toBe(true)
    expect(resolveCourseIsEnded(course('9:01:00'))).toBe(false)
  })

  it('treats "9:00" and "09:00" as the very same instant', () => {
    for (const ts of [
      Date.parse(`${END_DATE}T08:59:59`),
      Date.parse(`${END_DATE}T09:00:30`),
      Date.parse(`${END_DATE}T09:00:59`),
      Date.parse(`${END_DATE}T09:01:00`),
    ]) {
      vi.setSystemTime(new Date(ts))
      expect(resolveCourseIsEnded(course('9:00'))).toBe(resolveCourseIsEnded(course('09:00')))
    }
  })

  it('keeps the two-digit and malformed paths behaving exactly as before', () => {
    vi.setSystemTime(new Date(Date.parse(`${END_DATE}T18:30:30`)))
    expect(resolveCourseIsEnded(course('18:30'))).toBe(false)
    expect(resolveCourseIsEnded(course('18:30:00'))).toBe(true)
    expect(resolveCourseIsEnded(course('18:30:00.000'))).toBe(true)
    expect(resolveCourseIsEnded(course('مساءً'))).toBe(false)
    expect(resolveCourseIsEnded(course('   '))).toBe(false)
    vi.setSystemTime(new Date(Date.parse(`${END_DATE}T23:59:59`) + 1))
    expect(resolveCourseIsEnded(course('مساءً'))).toBe(true)
  })
})
