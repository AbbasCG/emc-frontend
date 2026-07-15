/**
 * Central finance number, currency, and datetime formatting for EMC dashboards.
 * UI language stays Arabic/RTL; numeric values always use Western digits.
 * Currency display: € 60,00 (symbol, space, nl-NL amount with comma decimals).
 * Datetime display: 04 يوليو 2026 + separate 23:45 line — see financeDateFormatters.ts.
 */

export {
  FINANCE_TZ,
  formatFinanceDate,
  formatFinanceDateOnlyString,
  formatFinanceDateTime,
  formatFinanceDateTimeParts,
  formatFinanceTime,
  isFinanceDateOnly,
  toValidDate,
  FINANCE_DATE_CLASS,
} from '@/utils/financeDateFormatters'

import {
  formatFinanceDate,
  formatFinanceTime,
} from '@/utils/financeDateFormatters'

export const FINANCE_LOCALE = 'en-GB' as const
export const FINANCE_CURRENCY_LOCALE = 'nl-NL' as const

const EURO_SYMBOL = '€'
const SAR_SIGN = '⃁'

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: EURO_SYMBOL,
  USD: '$',
  GBP: '£',
  SAR: SAR_SIGN,
  TRY: '₺',
}

function coerceFinanceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const s = String(value).trim().replace(/\s/g, '').replace(/٬/g, '').replace(/,/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function formatCurrencyAmount(
  value: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  return new Intl.NumberFormat(FINANCE_CURRENCY_LOCALE, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(value)
}

export function formatFinanceNumber(
  value: number | string | null | undefined,
  options?: Intl.NumberFormatOptions,
): string {
  const numericValue = Number(value ?? 0)

  if (!Number.isFinite(numericValue)) {
    return '0'
  }

  return new Intl.NumberFormat(FINANCE_LOCALE, {
    maximumFractionDigits: 2,
    ...options,
  }).format(numericValue)
}

/** Whole numbers for counts, pagination, KPI totals, etc. */
export function formatFinanceCount(value: number | string | null | undefined): string {
  return formatFinanceNumber(value, { maximumFractionDigits: 0, minimumFractionDigits: 0 })
}

export type FormatFinanceCurrencyOptions = {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  fallback?: string
}

/**
 * Canonical finance money formatter.
 * EUR → € 60,00 · SAR → ⃁ 279,00
 */
export function formatMoney(
  value: number | string | null | undefined,
  currency = 'EUR',
  options?: FormatFinanceCurrencyOptions,
): string {
  const fallback = options?.fallback ?? '—'
  const numericValue = coerceFinanceNumber(value)
  if (numericValue === null) return fallback

  const code = currency.toUpperCase()
  const formatted = formatCurrencyAmount(numericValue, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  })

  if (code === 'EUR') return `${EURO_SYMBOL} ${formatted}`
  if (code === 'SAR') return `${SAR_SIGN} ${formatted}`

  const symbol = CURRENCY_SYMBOLS[code] ?? code
  return `${symbol} ${formatted}`
}

export function formatFinanceCurrency(
  value: number | string | null | undefined,
  options?: FormatFinanceCurrencyOptions,
): string {
  return formatMoney(value, 'EUR', options)
}

/** Finance dashboards and tables — always two decimal places. */
export function formatFinanceCurrencyInteger(
  value: number | string | null | undefined,
): string {
  return formatMoney(value, 'EUR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Compact EUR for chart axes and dense chips. */
export function formatFinanceCurrencyCompact(
  value: number | string | null | undefined,
): string {
  const numericValue = coerceFinanceNumber(value)
  if (numericValue === null) return ''
  try {
    const compact = new Intl.NumberFormat(FINANCE_CURRENCY_LOCALE, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(numericValue)
    return `${EURO_SYMBOL} ${compact}`
  } catch {
    return formatFinanceCurrencyInteger(value)
  }
}

/** Non-EUR amounts in finance screens — same digit rules, symbol before amount. */
export function formatFinanceForeignCurrency(
  amount: number | string | null | undefined,
  currency = 'EUR',
  options?: FormatFinanceCurrencyOptions,
): string {
  return formatMoney(amount, currency, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    fallback: options?.fallback,
  })
}

export function formatFinanceSAR(
  amount: number | string | null | undefined,
  options?: FormatFinanceCurrencyOptions,
): string {
  return formatMoney(amount, 'SAR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  })
}

/** Percentages with English digits, e.g. 50% or 12.5% */
export function formatFinancePercent(
  value: number | string | null | undefined,
  fractionDigits = 0,
): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${formatFinanceNumber(n, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`
}

/** @deprecated Use formatFinanceDate — kept for backward compatibility. */
export const formatDateDDMMYYYY = formatFinanceDate

/** @deprecated Use formatFinanceTime — kept for backward compatibility. */
export const formatTime24 = formatFinanceTime

/** Professional empty-state label for missing finance account references. */
export const FINANCE_ACCOUNT_EMPTY_LABEL = 'غير محدد'
