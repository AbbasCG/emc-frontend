import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  formatDateTime,
  formatDate,
  formatRelativeDate,
  formatLastLogin,
  formatNotificationDate,
  formatAmsterdamDateTimeRange,
} from '@/utils/dateTime'
import {
  AMSTERDAM_TIME_ZONE,
  formatAmsterdamDateTime,
  formatAmsterdamDate,
  formatAmsterdamDMY,
  formatAmsterdamTime24,
  formatAmsterdamTimeRange,
  formatWallClockDMY,
  formatWallClockTime24,
} from '@/utils/amsterdamTime'
import {
  parseDatetimeLocalParts,
  parseDatetimeLocal,
  toDatetimeLocalValue,
  formatDatetimeLocalPreview,
  splitDatetimeLocalPreview,
  addDaysToDatetimeLocal,
  addMinutesToDatetimeLocal,
  startOfTodayDatetimeLocal,
  compareDatetimeLocal,
} from '@/utils/datetimeLocal'

/**
 * The clock is pinned to 2026-07-16T10:00:00Z — that is 12:00 on Thursday
 * 16 July in Europe/Amsterdam (CEST, UTC+2), so "today" is unambiguous no
 * matter which timezone the test runner happens to sit in.
 *
 * Every instant fed to the Amsterdam formatters carries an explicit `Z`
 * offset, so the expected output is a property of the formatter, not of the
 * host machine.
 */
const NOW = '2026-07-16T10:00:00Z'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('formatDateTime', () => {
  it('renders a UTC instant as dd/mm/yyyy HH:MM in Amsterdam summer time (UTC+2)', () => {
    expect(formatDateTime('2026-07-16T12:30:00Z')).toBe('16/07/2026 14:30')
  })

  it('renders Amsterdam winter time (UTC+1) and rolls the date over midnight', () => {
    // 23:30 UTC on 15 Jan is 00:30 on 16 Jan in Amsterdam.
    expect(formatDateTime('2026-01-15T23:30:00Z')).toBe('16/01/2026 00:30')
  })

  it('honours an explicit timezone argument instead of Amsterdam', () => {
    expect(formatDateTime('2026-07-16T12:30:00Z', 'ar', 'UTC')).toBe('16/07/2026 12:30')
  })

  it('returns the em-dash placeholder for null, undefined and empty input', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime('')).toBe('—')
  })

  it('returns the placeholder for an unparseable string instead of "Invalid Date"', () => {
    expect(formatDateTime('not-a-date')).toBe('—')
    expect(formatDateTime('2026-13-45T99:99:99Z')).toBe('—')
  })

  it('falls back to a raw ISO slice when the timezone is rejected by Intl', () => {
    expect(formatDateTime('2026-07-16T12:30:00Z', 'ar', 'Not/AZone')).toBe('2026-07-16T12:30')
  })

  it('uses Latin digits, never Arabic-Indic ones, even though the UI locale is ar', () => {
    expect(formatDateTime('2026-07-16T12:30:00Z')).toMatch(/^[0-9/: ]+$/)
  })
})

describe('formatDate', () => {
  it('rolls a late-evening UTC instant onto the next Amsterdam day', () => {
    expect(formatDate('2026-07-16T22:15:00Z')).toBe('17/07/2026')
  })

  it('keeps a bare date string on the same day', () => {
    expect(formatDate('2026-07-16')).toBe('16/07/2026')
  })

  it('returns the placeholder for empty and invalid input', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
    expect(formatDate('rubbish')).toBe('—')
  })

  it('falls back to the first ten characters when the timezone is invalid', () => {
    expect(formatDate('2026-07-16T12:30:00Z', 'ar', 'Not/AZone')).toBe('2026-07-16')
  })
})

