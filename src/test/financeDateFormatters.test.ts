import { describe, it, expect } from 'vitest'
import {
  formatFinanceDate,
  formatFinanceDateOnlyString,
  formatFinanceDateTime,
  formatFinanceTime,
  isFinanceDateOnly,
} from '@/utils/financeDateFormatters'

describe('formatFinanceDateOnlyString', () => {
  it('formats YYYY-MM-DD without timezone shift', () => {
    expect(formatFinanceDateOnlyString('2026-07-13')).toBe('13/07/2026')
  })
})

describe('isFinanceDateOnly', () => {
  it('detects date-only API values', () => {
    expect(isFinanceDateOnly('2026-07-13')).toBe(true)
    expect(isFinanceDateOnly('2026-07-13T22:34:00Z')).toBe(false)
  })
})

describe('formatFinanceDate', () => {
  it('renders DD/MM/YYYY for timestamps in Amsterdam TZ', () => {
    expect(formatFinanceDate('2026-07-13T22:34:00+02:00')).toBe('13/07/2026')
  })

  it('renders DD/MM/YYYY for date-only strings without shift', () => {
    expect(formatFinanceDate('2026-07-13')).toBe('13/07/2026')
  })

  it('returns dash for empty value', () => {
    expect(formatFinanceDate(null)).toBe('—')
  })
})

describe('formatFinanceTime', () => {
  it('renders 24-hour time without AM/PM', () => {
    const time = formatFinanceTime('2026-07-13T22:34:00+02:00')
    expect(time).toMatch(/^\d{2}:\d{2}$/)
    expect(time).not.toMatch(/AM|PM/i)
  })

  it('returns dash for date-only values', () => {
    expect(formatFinanceTime('2026-07-13')).toBe('—')
  })
})

describe('formatFinanceDateTime', () => {
  it('combines date and time with space separator', () => {
    const result = formatFinanceDateTime('2026-07-13T22:34:00+02:00')
    expect(result).toContain('13/07/2026')
    expect(result).toMatch(/13\/07\/2026 \d{2}:\d{2}/)
    expect(result).not.toContain('·')
    expect(result).not.toMatch(/AM|PM/i)
  })

  it('omits time for date-only values', () => {
    expect(formatFinanceDateTime('2026-07-13')).toBe('13/07/2026')
  })
})
