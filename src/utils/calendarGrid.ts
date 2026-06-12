import type { CalendarEventRecord } from '@/types/phase7'
import { formatCalendarDateTime } from '@/utils/calendarFormat'

export type CalendarViewMode = 'list' | 'month' | 'week' | 'day'

export const CALENDAR_VIEW_STORAGE_KEY = 'emc_calendar_view'

const TZ = 'Europe/Amsterdam'

export const VIEW_OPTIONS: { id: CalendarViewMode; label: string }[] = [
  { id: 'list', label: 'قائمة' },
  { id: 'month', label: 'شهر' },
  { id: 'week', label: 'أسبوع' },
  { id: 'day', label: 'يوم' },
]

export const WEEKDAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الربيعاء', 'الخميس', 'الجمعة', 'السبت']

export function readStoredCalendarView(): CalendarViewMode {
  try {
    const v = localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY)
    if (v === 'list' || v === 'month' || v === 'week' || v === 'day') return v
  } catch {
    /* ignore */
  }
  return 'list'
}

export function persistCalendarView(mode: CalendarViewMode): void {
  try {
    localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

function partsInTz(date: Date) {
  const fmt = new Intl.DateTimeFormat('en', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date)
  const get = (t: Intl.DateTimeFormatPartTypes) => fmt.find((p) => p.type === t)?.value ?? '0'
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
  }
}

export function getDayKey(date: Date): string {
  const { year, month, day } = partsInTz(date)
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function dayKeyFromIso(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return getDayKey(d)
}

export function dateFromParts(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

export function startOfWeek(date: Date): Date {
  const { year, month, day } = partsInTz(date)
  const base = dateFromParts(year, month, day)
  const weekday = new Intl.DateTimeFormat('en', { timeZone: TZ, weekday: 'short' }).format(base)
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dow = map[weekday] ?? 0
  const shifted = new Date(base)
  shifted.setUTCDate(shifted.getUTCDate() - dow)
  return shifted
}

export type MonthCell = {
  date: Date
  key: string
  inMonth: boolean
  isToday: boolean
}

export function buildMonthGrid(anchor: Date): MonthCell[] {
  const { year, month } = partsInTz(anchor)
  const first = dateFromParts(year, month, 1)
  const start = startOfWeek(first)
  const todayKey = getDayKey(new Date())
  const cells: MonthCell[] = []

  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    const p = partsInTz(d)
    const key = getDayKey(d)
    cells.push({
      date: d,
      key,
      inMonth: p.month === month && p.year === year,
      isToday: key === todayKey,
    })
  }
  return cells
}

export function buildWeekDays(anchor: Date): { date: Date; key: string; label: string; isToday: boolean }[] {
  const start = startOfWeek(anchor)
  const todayKey = getDayKey(new Date())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    return {
      date: d,
      key: getDayKey(d),
      label: formatCalendarDateTime(d.toISOString(), { weekday: 'short', day: 'numeric', month: 'short' }),
      isToday: getDayKey(d) === todayKey,
    }
  })
}

export function formatMonthTitle(anchor: Date): string {
  return formatCalendarDateTime(anchor.toISOString(), { month: 'long', year: 'numeric' })
}

export function formatDayTitle(anchor: Date): string {
  return formatCalendarDateTime(anchor.toISOString(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatWeekTitle(anchor: Date): string {
  const days = buildWeekDays(anchor)
  const first = days[0]?.date
  const last = days[6]?.date
  if (!first || !last) return ''
  const a = formatCalendarDateTime(first.toISOString(), { day: 'numeric', month: 'short' })
  const b = formatCalendarDateTime(last.toISOString(), { day: 'numeric', month: 'short', year: 'numeric' })
  return `${a} — ${b}`
}

export function groupEventsByDayKey(events: CalendarEventRecord[]): Map<string, CalendarEventRecord[]> {
  const map = new Map<string, CalendarEventRecord[]>()
  for (const ev of events) {
    const key = dayKeyFromIso(ev.start_at)
    if (!key) continue
    const bucket = map.get(key) ?? []
    bucket.push(ev)
    map.set(key, bucket)
  }
  for (const [k, list] of map) {
    map.set(
      k,
      list.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    )
  }
  return map
}

export function getHourInTz(iso: string): number {
  const fmt = new Intl.DateTimeFormat('en', {
    timeZone: TZ,
    hour: 'numeric',
    hour12: false,
  }).format(new Date(iso))
  return Number(fmt) || 0
}

export function addMonths(date: Date, delta: number): Date {
  const { year, month } = partsInTz(date)
  const nd = new Date(Date.UTC(year, month - 1 + delta, 1, 12, 0, 0))
  return nd
}

export function addWeeks(date: Date, delta: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + delta * 7)
  return d
}

export function addDays(date: Date, delta: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + delta)
  return d
}

export const TIMELINE_HOURS = Array.from({ length: 17 }, (_, i) => i + 6)