describe('formatRelativeDate', () => {
  it('labels the current Amsterdam day as اليوم with the local time', () => {
    expect(formatRelativeDate('2026-07-16T12:30:00Z')).toBe('اليوم، 14:30')
  })

  it('labels the previous day as أمس', () => {
    expect(formatRelativeDate('2026-07-15T08:00:00Z')).toBe('أمس، 10:00')
  })

  it('labels the next day as غداً', () => {
    expect(formatRelativeDate('2026-07-17T08:00:00Z')).toBe('غداً، 10:00')
  })

  it('counts backwards in days for the rest of the past week', () => {
    expect(formatRelativeDate('2026-07-13T08:00:00Z')).toBe('منذ 3 أيام')
    expect(formatRelativeDate('2026-07-11T08:00:00Z')).toBe('منذ 5 أيام')
  })

  it('counts forwards in days for the rest of the coming week', () => {
    expect(formatRelativeDate('2026-07-19T08:00:00Z')).toBe('بعد 3 أيام')
  })

  it('switches to an absolute date at the 7-day boundary in both directions', () => {
    expect(formatRelativeDate('2026-07-09T08:00:00Z')).toBe('09/07/2026')
    expect(formatRelativeDate('2026-07-23T08:00:00Z')).toBe('23/07/2026')
  })

  it('treats a late-night UTC instant by its Amsterdam calendar day', () => {
    // 22:30 UTC on 15 July is 00:30 on 16 July in Amsterdam — i.e. "today".
    expect(formatRelativeDate('2026-07-15T22:30:00Z')).toBe('اليوم، 00:30')
  })

  it('returns the placeholder for null and invalid input', () => {
    expect(formatRelativeDate(null)).toBe('—')
    expect(formatRelativeDate(undefined)).toBe('—')
    expect(formatRelativeDate('nope')).toBe('—')
  })
})

describe('formatLastLogin', () => {
  it('labels today and yesterday with the Amsterdam wall-clock time', () => {
    expect(formatLastLogin('2026-07-16T12:30:00Z')).toBe('اليوم، 14:30')
    expect(formatLastLogin('2026-07-15T08:00:00Z')).toBe('أمس، 10:00')
  })

  it('uses the plural أيام form for 2–6 days ago', () => {
    expect(formatLastLogin('2026-07-14T08:00:00Z')).toBe('منذ 2 أيام')
    expect(formatLastLogin('2026-07-10T08:00:00Z')).toBe('منذ 6 أيام')
  })

  it('switches to the يوماً form from 7 up to 29 days ago', () => {
    expect(formatLastLogin('2026-07-09T08:00:00Z')).toBe('منذ 7 يوماً')
    expect(formatLastLogin('2026-06-17T08:00:00Z')).toBe('منذ 29 يوماً')
  })

  it('switches to an absolute date at exactly 30 days and beyond', () => {
    expect(formatLastLogin('2026-06-16T08:00:00Z')).toBe('16/06/2026')
    expect(formatLastLogin('2025-01-02T08:00:00Z')).toBe('02/01/2025')
  })

  it('returns the placeholder for null, undefined and invalid input', () => {
    expect(formatLastLogin(null)).toBe('—')
    expect(formatLastLogin(undefined)).toBe('—')
    expect(formatLastLogin('')).toBe('—')
    expect(formatLastLogin('garbage')).toBe('—')
  })

  it('renders a future timestamp forwards instead of as a negative day count', () => {
    // Regression: `diffDays < 7` also matched negative diffs, so a clock-skewed
    // last_login_at rendered as "منذ -3 أيام". Mirrors formatRelativeDate.
    expect(formatLastLogin('2026-07-19T08:00:00Z')).toBe('بعد 3 أيام')
  })
})

describe('formatNotificationDate', () => {
  it('returns an EMPTY string (not an em-dash) for missing or invalid input', () => {
    expect(formatNotificationDate(null)).toBe('')
    expect(formatNotificationDate(undefined)).toBe('')
    expect(formatNotificationDate('')).toBe('')
    expect(formatNotificationDate('not-a-date')).toBe('')
  })

  it('shows only the Amsterdam time for today', () => {
    expect(formatNotificationDate('2026-07-16T12:30:00Z')).toBe('14:30')
  })

  it('shows أمس for yesterday with no time', () => {
    expect(formatNotificationDate('2026-07-15T08:00:00Z')).toBe('أمس')
  })

  it('shows a day count within the last week', () => {
    expect(formatNotificationDate('2026-07-13T08:00:00Z')).toBe('منذ 3 أيام')
  })

  it('shows an Arabic short day+month for anything older than a week', () => {
    expect(formatNotificationDate('2026-07-06T08:00:00Z')).toBe('6 يوليو')
    expect(formatNotificationDate('2026-06-10T10:00:00Z')).toBe('10 يونيو')
  })

  it('renders a future notification forwards instead of as a negative day count', () => {
    // Regression: same unguarded `diffDays < 7` branch as formatLastLogin.
    expect(formatNotificationDate('2026-07-18T08:00:00Z')).toBe('بعد 2 أيام')
  })
})

