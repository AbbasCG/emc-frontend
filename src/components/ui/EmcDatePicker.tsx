import { useEffect, useId, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownPortal } from '@/components/ui/DropdownPortal'
import { usePickerKeyboard } from '@/components/ui/usePickerKeyboard'

const WEEKDAYS = ['أحد', 'إثن', 'ثل', 'أرب', 'خم', 'جم', 'سب'] as const

function dayAriaLabel(year: number, month: number, day: number): string {
  return new Intl.DateTimeFormat('ar', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(new Date(year, month - 1, day))
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDaysToIso(iso: string, days: number): string {
  const base = iso ? new Date(iso + 'T12:00:00') : new Date()
  base.setDate(base.getDate() + days)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('ar', {
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(new Date(year, month - 1, 1))
}

function buildCalendarDays(viewYear: number, viewMonth: number): (number | null)[] {
  const first = new Date(viewYear, viewMonth - 1, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function formatDateDisplay(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso + 'T12:00:00')
    return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
  } catch {
    return iso
  }
}

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const parts = iso.split('-')
  if (parts.length !== 3) return null
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!y || !m || !d) return null
  return { y, m, d }
}

export type EmcDatePickerProps = {
  label: string
  value: string // YYYY-MM-DD
  onChange: (v: string) => void
  error?: string
  required?: boolean
}

export default function EmcDatePicker({ label, value, onChange, error, required }: EmcDatePickerProps) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const fieldId = useId()
  const today = new Date()
  const todayY = today.getFullYear()
  const todayM = today.getMonth() + 1
  const todayD = today.getDate()

  const parsed = parseIso(value)
  const [viewYear, setViewYear] = useState(parsed?.y ?? todayY)
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? todayM)

  useEffect(() => {
    if (!open) return
    const p = parseIso(value)
    if (p) { setViewYear(p.y); setViewMonth(p.m) }
    else { setViewYear(todayY); setViewMonth(todayM) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const calendarDays = buildCalendarDays(viewYear, viewMonth)

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(iso)
    setOpen(false)
  }

  function applyPreset(iso: string) {
    const p = parseIso(iso)
    if (p) { setViewYear(p.y); setViewMonth(p.m) }
    onChange(iso)
    setOpen(false)
  }

  const selectedIndex = calendarDays.findIndex((day) => {
    if (day == null) return false
    const iso = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return value === iso
  })

  const { gridRef, onGridKeyDown, activeIndex } = usePickerKeyboard({
    cells: calendarDays,
    selectedIndex,
    open,
    onSelect: (index) => {
      const day = calendarDays[index]
      if (day != null) selectDay(day)
    },
    onPrevMonth: prevMonth,
    onNextMonth: nextMonth,
    onClose: () => setOpen(false),
  })

  return (
    <div className="block text-right">
      <span className="text-[12px] font-black text-[#22334A]/70">
        {label}{required ? <span className="text-[#EC943C]"> *</span> : null}
      </span>
      <button
        ref={anchorRef}
        type="button"
        id={fieldId}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'mt-1.5 flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-right transition',
          error ? 'border-rose-400' : 'border-[#22334A]/12',
          'bg-white hover:border-[#2691C2]/30 focus:border-[#2691C2]/50 focus:outline-none focus:ring-4 focus:ring-[#2691C2]/10',
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-[#2691C2]" aria-hidden />
        <span className="min-w-0 flex-1">
          {value
            ? <span className="block truncate text-[13px] font-semibold text-[#22334A]">{formatDateDisplay(value)}</span>
            : <span className="block text-[13px] font-semibold text-slate-400">اختر التاريخ</span>
          }
        </span>
      </button>
      {error ? <p className="mt-1 text-[11px] font-bold text-rose-700">{error}</p> : null}

      <DropdownPortal
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        align="stretch"
        offset={8}
        layer="datetime"
        constrainViewport
        className="w-[min(100vw-1rem,22rem)]"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="overflow-hidden rounded-2xl border border-[#22334A]/10 bg-white shadow-[0_20px_50px_-12px_rgba(34,51,74,0.35)]"
          dir="rtl"
        >
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 bg-slate-50/80 p-2.5">
            {[
              { label: 'اليوم', iso: todayIso() },
              { label: 'غداً', iso: addDaysToIso(todayIso(), 1) },
              { label: 'بعد أسبوع', iso: addDaysToIso(todayIso(), 7) },
            ].map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.iso)}
                className="rounded-lg border border-[#22334A]/10 bg-white px-2.5 py-1 text-[11px] font-black text-[#22334A] transition hover:border-[#2691C2]/30 hover:text-[#2691C2]"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            <button type="button" onClick={nextMonth} className="rounded-lg p-1.5 text-[#22334A]/60 transition hover:bg-slate-100" aria-label="الشهر التالي">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-[13px] font-black text-[#22334A]">{monthLabel(viewYear, viewMonth)}</p>
            <button type="button" onClick={prevMonth} className="rounded-lg p-1.5 text-[#22334A]/60 transition hover:bg-slate-100" aria-label="الشهر السابق">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 px-2 pb-1">
            {WEEKDAYS.map(wd => (
              <div key={wd} className="py-1 text-center text-[10px] font-bold text-slate-400">{wd}</div>
            ))}
          </div>

          <div
            ref={gridRef}
            role="grid"
            aria-label={monthLabel(viewYear, viewMonth)}
            onKeyDown={onGridKeyDown}
            className="grid grid-cols-7 gap-0.5 px-2 pb-3"
          >
            {calendarDays.map((day, idx) => {
              if (day == null) return <div key={`e-${idx}`} className="aspect-square" />
              const iso = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = value === iso
              const isToday = todayY === viewYear && todayM === viewMonth && todayD === day
              return (
                <button
                  key={`d-${day}-${idx}`}
                  type="button"
                  role="gridcell"
                  data-cell-index={idx}
                  aria-selected={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={dayAriaLabel(viewYear, viewMonth, day)}
                  tabIndex={idx === activeIndex ? 0 : -1}
                  onClick={() => selectDay(day)}
                  className={cn(
                    'aspect-square rounded-xl text-[12px] font-bold tabular-nums transition',
                    isSelected ? 'bg-[#2691C2] text-white shadow-sm'
                      : isToday ? 'bg-[#2691C2]/10 text-[#2691C2] ring-1 ring-[#2691C2]/30'
                        : 'text-[#22334A] hover:bg-slate-100',
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      </DropdownPortal>
    </div>
  )
}
