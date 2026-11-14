import { describe, expect, it } from 'vitest'
import {
  MAX_RANGE_DAYS,
  addDays,
  daysBetween,
  isIsoDate,
  presetRange,
  rangeFromParams,
  todayInReportingZone,
  validateRange,
} from '@/pages/super-admin/users/hub/analytics/range'
import { fmtInstant, fmtInt, fmtPct, fmtPeriod } from '@/pages/super-admin/users/hub/analytics/format'

describe('the reporting day', () => {
  it('is the Amsterdam calendar day, not the UTC one', () => {
    // 23:30 UTC on the 19th is already 00:30 on the 20th in Amsterdam (UTC+1 in November)
    expect(todayInReportingZone(new Date('2026-11-19T23:30:00Z'))).toBe('2026-11-20')
    // …and in summer (UTC+2) 22:30 UTC is already the next day
    expect(todayInReportingZone(new Date('2026-07-10T22:30:00Z'))).toBe('2026-07-11')
    expect(todayInReportingZone(new Date('2026-11-20T12:00:00Z'))).toBe('2026-11-20')
  })
})

describe('date arithmetic', () => {
  it('adds calendar days across a DST change without drifting', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30') // clocks go forward on the 29th
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26') // and back on the 25th
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('counts days inclusively', () => {
    expect(daysBetween('2026-11-10', '2026-11-10')).toBe(1)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(3)
    expect(daysBetween('2025-11-16', '2026-11-16')).toBe(366)
  })

  it('recognises only real ISO dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('10-11-2026')).toBe(false)
    expect(isIsoDate('')).toBe(false)
    expect(isIsoDate(null)).toBe(false)
  })
})

describe('presets', () => {
  const today = '2026-11-20'

  it('resolve to whole days ending today (or yesterday)', () => {
    expect(presetRange('today', today)).toMatchObject({ from: '2026-11-20', to: '2026-11-20', days: 1 })
    expect(presetRange('yesterday', today)).toMatchObject({ from: '2026-11-19', to: '2026-11-19', days: 1 })
    expect(presetRange('7d', today)).toMatchObject({ from: '2026-11-14', to: '2026-11-20', days: 7 })
    expect(presetRange('30d', today)).toMatchObject({ from: '2026-10-22', to: '2026-11-20', days: 30 })
    expect(presetRange('90d', today)).toMatchObject({ from: '2026-08-23', to: '2026-11-20', days: 90 })
  })
})

describe('custom range validation (the same rules as the server)', () => {
  const today = '2026-11-20'

  it('accepts a valid range, a single day and exactly 366 days', () => {
    expect(validateRange('2026-11-10', '2026-11-16', today)).toBeNull()
    expect(validateRange('2026-11-20', '2026-11-20', today)).toBeNull()
    expect(validateRange('2025-11-20', '2026-11-20', today)).toBeNull()
  })

  it('rejects bad format, reversed order, the future and over-long ranges', () => {
    expect(validateRange('', '2026-11-16', today)).toBe('format')
    expect(validateRange('2026-13-01', '2026-11-16', today)).toBe('format')
    expect(validateRange('2026-11-16', '2026-11-10', today)).toBe('order')
    expect(validateRange('2026-11-10', '2026-11-21', today)).toBe('future')
    expect(validateRange('2025-01-01', '2026-11-20', today)).toBe('too_long')
    expect(MAX_RANGE_DAYS).toBe(366)
  })
})

describe('reading the range from the URL', () => {
  const today = '2026-11-20'

  it('defaults to the last 30 days', () => {
    expect(rangeFromParams(null, null, null, today)).toMatchObject({ preset: '30d', from: '2026-10-22', to: '2026-11-20' })
  })

  it('honours a known preset and a valid custom range', () => {
    expect(rangeFromParams('7d', null, null, today)).toMatchObject({ preset: '7d', days: 7 })
    expect(rangeFromParams('custom', '2026-11-01', '2026-11-05', today)).toEqual({ preset: 'custom', from: '2026-11-01', to: '2026-11-05', days: 5 })
  })

  it('falls back to the default for unknown presets and invalid custom ranges (the URL is user input)', () => {
    expect(rangeFromParams('forever', null, null, today).preset).toBe('30d')
    expect(rangeFromParams('custom', '2026-11-05', '2026-11-01', today).preset).toBe('30d')
    expect(rangeFromParams('custom', null, null, today).preset).toBe('30d')
    expect(rangeFromParams('custom', '2026-11-01', '2027-01-01', today).preset).toBe('30d')
  })
})

describe('formatting', () => {
  it('uses one number format', () => {
    expect(fmtInt(1284)).toBe('1,284')
    expect(fmtInt(0)).toBe('0')
    expect(fmtInt(null)).toBe('—')
    expect(fmtPct(35.2, true)).toBe('+35.2%')
    expect(fmtPct(-7.2, true)).toBe('-7.2%')
    expect(fmtPct(0, true)).toBe('0.0%')
    expect(fmtPct(12)).toBe('12.0%')
    expect(fmtPct(null)).toBe('—')
  })

  it('shows an instant in the reporting zone with the date and the time apart', () => {
    // 22:30 UTC on the 19th is 23:30 in Amsterdam (UTC+1)
    expect(fmtInstant('2026-11-19T22:30:00+00:00')).toMatch(/·\s*23:30$/)
    expect(fmtInstant(null)).toBe('—')
    expect(fmtInstant('not a date')).toBe('—')
  })

  it('describes a period', () => {
    expect(fmtPeriod('2026-11-10', '2026-11-16')).toContain('من')
    expect(fmtPeriod('2026-11-10', '2026-11-10')).not.toContain('من')
  })
})