describe('formatAmsterdamDateTimeRange', () => {
  it('collapses a same-day range to one date and two times', () => {
    expect(
      formatAmsterdamDateTimeRange('2026-06-18T08:00:00Z', '2026-06-18T10:30:00Z'),
    ).toBe('18/06/2026، 10:00 - 12:30')
  })

  it('repeats the date when the range crosses midnight in Amsterdam', () => {
    // 21:00Z = 23:00 on the 18th; 22:30Z = 00:30 on the 19th.
    expect(
      formatAmsterdamDateTimeRange('2026-06-18T21:00:00Z', '2026-06-18T22:30:00Z'),
    ).toBe('18/06/2026، 23:00 - 19/06/2026، 00:30')
  })

  it('renders start only when the end is missing', () => {
    expect(formatAmsterdamDateTimeRange('2026-06-18T08:00:00Z', null)).toBe('18/06/2026، 10:00')
    expect(formatAmsterdamDateTimeRange('2026-06-18T08:00:00Z', undefined)).toBe('18/06/2026، 10:00')
  })

  it('ignores an unparseable end rather than emitting "Invalid Date"', () => {
    expect(formatAmsterdamDateTimeRange('2026-06-18T08:00:00Z', 'broken')).toBe('18/06/2026، 10:00')
  })

  it('returns the placeholder when the start is missing or invalid', () => {
    expect(formatAmsterdamDateTimeRange(null, '2026-06-18T10:30:00Z')).toBe('—')
    expect(formatAmsterdamDateTimeRange('', '2026-06-18T10:30:00Z')).toBe('—')
    expect(formatAmsterdamDateTimeRange('broken', '2026-06-18T10:30:00Z')).toBe('—')
  })
})

describe('amsterdamTime — instant formatters', () => {
  it('exposes the canonical timezone id', () => {
    expect(AMSTERDAM_TIME_ZONE).toBe('Europe/Amsterdam')
  })

  it('formats an Arabic long datetime with a 24-hour Amsterdam clock', () => {
    expect(formatAmsterdamDateTime('2026-07-16T12:30:00Z')).toBe('الخميس، 16 يوليو 2026 — 14:30')
  })

  it('formats the English variant as dd/mm/yyyy HH:MM', () => {
    expect(formatAmsterdamDateTime('2026-07-16T12:30:00Z', 'en')).toBe('16/07/2026 14:30')
  })

  it('accepts a Date instance as well as an ISO string', () => {
    const asString = formatAmsterdamDateTime('2026-07-16T12:30:00Z')
    expect(formatAmsterdamDateTime(new Date('2026-07-16T12:30:00Z'))).toBe(asString)
  })

  it('applies CET (UTC+1) in winter, shifting the day across midnight', () => {
    expect(formatAmsterdamDMY('2026-01-15T23:30:00Z')).toBe('16/01/2026')
    expect(formatAmsterdamTime24('2026-01-15T23:30:00Z')).toBe('00:30')
  })

  it('applies CEST (UTC+2) in summer', () => {
    expect(formatAmsterdamDMY('2026-07-16T22:15:00Z')).toBe('17/07/2026')
    expect(formatAmsterdamTime24('2026-07-16T12:30:00Z')).toBe('14:30')
  })

  it('formats the Arabic long date without a time part', () => {
    expect(formatAmsterdamDate('2026-07-16T12:30:00Z')).toBe('الخميس، 16 يوليو 2026')
  })

  it('returns the em-dash placeholder for null/undefined/invalid dates', () => {
    expect(formatAmsterdamDateTime(null)).toBe('—')
    expect(formatAmsterdamDateTime(undefined)).toBe('—')
    expect(formatAmsterdamDateTime('nonsense')).toBe('—')
    expect(formatAmsterdamDate(null)).toBe('—')
    expect(formatAmsterdamDMY('nonsense')).toBe('—')
    expect(formatAmsterdamDateTime(new Date('nonsense'))).toBe('—')
  })

  it('returns an EMPTY string from formatAmsterdamTime24 for missing input', () => {
    expect(formatAmsterdamTime24(null)).toBe('')
    expect(formatAmsterdamTime24(undefined)).toBe('')
    expect(formatAmsterdamTime24('')).toBe('')
    expect(formatAmsterdamTime24('nonsense')).toBe('')
  })
})

