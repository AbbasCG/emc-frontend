import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { CalendarEventRecord } from '@/types/phase7'
import {
  CALENDAR_VIEW_STORAGE_KEY,
  VIEW_OPTIONS,
  WEEKDAY_LABELS,
  TIMELINE_HOURS,
  readStoredCalendarView,
  persistCalendarView,
  getDayKey,
  dayKeyFromIso,
  dateFromParts,
  startOfWeek,
  buildMonthGrid,
  buildWeekDays,
  formatMonthTitle,
  formatDayTitle,
  formatWeekTitle,
  groupEventsByDayKey,
  getHourInTz,
  addMonths,
  addWeeks,
  addDays,
} from '@/utils/calendarGrid'
import { generateSecurePassword } from '@/utils/passwordGenerator'

/** Pinned to Thursday 16 July 2026, 12:00 Europe/Amsterdam. */
const NOW = '2026-07-16T10:00:00Z'

const ALLOWED_PASSWORD_CHARS =
  /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+=?-]+$/

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW))
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})

const makeEvent = (over: Partial<CalendarEventRecord>): CalendarEventRecord =>
  ({
    id: 'e1',
    type: 'session',
    title: 'جلسة',
    start_at: '2026-07-16T08:00:00Z',
    status: 'scheduled',
    visibility: 'all',
    can_edit: false,
    can_join: false,
    ...over,
  }) as CalendarEventRecord

// ── constants ────────────────────────────────────────────────────────────────

describe('calendar constants', () => {
  it('lists the four view modes in order', () => {
    expect(VIEW_OPTIONS.map((v) => v.id)).toEqual(['list', 'month', 'week', 'day'])
    expect(VIEW_OPTIONS.every((v) => v.label.trim().length > 0)).toBe(true)
  })

  it('labels the seven weekdays starting on Sunday, matching the grid order', () => {
    expect(WEEKDAY_LABELS).toHaveLength(7)
    expect(WEEKDAY_LABELS[0]).toBe('الأحد')
    expect(WEEKDAY_LABELS[1]).toBe('الاثنين')
    expect(WEEKDAY_LABELS[2]).toBe('الثلاثاء')
    expect(WEEKDAY_LABELS[4]).toBe('الخميس')
    expect(WEEKDAY_LABELS[5]).toBe('الجمعة')
    expect(WEEKDAY_LABELS[6]).toBe('السبت')
  })

  it('spells every weekday header correctly', () => {
    // Regression: WEEKDAY_LABELS[3] used to read "الربيعاء", which is not a word.
    // These labels are rendered verbatim as column headers on every calendar view.
    expect(WEEKDAY_LABELS[3]).toBe('الأربعاء')
    expect(WEEKDAY_LABELS).toEqual([
      'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت',
    ])
  })

  it('covers a 06:00–22:00 timeline', () => {
    expect(TIMELINE_HOURS).toHaveLength(17)
    expect(TIMELINE_HOURS[0]).toBe(6)
    expect(TIMELINE_HOURS[TIMELINE_HOURS.length - 1]).toBe(22)
  })
})

// ── stored view preference ───────────────────────────────────────────────────

describe('readStoredCalendarView / persistCalendarView', () => {
  it('defaults to the list view when nothing is stored', () => {
    expect(readStoredCalendarView()).toBe('list')
  })

  it('round-trips each valid view mode through localStorage', () => {
    for (const mode of ['list', 'month', 'week', 'day'] as const) {
      persistCalendarView(mode)
      expect(localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY)).toBe(mode)
      expect(readStoredCalendarView()).toBe(mode)
    }
  })

  it('ignores a corrupted stored value', () => {
    localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, 'timeline')
    expect(readStoredCalendarView()).toBe('list')
    localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, '')
    expect(readStoredCalendarView()).toBe('list')
  })

  it('falls back to the list view when storage access throws (private mode)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied')
    })
    expect(readStoredCalendarView()).toBe('list')
  })

  it('swallows a write failure instead of crashing the calendar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    expect(() => { persistCalendarView('month') }).not.toThrow()
  })
})

