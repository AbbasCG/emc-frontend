import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFinanceDate } from '@/utils/financeDateFormatters'

export function formatDateDisplay(iso: string, _compact = false, mode: 'default' | 'finance' = 'default'): string {
  if (!iso) return ''
  if (mode === 'finance') return formatFinanceDate(iso)
  try {
    const d = new Date(iso + 'T12:00:00')
    return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
  } catch {
    return iso
  }
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
}: CalendarBodyProps) {
  const today = new Date()
  const todayY = today.getFullYear()
  const todayM = today.getMonth() + 1
  const todayD = today.getDate()
  const calendarDays = buildCalendarDays(viewYear, viewMonth)

  return (
    <>
      {showPresets && (
        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-3">
          {DATE_QUICK_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onPreset(addDaysToIso(todayIso(), p.days))}
              className="rounded-lg border border-[#22334A]/10 bg-white px-3 py-1.5 text-[12px] font-black text-[#22334A] transition hover:border-[#2691C2]/35 hover:bg-[#2691C2]/5 hover:text-[#2691C2]"
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
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#22334A]/60 transition hover:bg-slate-100"
          aria-label="الشهر التالي"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="min-w-0 flex-1 text-center text-[14px] font-black text-[#22334A]">
          {monthLabel(viewYear, viewMonth)}
        </p>
        <button
          type="button"
          onClick={onPrevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#22334A]/60 transition hover:bg-slate-100"
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
          const selected = isDaySelected ? isDaySelected(day) : selectedIso === iso
          const isToday = todayY === viewYear && todayM === viewMonth && todayD === day
          return (
            <button
              key={`d-${day}-${idx}`}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                'flex h-10 w-full items-center justify-center rounded-xl text-[13px] font-bold tabular-nums transition duration-200',
                selected
                  ? 'bg-[#2691C2] text-white shadow-sm shadow-[#2691C2]/25'
                  : isToday
                    ? 'bg-[#2691C2]/8 text-[#2691C2] ring-1 ring-[#2691C2]/35'
                    : 'text-[#22334A] hover:bg-slate-100',
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
