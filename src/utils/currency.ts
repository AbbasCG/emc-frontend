/**
 * Central EUR display formatting for EMC frontend.
 * Always formats as nl-NL (€ 279,00) regardless of the locale hint.
 * The 'ar' locale in browsers produces Arabic-Indic digits (BiDi class AN),
 * which are strongly RTL and flip € to appear after the number even in dir="ltr" containers.
 */

// 'ar' is kept in the type so existing callers don't need changes,
// but formatEuro ignores it and always uses nl-NL.
export type EuroFormatLocale = 'ar' | 'nl-NL'

function coerceNumber(amount: unknown): number | null {
  if (amount === null || amount === undefined || amount === '') return null
  if (typeof amount === 'number') return Number.isFinite(amount) ? amount : null
  const s = String(amount).trim().replace(/\s/g, '').replace(/٬/g, '').replace(/,/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export type FormatEuroOptions = {
  locale?: EuroFormatLocale
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  fallback?: string
}

export function formatEuro(amount: unknown, options?: FormatEuroOptions): string {
  const fallback = options?.fallback ?? '—'
  const n = coerceNumber(amount)
  if (n === null) return fallback
  const minFrac = options?.minimumFractionDigits
  const maxFrac = options?.maximumFractionDigits
  try {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
    }).format(n)
  } catch {
    return `€ ${n}`
  }
}

/** Whole euros — typical for dashboards, KPI tables, finance grids. */
export function formatEuroInteger(amount: unknown, _locale?: EuroFormatLocale): string {
  return formatEuro(amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/** Compact EUR for chart axes / dense KPI chips. */
export function formatEuroCompact(amount: unknown, _locale: EuroFormatLocale | 'en-NL' = 'nl-NL'): string {
  const n = coerceNumber(amount)
  if (n === null) return ''
  try {
    return new Intl.NumberFormat('nl-NL', {
      notation: 'compact',
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 1,
    }).format(n)
  } catch {
    return `€${n}`
  }
}

// ── SAR (Saudi Riyal) ─────────────────────────────────────────────────────────
// U+20C1 is the Saudi Riyal Sign (Unicode 16.0).
// Format: ⃁ 279,00 — symbol, space, nl-NL decimal (comma decimal, period thousands).
const SAR_SIGN = '⃁'

export type FormatSAROptions = {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  fallback?: string
}

export function formatSAR(amount: unknown, options?: FormatSAROptions): string {
  const fallback = options?.fallback ?? '—'
  const n = coerceNumber(amount)
  if (n === null) return fallback
  const minFrac = options?.minimumFractionDigits ?? 2
  const maxFrac = options?.maximumFractionDigits ?? 2
  try {
    const numStr = new Intl.NumberFormat('nl-NL', {
      style: 'decimal',
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
    }).format(n)
    return `${SAR_SIGN} ${numStr}`
  } catch {
    return `${SAR_SIGN} ${n}`
  }
}

export function formatSARInteger(amount: unknown): string {
  return formatSAR(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