// ── day keys ─────────────────────────────────────────────────────────────────

describe('getDayKey / dayKeyFromIso / dateFromParts', () => {
  it('produces a zero-padded YYYY-MM-DD key in Amsterdam time', () => {
    expect(getDayKey(dateFromParts(2026, 7, 6))).toBe('2026-07-06')
    expect(getDayKey(dateFromParts(2026, 1, 1))).toBe('2026-01-01')
  })

  it('rolls a late-evening UTC instant onto the next Amsterdam day', () => {
    expect(dayKeyFromIso('2026-07-16T22:15:00Z')).toBe('2026-07-17')
  })

  it('rolls a late-evening winter instant too (CET, UTC+1)', () => {
    expect(dayKeyFromIso('2026-01-15T23:30:00Z')).toBe('2026-01-16')
  })

  it('keeps a midday instant on its own day', () => {
    expect(dayKeyFromIso('2026-07-16T10:00:00Z')).toBe('2026-07-16')
  })

  it('returns an empty key for an unparseable ISO string', () => {
    expect(dayKeyFromIso('not-a-date')).toBe('')
    expect(dayKeyFromIso('')).toBe('')
  })
})

describe('startOfWeek', () => {
  it('walks back to the preceding Sunday', () => {
    expect(getDayKey(startOfWeek(dateFromParts(2026, 7, 16)))).toBe('2026-07-12')
  })

  it('is idempotent on a Sunday', () => {
    const sunday = dateFromParts(2026, 7, 12)
    expect(getDayKey(startOfWeek(sunday))).toBe('2026-07-12')
    expect(getDayKey(startOfWeek(startOfWeek(sunday)))).toBe('2026-07-12')
  })

  it('crosses a month boundary when the week starts in the previous month', () => {
    expect(getDayKey(startOfWeek(dateFromParts(2026, 7, 1)))).toBe('2026-06-28')
  })

  it('crosses a year boundary', () => {
    // 1 Jan 2026 is a Thursday → the week starts 28 Dec 2025.
    expect(getDayKey(startOfWeek(dateFromParts(2026, 1, 1)))).toBe('2025-12-28')
  })
})

// ── month grid ───────────────────────────────────────────────────────────────

const leading = (cells: { inMonth: boolean }[]) => cells.findIndex((c) => c.inMonth)
const inMonthCount = (cells: { inMonth: boolean }[]) => cells.filter((c) => c.inMonth).length

