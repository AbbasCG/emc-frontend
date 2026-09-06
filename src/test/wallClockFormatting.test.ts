import { describe, it, expect } from 'vitest'
import { formatWallClockDMY, formatWallClockTime24 } from '../utils/amsterdamTime'

/**
 * Ticket 4 (frontend completion pass): LmsSession.date/start_time/end_time
 * are backend-computed Europe/Amsterdam wall-clock values with no UTC
 * offset. These formatters must render them once, as plain strings — never
 * through `new Date(...)` + `Intl` timezone conversion, which would
 * re-interpret a naive datetime as an instant in the runtime's local zone
 * and then convert it again, silently drifting the displayed time whenever
 * the runtime isn't already in Europe/Amsterdam (exactly the "+2-hour
 * double-conversion" bug this pass closes).
 */
describe('formatWallClockTime24 / formatWallClockDMY — no double timezone conversion', () => {
  it('19:00 remains 19:00 regardless of runtime timezone', () => {
    expect(formatWallClockTime24('19:00')).toBe('19:00')
  })

  it('accepts HH:MM:SS and truncates to HH:MM', () => {
    expect(formatWallClockTime24('09:05:00')).toBe('09:05')
  })

  it('renders 24-hour format for a midday and a midnight-adjacent time', () => {
    expect(formatWallClockTime24('00:15')).toBe('00:15')
    expect(formatWallClockTime24('23:45')).toBe('23:45')
  })

  it('formats a summer (DST) date as dd/mm/yyyy with no day shift', () => {
    expect(formatWallClockDMY('2026-07-20')).toBe('20/07/2026')
  })

  it('formats a winter (non-DST) date as dd/mm/yyyy with no day shift', () => {
    expect(formatWallClockDMY('2026-01-05')).toBe('05/01/2026')
  })

  it('never introduces a +2-hour (or any) drift for a fixed wall-clock time', () => {
    // A naive Date-based approach (`new Date('2026-07-20T19:00:00')` then
    // Intl-formatted with timeZone: 'Europe/Amsterdam') would shift this by
    // the runtime's local-to-Amsterdam offset. The string-based formatter
    // must return exactly the input, proving no such conversion occurs.
    const start = formatWallClockTime24('19:00')
    const end = formatWallClockTime24('20:30')
    expect(start).toBe('19:00')
    expect(end).toBe('20:30')
  })

  it('returns a placeholder for null/undefined without throwing', () => {
    expect(formatWallClockDMY(null)).toBe('—')
    expect(formatWallClockDMY(undefined)).toBe('—')
    expect(formatWallClockTime24(null)).toBe('—')
  })

  it('extracts the time from a naive datetime with a space separator, no shift', () => {
    expect(formatWallClockTime24('2026-07-23 20:00:00')).toBe('20:00')
    expect(formatWallClockTime24('2026-07-23 22:00:00')).toBe('22:00')
  })

  it('extracts the time from a naive ISO-shaped datetime (T separator), no shift', () => {
    expect(formatWallClockTime24('2026-07-23T20:00:00')).toBe('20:00')
    expect(formatWallClockTime24('2026-07-23T22:00:00')).toBe('22:00')
  })
})