describe('formatAmsterdamTimeRange', () => {
  it('joins two instants with an en-dash', () => {
    expect(
      formatAmsterdamTimeRange('2026-07-16T12:30:00Z', '2026-07-16T13:00:00Z'),
    ).toBe('14:30–15:00')
  })

  it('renders the start alone when the end is missing or invalid', () => {
    expect(formatAmsterdamTimeRange('2026-07-16T12:30:00Z', null)).toBe('14:30')
    expect(formatAmsterdamTimeRange('2026-07-16T12:30:00Z', 'broken')).toBe('14:30')
  })

  it('returns the placeholder when the start cannot be formatted', () => {
    expect(formatAmsterdamTimeRange(null, '2026-07-16T13:00:00Z')).toBe('—')
    expect(formatAmsterdamTimeRange('broken', '2026-07-16T13:00:00Z')).toBe('—')
  })
})

describe('amsterdamTime — wall-clock (string-only) formatters', () => {
  it('rejects a non-ISO date shape rather than guessing', () => {
    expect(formatWallClockDMY('16/07/2026')).toBe('—')
    expect(formatWallClockDMY('2026-7-6')).toBe('—')
    expect(formatWallClockDMY('')).toBe('—')
  })

  it('ignores the time part of a naive datetime when producing the date', () => {
    expect(formatWallClockDMY('2026-08-05T10:00:00')).toBe('05/08/2026')
  })

  it('returns the input unchanged when no time can be extracted', () => {
    expect(formatWallClockTime24('not a time')).toBe('not a time')
  })

  it('is immune to the runtime timezone — the same string round-trips exactly', () => {
    expect(formatWallClockTime24('2026-01-05T23:59:00')).toBe('23:59')
    expect(formatWallClockDMY('2026-01-05T23:59:00')).toBe('05/01/2026')
  })
})

describe('parseDatetimeLocalParts', () => {
  it('splits a datetime-local value into numeric parts', () => {
    expect(parseDatetimeLocalParts('2026-07-16T14:30')).toEqual({
      year: 2026,
      month: 7,
      day: 16,
      hour: 14,
      minute: 30,
    })
  })

  it('tolerates trailing seconds and surrounding whitespace', () => {
    expect(parseDatetimeLocalParts('  2026-07-16T14:30:45  ')?.minute).toBe(30)
  })

  it('returns null for shapes the input element never produces', () => {
    expect(parseDatetimeLocalParts('')).toBeNull()
    expect(parseDatetimeLocalParts('   ')).toBeNull()
    expect(parseDatetimeLocalParts('2026-07-16 14:30')).toBeNull()
    expect(parseDatetimeLocalParts('16/07/2026T14:30')).toBeNull()
    expect(parseDatetimeLocalParts('2026-07-16')).toBeNull()
  })
})

describe('parseDatetimeLocal / toDatetimeLocalValue', () => {
  it('builds a Date from the literal local components — no timezone shift', () => {
    const d = parseDatetimeLocal('2026-07-16T14:30')
    expect(d).not.toBeNull()
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(6)
    expect(d?.getDate()).toBe(16)
    expect(d?.getHours()).toBe(14)
    expect(d?.getMinutes()).toBe(30)
    expect(d?.getSeconds()).toBe(0)
  })

  it('round-trips a value through parse → serialise unchanged', () => {
    for (const v of ['2026-01-05T09:07', '2026-07-16T14:30', '2026-12-31T23:59']) {
      expect(toDatetimeLocalValue(parseDatetimeLocal(v)!)).toBe(v)
    }
  })

  it('zero-pads month, day, hour and minute', () => {
    expect(toDatetimeLocalValue(new Date(2026, 0, 5, 9, 7))).toBe('2026-01-05T09:07')
  })

  it('returns null for unparseable input', () => {
    expect(parseDatetimeLocal('')).toBeNull()
    expect(parseDatetimeLocal('tomorrow')).toBeNull()
  })

  it('rolls over out-of-range components rather than rejecting them', () => {
    // Month 13 is accepted by the regex and normalised by the Date constructor.
    const d = parseDatetimeLocal('2026-13-01T00:00')
    expect(d?.getFullYear()).toBe(2027)
    expect(d?.getMonth()).toBe(0)
  })
})