describe('buildMonthGrid', () => {
  it('always returns a 6×7 grid of 42 unique consecutive days', () => {
    for (const [y, m] of [
      [2026, 7],
      [2024, 2],
      [2025, 2],
      [2026, 3],
      [2026, 10],
      [2026, 12],
    ] as const) {
      const cells = buildMonthGrid(dateFromParts(y, m, 1))
      expect(cells).toHaveLength(42)
      expect(new Set(cells.map((c) => c.key)).size).toBe(42)
      for (let i = 1; i < cells.length; i++) {
        const prev = cells[i - 1]!.date.getTime()
        const cur = cells[i]!.date.getTime()
        expect(cur - prev).toBe(86_400_000)
      }
    }
  })

  it('starts on the Sunday before the 1st and pads the tail', () => {
    const cells = buildMonthGrid(dateFromParts(2026, 7, 15))
    expect(cells[0]!.key).toBe('2026-06-28')
    expect(cells[41]!.key).toBe('2026-08-08')
    expect(leading(cells)).toBe(3)
    expect(inMonthCount(cells)).toBe(31)
    expect(cells.filter((c) => !c.inMonth)).toHaveLength(11)
  })

  it('emits no leading pad when the month already starts on a Sunday', () => {
    // 1 March 2026 is a Sunday.
    const cells = buildMonthGrid(dateFromParts(2026, 3, 10))
    expect(leading(cells)).toBe(0)
    expect(cells[0]!.key).toBe('2026-03-01')
    expect(inMonthCount(cells)).toBe(31)
  })

  it('includes 29 February in a leap year', () => {
    const cells = buildMonthGrid(dateFromParts(2024, 2, 1))
    expect(inMonthCount(cells)).toBe(29)
    expect(cells.map((c) => c.key)).toContain('2024-02-29')
    expect(leading(cells)).toBe(4)
    expect(cells[0]!.key).toBe('2024-01-28')
  })

  it('has only 28 in-month days in a non-leap February', () => {
    const cells = buildMonthGrid(dateFromParts(2025, 2, 1))
    expect(inMonthCount(cells)).toBe(28)
    expect(cells.map((c) => c.key)).not.toContain('2025-02-29')
    expect(leading(cells)).toBe(6)
  })

  it('does not duplicate or skip a day across the spring DST change', () => {
    // Europe/Amsterdam springs forward on 29 March 2026.
    const keys = buildMonthGrid(dateFromParts(2026, 3, 1)).map((c) => c.key)
    expect(keys).toContain('2026-03-28')
    expect(keys).toContain('2026-03-29')
    expect(keys).toContain('2026-03-30')
    expect(new Set(keys).size).toBe(42)
  })

  it('does not duplicate or skip a day across the autumn DST change', () => {
    // Europe/Amsterdam falls back on 25 October 2026.
    const keys = buildMonthGrid(dateFromParts(2026, 10, 1)).map((c) => c.key)
    expect(keys).toContain('2026-10-24')
    expect(keys).toContain('2026-10-25')
    expect(keys).toContain('2026-10-26')
    expect(new Set(keys).size).toBe(42)
  })

  it('flags exactly one cell as today when the pinned date is in range', () => {
    const cells = buildMonthGrid(dateFromParts(2026, 7, 1))
    const today = cells.filter((c) => c.isToday)
    expect(today).toHaveLength(1)
    expect(today[0]!.key).toBe('2026-07-16')
  })

  it('flags no cell as today for an unrelated month', () => {
    expect(buildMonthGrid(dateFromParts(2024, 2, 1)).some((c) => c.isToday)).toBe(false)
  })

  it('marks the December grid correctly across the year boundary', () => {
    const cells = buildMonthGrid(dateFromParts(2026, 12, 1))
    expect(inMonthCount(cells)).toBe(31)
    expect(cells.map((c) => c.key)).toContain('2027-01-01')
    expect(cells.find((c) => c.key === '2027-01-01')?.inMonth).toBe(false)
  })
})

// ── week / titles ────────────────────────────────────────────────────────────

describe('buildWeekDays', () => {
  it('returns seven consecutive days starting on Sunday', () => {
    const days = buildWeekDays(dateFromParts(2026, 7, 16))
    expect(days.map((d) => d.key)).toEqual([
      '2026-07-12',
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
      '2026-07-18',
    ])
  })

  it('labels each day in Arabic with Latin digits', () => {
    const days = buildWeekDays(dateFromParts(2026, 7, 16))
    expect(days[0]!.label).toBe('الأحد، 12 يوليو')
    expect(days.every((d) => !/[٠-٩]/.test(d.label))).toBe(true)
  })

  it('flags exactly the pinned day as today', () => {
    const days = buildWeekDays(dateFromParts(2026, 7, 16))
    expect(days.filter((d) => d.isToday).map((d) => d.key)).toEqual(['2026-07-16'])
  })
})

