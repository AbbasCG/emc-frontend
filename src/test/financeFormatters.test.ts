import { describe, it, expect } from 'vitest'
import {
  formatMoney,
  formatDateDDMMYYYY,
  formatTime24,
  formatFinanceDateTime,
} from '@/utils/financeFormatters'
import {
  getTransactionStatusLabel,
  getTransactionStatusVariant,
} from '@/utils/transactionStatusLabels'

describe('formatMoney', () => {
  it('formats EUR with symbol before amount and comma decimals', () => {
    expect(formatMoney(60, 'EUR')).toBe('€ 60,00')
    expect(formatMoney(0, 'EUR')).toBe('€ 0,00')
    expect(formatMoney(50, 'EUR')).toBe('€ 50,00')
    expect(formatMoney(199, 'EUR')).toBe('€ 199,00')
  })

  it('formats SAR with riyal sign', () => {
    expect(formatMoney(279, 'SAR')).toBe('⃁ 279,00')
  })

  it('returns fallback for invalid amount', () => {
    expect(formatMoney(null, 'EUR')).toBe('—')
    expect(formatMoney('not-a-number', 'EUR')).toBe('—')
  })

  it('keeps symbol and amount together for display', () => {
    const formatted = formatMoney(60, 'EUR')
    expect(formatted.startsWith('€ ')).toBe(true)
    expect(formatted.includes('60,00')).toBe(true)
  })
})

describe('formatDateDDMMYYYY alias', () => {
  it('renders Arabic long-month date', () => {
    const result = formatDateDDMMYYYY('2026-07-04')
    expect(result).toMatch(/04/)
    expect(result).toMatch(/2026/)
  })

  it('returns dash for empty value', () => {
    expect(formatDateDDMMYYYY(null)).toBe('—')
  })
})

describe('formatTime24', () => {
  it('renders 24-hour time without AM/PM', () => {
    const time = formatTime24('2026-07-04T22:34:00+02:00')
    expect(time).toMatch(/^\d{2}:\d{2}$/)
    expect(time).not.toMatch(/AM|PM/i)
  })
})

describe('formatFinanceDateTime', () => {
  it('includes Arabic date and 24h time for timestamps', () => {
    const result = formatFinanceDateTime('2026-07-04T22:34:00+02:00')
    expect(result).toMatch(/2026/)
    expect(result).toMatch(/\d{2}:\d{2}/)
    expect(result).not.toMatch(/AM|PM/i)
  })
})

describe('getTransactionStatusLabel', () => {
  it('maps backend payment statuses to Arabic', () => {
    expect(getTransactionStatusLabel('pending_payment')).toBe('بانتظار الدفع')
    expect(getTransactionStatusLabel('payment_failed')).toBe('فشل الدفع')
    expect(getTransactionStatusLabel('payment_confirmed')).toBe('تم تأكيد الدفع')
  })

  it('returns unknown for unrecognized status', () => {
    expect(getTransactionStatusLabel('some_legacy_key')).toBe('غير معروف')
    expect(getTransactionStatusLabel(null)).toBe('غير معروف')
  })
})

describe('getTransactionStatusVariant', () => {
  it('assigns semantic variants', () => {
    expect(getTransactionStatusVariant('pending_payment')).toBe('amber')
    expect(getTransactionStatusVariant('payment_confirmed')).toBe('green')
    expect(getTransactionStatusVariant('payment_failed')).toBe('red')
    expect(getTransactionStatusVariant('refunded')).toBe('purple')
    expect(getTransactionStatusVariant('cancelled')).toBe('gray')
  })
})
