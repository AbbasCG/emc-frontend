import { describe, it, expect } from 'vitest'
import {
  formatFinanceDate,
  formatFinanceDateTime,
  formatFinanceTime,
  isFinanceDateOnly,
} from '@/utils/financeDateFormatters'

describe('isFinanceDateOnly', () => {
  it('detects date-only API values', () => {
    expect(isFinanceDateOnly('2026-07-04')).toBe(true)
    expect(isFinanceDateOnly('2026-07-04T22:34:00Z')).toBe(false)
  })
})

describe('formatFinanceDate', () => {
  it('renders Arabic long month with English digits for date-only values', () => {
    const result = formatFinanceDate('2026-07-04')
    expect(result).toMatch(/04/)
    expect(result).toMatch(/2026/)
    expect(result).toMatch(/يوليو|يوليو/)
    expect(result).not.toMatch(/\//)
  })

  it('does not shift date-only calendar day', () => {
    expect(formatFinanceDate('2026-07-04')).toContain('04')
  })

  it('returns dash for empty value', () => {
    expect(formatFinanceDate(null)).toBe('—')
  })
})

describe('formatFinanceTime', () => {
  it('renders 24-hour time without AM/PM', () => {
    const time = formatFinanceTime('2026-07-04T22:34:00+02:00')
    expect(time).toMatch(/^\d{2}:\d{2}$/)
    expect(time).not.toMatch(/AM|PM/i)
  })

  it('returns dash for date-only values', () => {
    expect(formatFinanceTime('2026-07-04')).toBe('—')
  })
})

describe('formatFinanceDateTime', () => {
  it('combines Arabic date and 24h time for exports', () => {
    const result = formatFinanceDateTime('2026-07-04T22:34:00+02:00')
    expect(result).toMatch(/2026/)
    expect(result).toMatch(/\d{2}:\d{2}/)
    expect(result).not.toMatch(/AM|PM/i)
  })

  it('omits time for date-only values', () => {
    const result = formatFinanceDateTime('2026-07-04')
    expect(result).not.toMatch(/:\d{2}/)
  })
})