describe('calendar titles', () => {
  it('formats a month title as month + year', () => {
    expect(formatMonthTitle(dateFromParts(2026, 7, 1))).toBe('يوليو 2026')
  })

  it('formats a day title with the weekday name', () => {
    expect(formatDayTitle(dateFromParts(2026, 7, 16))).toBe('الخميس، 16 يوليو 2026')
  })

  it('formats a week title as a dash-joined range', () => {
    expect(formatWeekTitle(dateFromParts(2026, 7, 16))).toBe('12 يوليو — 18 يوليو 2026')
  })

  it('spans two months in a week title when the week straddles a boundary', () => {
    expect(formatWeekTitle(dateFromParts(2026, 7, 1))).toBe('28 يونيو — 4 يوليو 2026')
  })
})

// ── grouping / hours / arithmetic ────────────────────────────────────────────

describe('groupEventsByDayKey', () => {
  it('buckets events by their Amsterdam calendar day', () => {
    const map = groupEventsByDayKey([
      makeEvent({ id: 'a', start_at: '2026-07-16T08:00:00Z' }),
      makeEvent({ id: 'b', start_at: '2026-07-16T22:15:00Z' }), // → 17 July local
      makeEvent({ id: 'c', start_at: '2026-07-16T06:00:00Z' }),
    ])
    expect([...map.keys()].sort()).toEqual(['2026-07-16', '2026-07-17'])
    expect(map.get('2026-07-16')?.map((e) => e.id)).toEqual(['c', 'a'])
    expect(map.get('2026-07-17')?.map((e) => e.id)).toEqual(['b'])
  })

  it('sorts each bucket chronologically regardless of input order', () => {
    const map = groupEventsByDayKey([
      makeEvent({ id: 'late', start_at: '2026-07-16T15:00:00Z' }),
      makeEvent({ id: 'early', start_at: '2026-07-16T07:00:00Z' }),
      makeEvent({ id: 'mid', start_at: '2026-07-16T11:00:00Z' }),
    ])
    expect(map.get('2026-07-16')?.map((e) => e.id)).toEqual(['early', 'mid', 'late'])
  })

  it('drops events whose start_at cannot be parsed', () => {
    const map = groupEventsByDayKey([
      makeEvent({ id: 'ok' }),
      makeEvent({ id: 'bad', start_at: 'nonsense' }),
      makeEvent({ id: 'blank', start_at: '' }),
    ])
    expect([...map.values()].flat().map((e) => e.id)).toEqual(['ok'])
  })

  it('returns an empty map for an empty list', () => {
    expect(groupEventsByDayKey([]).size).toBe(0)
  })
})

describe('getHourInTz', () => {
  it('converts a UTC instant to the Amsterdam hour in summer (UTC+2)', () => {
    expect(getHourInTz('2026-07-16T12:30:00Z')).toBe(14)
  })

  it('converts a UTC instant to the Amsterdam hour in winter (UTC+1)', () => {
    expect(getHourInTz('2026-01-15T12:30:00Z')).toBe(13)
  })

  it('returns 0 for midnight rather than a falsy surprise', () => {
    expect(getHourInTz('2026-07-16T22:30:00Z')).toBe(0)
  })
})

describe('addMonths / addWeeks / addDays', () => {
  it('addMonths anchors on the first of the resulting month', () => {
    expect(getDayKey(addMonths(dateFromParts(2026, 7, 15), 1))).toBe('2026-08-01')
    expect(getDayKey(addMonths(dateFromParts(2026, 7, 15), 0))).toBe('2026-07-01')
  })

  it('addMonths crosses year boundaries in both directions', () => {
    expect(getDayKey(addMonths(dateFromParts(2026, 12, 15), 1))).toBe('2027-01-01')
    expect(getDayKey(addMonths(dateFromParts(2026, 1, 15), -1))).toBe('2025-12-01')
    expect(getDayKey(addMonths(dateFromParts(2026, 6, 15), -13))).toBe('2025-05-01')
  })

  it('addWeeks shifts by whole weeks in both directions', () => {
    expect(getDayKey(addWeeks(dateFromParts(2026, 7, 16), 2))).toBe('2026-07-30')
    expect(getDayKey(addWeeks(dateFromParts(2026, 7, 16), -1))).toBe('2026-07-09')
  })

  it('addDays crosses month, leap-day and year boundaries', () => {
    expect(getDayKey(addDays(dateFromParts(2026, 7, 31), 1))).toBe('2026-08-01')
    expect(getDayKey(addDays(dateFromParts(2024, 2, 28), 1))).toBe('2024-02-29')
    expect(getDayKey(addDays(dateFromParts(2025, 2, 28), 1))).toBe('2025-03-01')
    expect(getDayKey(addDays(dateFromParts(2026, 12, 31), 1))).toBe('2027-01-01')
    expect(getDayKey(addDays(dateFromParts(2026, 1, 1), -1))).toBe('2025-12-31')
  })

  it('never mutates the date it is given', () => {
    const anchor = dateFromParts(2026, 7, 16)
    const before = anchor.getTime()
    addDays(anchor, 5)
    addWeeks(anchor, 5)
    addMonths(anchor, 5)
    expect(anchor.getTime()).toBe(before)
  })
})

