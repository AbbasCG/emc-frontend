import { describe, expect, it } from 'vitest'
import { formatDateTime24, formatTime24, toDate } from '@/utils/time24'
import { formatDateTime as ticketFormatDateTime } from '@/components/tickets/ops/ticketOpsUi'
import { formatDue } from '@/lib/dueDate'

// Offsets are explicit so the assertions do not depend on the machine's zone: the zone is passed to the formatter.
const AMS = 'Europe/Amsterdam'

describe('formatTime24', () => {
  it('prints 24-hour HH:mm: 22:28, never «10:28 م»', () => {
    // 21:28 UTC in November is 22:28 in Amsterdam (UTC+1).
    const out = formatTime24('2026-11-26T21:28:00Z', { timeZone: AMS })

    expect(out).toBe('22:28')
    expect(out).not.toMatch(/[صم]/)
  })

  it('shows midnight as 00:05, never 24:05 or 12:05', () => {
    expect(formatTime24('2026-11-25T23:05:00Z', { timeZone: AMS })).toBe('00:05')
    expect(formatTime24('2026-11-26T00:05:00Z', { timeZone: 'UTC' })).toBe('00:05')
  })

  it('shows noon as 12:00 and the early afternoon as 13:xx', () => {
    expect(formatTime24('2026-11-26T12:00:00Z', { timeZone: 'UTC' })).toBe('12:00')
    expect(formatTime24('2026-11-26T13:07:00Z', { timeZone: 'UTC' })).toBe('13:07')
  })

  it('pads single-digit hours and minutes', () => {
    expect(formatTime24('2026-11-26T07:03:00Z', { timeZone: 'UTC' })).toBe('07:03')
  })

  it('converts to the requested time zone (the same instant reads differently in two zones)', () => {
    const instant = '2026-07-01T20:30:00Z'

    expect(formatTime24(instant, { timeZone: 'UTC' })).toBe('20:30')
    // Amsterdam is UTC+2 in July (summer time).
    expect(formatTime24(instant, { timeZone: AMS })).toBe('22:30')
    expect(formatTime24(instant, { timeZone: 'Asia/Riyadh' })).toBe('23:30')
  })

  it('uses Latin digits by default and the caller\'s digits when it asks', () => {
    expect(formatTime24('2026-11-26T21:28:00Z', { timeZone: 'UTC' })).toMatch(/^[0-9]{2}:[0-9]{2}$/)
    expect(formatTime24('2026-11-26T21:28:00Z', { timeZone: 'UTC', locale: 'ar-EG' })).toMatch(/^[٠-٩]{2}:[٠-٩]{2}$/)
  })

  it('accepts a Date and an epoch, and does not change them', () => {
    const d = new Date('2026-11-26T22:28:00Z')
    const before = d.getTime()

    expect(formatTime24(d, { timeZone: 'UTC' })).toBe('22:28')
    expect(formatTime24(before, { timeZone: 'UTC' })).toBe('22:28')
    expect(d.getTime()).toBe(before)
  })

  it('answers «—» for an empty, unparsable or invalid value, and for an unknown zone', () => {
    expect(formatTime24(null)).toBe('—')
    expect(formatTime24(undefined)).toBe('—')
    expect(formatTime24('')).toBe('—')
    expect(formatTime24('not a date')).toBe('—')
    expect(formatTime24(new Date('nope'))).toBe('—')
    expect(formatTime24('2026-11-26T21:28:00Z', { timeZone: 'Mars/Olympus' })).toBe('—')
  })
})

describe('formatDateTime24', () => {
  it('puts the date and the 24-hour time together, with no «ص» / «م»', () => {
    const out = formatDateTime24('2026-11-26T21:28:00Z', { timeZone: 'UTC' })

    expect(out).toContain('21:28')
    expect(out).toContain('2026')
    expect(out).not.toMatch(/[صم]\s*$/)
    expect(out).not.toContain('م')
  })

  it('shows midnight as 00:xx on the right day', () => {
    const out = formatDateTime24('2026-11-26T00:05:00Z', { timeZone: 'UTC' })

    expect(out).toContain('00:05')
    expect(out).toContain('26')
  })

  it('is «—» for invalid input', () => {
    expect(formatDateTime24('garbage')).toBe('—')
    expect(formatDateTime24(null)).toBe('—')
  })
})

describe('toDate', () => {
  it('returns null for anything that is not a real instant', () => {
    expect(toDate('')).toBeNull()
    expect(toDate('x')).toBeNull()
    expect(toDate(null)).toBeNull()
    expect(toDate('2026-11-26T00:00:00Z')?.toISOString()).toBe('2026-11-26T00:00:00.000Z')
  })
})

describe('the shared formatter is what the ticket and board pages use', () => {
  it('ticketOpsUi.formatDateTime has no «ص» / «م» (afternoon and morning)', () => {
    // Local zone on purpose (the pages show the viewer's zone); both instants are away from midnight in any zone.
    for (const iso of ['2026-11-26T10:28:00Z', '2026-11-26T21:28:00Z', '2026-11-26T03:00:00Z']) {
      const out = ticketFormatDateTime(iso)

      expect(out).not.toMatch(/\s[صم]$/)
      expect(out).toMatch(/\d{2}:\d{2}$/)
    }
  })

  it('formatDue (board cards) shows a due time in 24h and a date-only due as a day alone', () => {
    expect(formatDue('2026-11-26T21:28:00Z')).toMatch(/\d{2}:\d{2}$/)
    expect(formatDue('2026-11-26T21:28:00Z')).not.toMatch(/\s[صم]$/)
    expect(formatDue('2026-11-30T00:00:00.000000Z')).not.toMatch(/\d{2}:\d{2}/)
  })
})
