import {
  formatFinanceCurrencyInteger,
  formatFinanceDate,
  formatFinanceDateTimeParts,
  formatMoney,
} from '@/utils/financeFormatters'

export function formatTxAmount(amount: number, currency = 'EUR'): string {
  return formatMoney(amount, currency)
}

export function formatTxAmountCompact(amount: number): string {
  return formatFinanceCurrencyInteger(amount)
}

/** Date-only fields (payment_date, due_date, invoice_date). */
export function formatTxDateOnly(iso: string | null | undefined): string {
  return formatFinanceDate(iso)
}

/** Timestamp fields — separate date and time parts for stacked layouts. */
export function formatTxDate(iso: string | null | undefined): { date: string; time: string } {
  return formatFinanceDateTimeParts(iso)
}

export function formatTxDateTime(iso: string | null | undefined): string {
  const { date, time } = formatFinanceDateTimeParts(iso)
  if (!time) return date
  return `${date}\n${time}`
}

export function txInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '?'
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function shortTxId(id: number): string {
  return `#${String(id).padStart(5, '0')}`
}