// ── passwordGenerator ────────────────────────────────────────────────────────

describe('generateSecurePassword', () => {
  it('defaults to 14 characters', () => {
    expect(generateSecurePassword()).toHaveLength(14)
  })

  it('honours a requested length inside the 12–16 range', () => {
    expect(generateSecurePassword(12)).toHaveLength(12)
    expect(generateSecurePassword(13)).toHaveLength(13)
    expect(generateSecurePassword(16)).toHaveLength(16)
  })

  it('clamps below-minimum and above-maximum requests', () => {
    expect(generateSecurePassword(1)).toHaveLength(12)
    expect(generateSecurePassword(0)).toHaveLength(12)
    expect(generateSecurePassword(-5)).toHaveLength(12)
    expect(generateSecurePassword(99)).toHaveLength(16)
  })

  it('floors a fractional length', () => {
    expect(generateSecurePassword(13.9)).toHaveLength(13)
  })

  it('always contains an uppercase, a lowercase, a digit and a symbol', () => {
    for (let i = 0; i < 200; i++) {
      const pw = generateSecurePassword()
      expect(pw).toMatch(/[A-Z]/)
      expect(pw).toMatch(/[a-z]/)
      expect(pw).toMatch(/[0-9]/)
      expect(pw).toMatch(/[!@#$%&*+=?-]/)
    }
  })

  it('never emits visually ambiguous characters (I O l 0 1)', () => {
    for (let i = 0; i < 200; i++) {
      const pw = generateSecurePassword(16)
      expect(pw).toMatch(ALLOWED_PASSWORD_CHARS)
      expect(pw).not.toMatch(/[IOl01]/)
    }
  })

  it('produces distinct passwords across repeated calls', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateSecurePassword()))
    expect(seen.size).toBeGreaterThanOrEqual(195)
  })

  it('does not place the guaranteed classes in a fixed position', () => {
    // With a real CSPRNG the required chars are shuffled, so the first
    // character is not always an uppercase letter.
    const firsts = new Set(Array.from({ length: 200 }, () => generateSecurePassword()[0]))
    expect(firsts.size).toBeGreaterThan(1)
  })

  it('derives every character from the injected randomness source', () => {
    // A stubbed RNG that always yields index 0 makes the whole algorithm —
    // required chars, filler and the Fisher–Yates shuffle — fully predictable.
    vi.stubGlobal('crypto', {
      getRandomValues: (buf: Uint32Array) => {
        buf[0] = 0
        return buf
      },
    })
    expect(generateSecurePassword(14)).toBe(`a2!${'A'.repeat(11)}`)
  })

  it('still satisfies the length contract with a degenerate RNG', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (buf: Uint32Array) => {
        buf[0] = 0
        return buf
      },
    })
    expect(generateSecurePassword(16)).toHaveLength(16)
    expect(generateSecurePassword(12)).toHaveLength(12)
  })
})
