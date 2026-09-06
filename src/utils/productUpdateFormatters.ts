import { formatNumberEn } from '@/utils/publicDetailFormat'

export const PRODUCT_UPDATE_TZ = 'Europe/Amsterdam' as const

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: PRODUCT_UPDATE_TZ,
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: PRODUCT_UPDATE_TZ,
})

function parseProductUpdateDate(value: string | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const s = String(value).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T12:00:00`)
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    dateFormatter.format(a) === dateFormatter.format(b)
  )
}

/** DD/MM/YYYY — e.g. 13/07/2026 */
export function formatProductUpdateDate(
  value: string | Date | null | undefined,
): string {
  if (!value) return '—'
  const d = parseProductUpdateDate(value)
  if (!d) return '—'
  return dateFormatter.format(d)
}

/** 24-hour time — e.g. 22:01 */
export function formatProductUpdateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return '—'
  const d = parseProductUpdateDate(value)
  if (!d) return '—'
  return timeFormatter.format(d)
}

/** DD/MM/YYYY HH:mm — e.g. 13/07/2026 22:01 */
export function formatProductUpdateDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return '—'
  const d = parseProductUpdateDate(value)
  if (!d) return '—'
  return `${dateFormatter.format(d)} ${timeFormatter.format(d)}`
}

/** Alias — table and compact surfaces use the same DD/MM/YYYY format */
export const formatProductUpdateShortDate = formatProductUpdateDate

/** Relative Arabic label; falls back to DD/MM/YYYY after 7 days */
export function formatProductUpdateRelative(
  value: string | null | undefined,
): string {
  if (!value) return '—'
  const date = parseProductUpdateDate(value)
  if (!date) return '—'

  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'الآن'
  if (minutes < 60) return `منذ ${formatNumberEn(minutes)} دقيقة`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `منذ ${formatNumberEn(hours)} ساعة`

  const days = Math.floor(hours / 24)
  if (days < 7) return `منذ ${formatNumberEn(days)} يوم`

  return formatProductUpdateDate(value)
}

/** Maintenance / time windows — 13/07/2026 22:01 – 23:30 or full datetimes when跨日 */
export function formatProductUpdateTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start || !end) return '—'
  const s = parseProductUpdateDate(start)
  const e = parseProductUpdateDate(end)
  if (!s || !e) return '—'

  if (sameCalendarDay(s, e)) {
    return `${dateFormatter.format(s)} ${timeFormatter.format(s)} – ${timeFormatter.format(e)}`
  }
  return `${formatProductUpdateDateTime(s)} – ${formatProductUpdateDateTime(e)}`
}

export function formatProductUpdateCount(value: number): string {
  return formatNumberEn(value, { maximumFractionDigits: 0 })
}
