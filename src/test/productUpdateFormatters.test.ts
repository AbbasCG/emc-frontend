import { describe, it, expect } from 'vitest'
import {
  formatProductUpdateDate,
  formatProductUpdateDateTime,
  formatProductUpdateTime,
  formatProductUpdateTimeRange,
} from '@/utils/productUpdateFormatters'

describe('formatProductUpdateDate', () => {
  it('formats as DD/MM/YYYY with English digits', () => {
    expect(formatProductUpdateDate('2026-07-13T22:01:00+02:00')).toBe('13/07/2026')
    expect(formatProductUpdateDate('2027-01-01')).toBe('01/01/2027')
  })

  it('returns dash for empty values', () => {
    expect(formatProductUpdateDate(null)).toBe('—')
  })
})

describe('formatProductUpdateDateTime', () => {
  it('formats as DD/MM/YYYY HH:mm in 24-hour time', () => {
    const result = formatProductUpdateDateTime('2026-07-13T22:01:00+02:00')
    expect(result).toMatch(/^13\/07\/2026 \d{2}:\d{2}$/)
    expect(result).not.toMatch(/PM|AM|م|ص/)
  })
})

describe('formatProductUpdateTime', () => {
  it('uses 24-hour format', () => {
    const result = formatProductUpdateTime('2026-07-13T22:01:00+02:00')
    expect(result).toMatch(/^\d{2}:\d{2}$/)
    expect(result).not.toMatch(/PM|AM/)
  })
})

describe('formatProductUpdateTimeRange', () => {
  it('shows date once with time range on same day', () => {
    const result = formatProductUpdateTimeRange(
      '2026-07-13T22:01:00+02:00',
      '2026-07-13T23:30:00+02:00',
    )
    expect(result.startsWith('13/07/2026')).toBe(true)
    expect(result).toContain('–')
  })
})
