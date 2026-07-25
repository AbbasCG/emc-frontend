import { formatFinanceDate } from '@/utils/financeDateFormatters'

export function formatDateDisplay(iso: string, _compact = false, mode: 'default' | 'finance' = 'default'): string {
  if (!iso) return ''
  if (mode === 'finance') return formatFinanceDate(iso)
  const parts = parseIso(iso)
  if (!parts) return iso
  const dd = String(parts.d).padStart(2, '0')
  const mm = String(parts.m).padStart(2, '0')
  return `${dd}/${mm}/${parts.y}`
}

export const CALENDAR_WEEKDAYS = ['أحد', 'إثن', 'ثل', 'أرب', 'خم', 'جم', 'سب'] as const

/** Fixed popover width — do not stretch to narrow filter triggers. */
export const CALENDAR_PORTAL_CLASS = 'min-w-[340px] w-[min(calc(100vw-1rem),340px)]'

export const DATE_QUICK_PRESETS = [
  { label: 'اليوم', days: 0 },
  { label: 'غداً', days: 1 },
  { label: 'بعد أسبوع', days: 7 },
] as const

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDaysToIso(iso: string, days: number): string {
  const base = iso ? new Date(iso + 'T12:00:00') : new Date()
  base.setDate(base.getDate() + days)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('ar', {
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(new Date(year, month - 1, 1))
}

export function buildCalendarDays(viewYear: number, viewMonth: number): (number | null)[] {
  const first = new Date(viewYear, viewMonth - 1, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const parts = iso.split('-')
  if (parts.length !== 3) return null
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!y || !m || !d) return null
  return { y, m, d }
}
