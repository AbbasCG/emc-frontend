import { toLatinDigits } from '@/utils/publicDetailFormat'

export const formatEnglishNumber = (
  value: number | string | null | undefined,
  options?: Intl.NumberFormatOptions,
): string => {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return toLatinDigits(String(value))
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    ...options,
  }).format(numericValue)
}

/** Whole numbers for counts, IDs, pagination, etc. */
export function formatEnglishCount(value: number | string | null | undefined): string {
  return formatEnglishNumber(value, { maximumFractionDigits: 0 })
}

/** Percentages with Western digits, e.g. 50% or 12.5% */
export function formatEnglishPercent(
  value: number | string | null | undefined,
  fractionDigits = 1,
): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return `${formatEnglishNumber(n, { minimumFractionDigits: 0, maximumFractionDigits: fractionDigits })}%`
}

/** Arabic month names with Western digits — e.g. 9 July 2026 */
export function formatEnglishDate(
  value: string | null | undefined,
  month: 'long' | 'short' = 'long',
): string {
  if (!value?.trim()) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return toLatinDigits(String(value).slice(0, 10))
  try {
    return new Intl.DateTimeFormat('ar', {
      day: 'numeric',
      month,
      year: 'numeric',
      numberingSystem: 'latn',
    }).format(d)
  } catch {
    return toLatinDigits(String(value).slice(0, 10))
  }
}

/** Times like 09:00 with Western digits */
export function formatEnglishTime(value: string | null | undefined): string {
  if (!value?.trim()) return '—'
  const s = value.trim()
  if (/^\d{1,2}:\d{2}/.test(s)) return toLatinDigits(s)
  const parsed = Date.parse(`1970-01-01T${s}`)
  if (Number.isFinite(parsed)) {
    try {
      return new Intl.DateTimeFormat('ar', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        numberingSystem: 'latn',
      }).format(new Date(parsed))
    } catch {
      return toLatinDigits(s)
    }
  }
  return toLatinDigits(s)
}

/**
 * Mixed Arabic text that may embed digits (duration labels, capacity strings, codes).
 * Leaves Arabic letters; normalizes any Eastern Arabic numerals to Western.
 */
export function formatEnglishDetailText(value: unknown): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'number' || (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim()))) {
    return formatEnglishNumber(value)
  }
  const s = String(value).trim()
  return s ? toLatinDigits(s) : '—'
}
