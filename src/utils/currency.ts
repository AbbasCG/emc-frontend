/**
 * Central EUR display formatting for EMC frontend.
 * API amounts are assumed to be numeric values in euros (or legacy values shown as EUR in UI only).
 */

export type EuroFormatLocale = 'ar' | 'nl-NL'

function coerceNumber(amount: unknown): number | null {
  if (amount === null || amount === undefined || amount === '') return null
  if (typeof amount === 'number') return Number.isFinite(amount) ? amount : null
  const s = String(amount).trim().replace(/\s/g, '').replace(/\u066C/g, '').replace(/,/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function inferEuroLocale(): EuroFormatLocale {
  if (typeof document === 'undefined') return 'ar'
  const dir = document.documentElement.getAttribute('dir')
  const lang = (document.documentElement.lang || '').toLowerCase()
  if (dir === 'rtl' || lang.startsWith('ar')) return 'ar'
  return 'nl-NL'
}

export type FormatEuroOptions = {
  locale?: EuroFormatLocale
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  fallback?: string
}

/** Full EUR formatting (Intl currency). Arabic locale uses Eastern Arabic digits where supported. */
export function formatEuro(amount: unknown, options?: FormatEuroOptions): string {
  const fallback = options?.fallback ?? '—'
  const n = coerceNumber(amount)
  if (n === null) return fallback

  const locale = options?.locale ?? inferEuroLocale()

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: options?.minimumFractionDigits,
      maximumFractionDigits: options?.maximumFractionDigits,
    }).format(n)
  } catch {
    return `€ ${n}`
  }
}

/** Whole euros — typical for dashboards, KPI tables, finance grids. */
export function formatEuroInteger(amount: unknown, locale?: EuroFormatLocale): string {
  return formatEuro(amount, {
    locale: locale ?? inferEuroLocale(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/** Compact EUR for chart axes / dense KPI chips. */
export function formatEuroCompact(amount: unknown, locale: EuroFormatLocale | 'en-NL' = 'nl-NL'): string {
  const n = coerceNumber(amount)
  if (n === null) return ''
  const loc = locale === 'en-NL' ? 'en-NL' : locale
  try {
    return new Intl.NumberFormat(loc, {
      notation: 'compact',
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 1,
    }).format(n)
  } catch {
    return `€${n}`
  }
}