describe('formatDatetimeLocalPreview / splitDatetimeLocalPreview', () => {
  it('renders an Arabic long date and a 24-hour time with Latin digits', () => {
    expect(formatDatetimeLocalPreview('2026-07-16T14:30')).toBe('16 يوليو 2026، 14:30')
  })

  it('zero-pads the hour for early-morning values', () => {
    expect(formatDatetimeLocalPreview('2026-01-05T00:05')).toBe('5 يناير 2026، 00:05')
  })

  it('returns an empty string for unparseable input', () => {
    expect(formatDatetimeLocalPreview('')).toBe('')
    expect(formatDatetimeLocalPreview('nope')).toBe('')
  })

  it('splits the preview on the last Arabic comma', () => {
    expect(splitDatetimeLocalPreview('2026-07-16T14:30')).toEqual({
      date: '16 يوليو 2026',
      time: '14:30',
    })
  })

  it('returns two empty strings when there is nothing to preview', () => {
    expect(splitDatetimeLocalPreview('nope')).toEqual({ date: '', time: '' })
  })
})

describe('addDaysToDatetimeLocal / addMinutesToDatetimeLocal', () => {
  it('adds days while preserving the time of day', () => {
    expect(addDaysToDatetimeLocal('2026-07-16T14:30', 5)).toBe('2026-07-21T14:30')
  })

  it('carries across a month boundary', () => {
    expect(addDaysToDatetimeLocal('2026-07-30T14:30', 3)).toBe('2026-08-02T14:30')
  })

  it('carries across a year boundary and accepts negative deltas', () => {
    expect(addDaysToDatetimeLocal('2026-12-31T23:00', 1)).toBe('2027-01-01T23:00')
    expect(addDaysToDatetimeLocal('2026-01-01T08:00', -1)).toBe('2025-12-31T08:00')
  })

  it('adds minutes across midnight', () => {
    expect(addMinutesToDatetimeLocal('2026-07-16T23:50', 20)).toBe('2026-07-17T00:10')
  })

  it('subtracts minutes across midnight', () => {
    expect(addMinutesToDatetimeLocal('2026-07-16T00:10', -20)).toBe('2026-07-15T23:50')
  })

  it('falls back to "now" when the base value is unparseable', () => {
    const expected = new Date()
    expected.setDate(expected.getDate() + 2)
    expect(addDaysToDatetimeLocal('garbage', 2)).toBe(toDatetimeLocalValue(expected))
  })

  it('adding zero is a no-op', () => {
    expect(addDaysToDatetimeLocal('2026-07-16T14:30', 0)).toBe('2026-07-16T14:30')
    expect(addMinutesToDatetimeLocal('2026-07-16T14:30', 0)).toBe('2026-07-16T14:30')
  })
})

describe('startOfTodayDatetimeLocal', () => {
  it('returns today at 09:00 local time in datetime-local shape', () => {
    const value = startOfTodayDatetimeLocal()
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T09:00$/)
    expect(value.slice(0, 10)).toBe(toDatetimeLocalValue(new Date()).slice(0, 10))
  })
})

describe('compareDatetimeLocal', () => {
  it('orders two valid values chronologically', () => {
    expect(compareDatetimeLocal('2026-07-16T09:00', '2026-07-16T10:00')).toBeLessThan(0)
    expect(compareDatetimeLocal('2026-07-16T10:00', '2026-07-16T09:00')).toBeGreaterThan(0)
  })

  it('returns 0 for identical values', () => {
    expect(compareDatetimeLocal('2026-07-16T09:00', '2026-07-16T09:00')).toBe(0)
  })

  it('treats an unparseable operand as "equal" so sorting stays stable', () => {
    expect(compareDatetimeLocal('garbage', '2026-07-16T09:00')).toBe(0)
    expect(compareDatetimeLocal('2026-07-16T09:00', '')).toBe(0)
  })

  it('sorts an array end-to-end', () => {
    const sorted = ['2026-07-18T08:00', '2026-07-16T08:00', '2026-07-17T08:00'].sort(
      compareDatetimeLocal,
    )
    expect(sorted).toEqual(['2026-07-16T08:00', '2026-07-17T08:00', '2026-07-18T08:00'])
  })
})
