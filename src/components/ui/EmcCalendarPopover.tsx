import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
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


const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
] as const

type CalendarBodyProps = {
  viewYear: number
  viewMonth: number
  selectedIso?: string
  isDaySelected?: (day: number) => boolean
  onPrevMonth: () => void
  onNextMonth: () => void
  onSelectDay: (day: number) => void
  onPreset: (iso: string) => void
  showPresets?: boolean
  /** Enables quick month/year <select> jump in the header — pass to allow fast navigation to distant dates (e.g. date of birth). */
  onSelectMonthYear?: (year: number, month: number) => void
  /** Bounds for the year <select> range when onSelectMonthYear is provided. Defaults to current year -100..+10. */
  minYear?: number
  maxYear?: number
  /** Disables individual day buttons outside this ISO range (YYYY-MM-DD, inclusive). */
  minDate?: string
  maxDate?: string
  /** Range-selection mode — when set, days between (exclusive) get a soft-blue
   *  fill and the start/end days get filled pills with matching rounded caps.
   *  Takes precedence over selectedIso/isDaySelected for styling. */
  rangeFrom?: string
  rangeTo?: string
}

export function EmcCalendarBody({
  viewYear,
  viewMonth,
  selectedIso,
  isDaySelected,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  onPreset,
  showPresets = true,
  onSelectMonthYear,
  minYear,
  maxYear,
  minDate,
  maxDate,
  rangeFrom,
  rangeTo,
}: CalendarBodyProps) {
  const today = new Date()
  const todayY = today.getFullYear()
  const todayM = today.getMonth() + 1
  const todayD = today.getDate()
  const calendarDays = buildCalendarDays(viewYear, viewMonth)
  const yearRangeStart = minYear ?? todayY - 100
  const yearRangeEnd = maxYear ?? todayY + 10
  const yearOptions: number[] = []
  for (let y = yearRangeEnd; y >= yearRangeStart; y--) yearOptions.push(y)

  return (
    <>
      {showPresets && (
        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-3">
          {DATE_QUICK_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onPreset(addDaysToIso(todayIso(), p.days))}
              className="rounded-lg border border-[#0C2A4B]/10 bg-white px-3 py-1.5 text-[12px] font-black text-[#0C2A4B] transition hover:border-[#0077B6]/35 hover:bg-[#0077B6]/5 hover:text-[#0077B6]"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onNextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#0C2A4B]/60 transition hover:bg-slate-100"
          aria-label="الشهر التالي"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {onSelectMonthYear ? (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
            <select
              aria-label="الشهر"
              value={viewMonth}
              onChange={(e) => onSelectMonthYear(viewYear, Number(e.target.value))}
              className="rounded-lg border border-transparent bg-transparent px-1 py-1 text-[13px] font-black text-[#0C2A4B] transition hover:bg-slate-100 focus:border-[#0077B6]/30 focus:outline-none"
            >
              {MONTH_NAMES_AR.map((name, idx) => (
                <option key={name} value={idx + 1}>{name}</option>
              ))}
            </select>
            <select
              aria-label="السنة"
              value={viewYear}
              onChange={(e) => onSelectMonthYear(Number(e.target.value), viewMonth)}
              className="rounded-lg border border-transparent bg-transparent px-1 py-1 text-[13px] font-black tabular-nums text-[#0C2A4B] transition hover:bg-slate-100 focus:border-[#0077B6]/30 focus:outline-none"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        ) : (
          <p className="min-w-0 flex-1 text-center text-[14px] font-black text-[#0C2A4B]">
            {monthLabel(viewYear, viewMonth)}
          </p>
        )}
        <button
          type="button"
          onClick={onPrevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#0C2A4B]/60 transition hover:bg-slate-100"
          aria-label="الشهر السابق"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 px-3 pb-1">
        {CALENDAR_WEEKDAYS.map((wd) => (
          <div key={wd} className="flex h-8 items-center justify-center text-center text-[11px] font-bold text-slate-400">
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-3 pb-4">
        {calendarDays.map((day, idx) => {
          if (day == null) return <div key={`e-${idx}`} className="h-10" aria-hidden />
          const iso = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = todayY === viewYear && todayM === viewMonth && todayD === day
          const disabled = Boolean((minDate && iso < minDate) || (maxDate && iso > maxDate))

          const inRange = Boolean(rangeFrom && rangeTo)
          const isRangeStart = inRange && iso === rangeFrom
          const isRangeEnd = inRange && iso === rangeTo
          const isRangeMiddle = inRange && iso > rangeFrom! && iso < rangeTo!
          const isRangeEdge = Boolean(rangeFrom && !rangeTo && iso === rangeFrom)
          const selected = rangeFrom
            ? isRangeStart || isRangeEnd || isRangeEdge
            : isDaySelected ? isDaySelected(day) : selectedIso === iso

          return (
            <button
              key={`d-${day}-${idx}`}
              type="button"
              disabled={disabled}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={selected}
              onClick={() => onSelectDay(day)}
              className={cn(
                'relative flex h-10 w-full items-center justify-center text-[13px] font-bold tabular-nums transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6]/50',
                isRangeMiddle && 'bg-[#0077B6]/10 text-[#0C2A4B] rounded-none',
                (isRangeStart || isRangeEdge) && 'rounded-r-xl rounded-l-none',
                isRangeEnd && 'rounded-l-xl rounded-r-none',
                !inRange && !isRangeEdge && 'rounded-xl',
                disabled
                  ? 'cursor-not-allowed text-slate-300'
                  : selected
                    ? 'bg-[#0077B6] text-white shadow-sm shadow-[#0077B6]/25'
                    : isRangeMiddle
                      ? ''
                      : isToday
                        ? 'bg-[#0077B6]/8 text-[#0077B6] ring-1 ring-[#0077B6]/35'
                        : 'text-[#0C2A4B] hover:bg-slate-100',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </>
  )
}
