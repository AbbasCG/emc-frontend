/** Helpers for `datetime-local` values (`YYYY-MM-DDTHH:mm`) in local time. */

export type DatetimeLocalParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export function parseDatetimeLocalParts(value: string): DatetimeLocalParts | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return null
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
  }
}

export function parseDatetimeLocal(value: string): Date | null {
  const p = parseDatetimeLocalParts(value)
  if (!p) return null
  const d = new Date(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0)
  return Number.isNaN(d.getTime()) ? null : d
}

export function toDatetimeLocalValue(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${day}T${h}:${min}`
}

export function formatDatetimeLocalPreview(local: string): string {
  const d = parseDatetimeLocal(local)
  if (!d) return ''
  const datePart = new Intl.DateTimeFormat('ar', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(d)
  const timePart = new Intl.DateTimeFormat('ar', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    numberingSystem: 'latn',
  }).format(d)
  return `${datePart}، ${timePart}`
}

export function splitDatetimeLocalPreview(local: string): { date: string; time: string } {
  const full = formatDatetimeLocalPreview(local)
  if (!full) return { date: '', time: '' }
  const idx = full.lastIndexOf('، ')
  if (idx === -1) return { date: full, time: '' }
  return { date: full.slice(0, idx), time: full.slice(idx + 2) }
}

export function addDaysToDatetimeLocal(value: string, days: number): string {
  const d = parseDatetimeLocal(value) ?? new Date()
  d.setDate(d.getDate() + days)
  return toDatetimeLocalValue(d)
}

export function addMinutesToDatetimeLocal(value: string, minutes: number): string {
  const d = parseDatetimeLocal(value) ?? new Date()
  d.setMinutes(d.getMinutes() + minutes)
  return toDatetimeLocalValue(d)
}

export function startOfTodayDatetimeLocal(): string {
  const d = new Date()
  d.setHours(9, 0, 0, 0)
  return toDatetimeLocalValue(d)
}

export function compareDatetimeLocal(a: string, b: string): number {
  const da = parseDatetimeLocal(a)
  const db = parseDatetimeLocal(b)
  if (!da || !db) return 0
  return da.getTime() - db.getTime()
}
