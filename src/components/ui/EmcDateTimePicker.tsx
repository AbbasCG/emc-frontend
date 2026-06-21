import { useEffect, useId, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownPortal } from '@/components/ui/DropdownPortal'
import { usePickerKeyboard } from '@/components/ui/usePickerKeyboard'
import {
  addDaysToDatetimeLocal,
  addMinutesToDatetimeLocal,
  formatDatetimeLocalPreview,
  parseDatetimeLocal,
  parseDatetimeLocalParts,
  splitDatetimeLocalPreview,
  startOfTodayDatetimeLocal,
  toDatetimeLocalValue,
} from '@/utils/datetimeLocal'

const WEEKDAYS = ['أحد', 'إثن', 'ثل', 'أرب', 'خم', 'جم', 'سب'] as const

type DatePreset = { id: string; label: string; apply: (current: string) => string }
type DurationPreset = { id: string; label: string; minutes: number }

const DATE_PRESETS: DatePreset[] = [
  { id: 'today', label: 'اليوم', apply: () => startOfTodayDatetimeLocal() },
  {
    id: 'tomorrow',
    label: 'غداً',
    apply: (current) => {
      const base = parseDatetimeLocal(current) ?? new Date()
      base.setDate(base.getDate() + 1)
      if (!current.trim()) base.setHours(9, 0, 0, 0)
      return toDatetimeLocalValue(base)
    },
  },
  {
    id: 'week',
    label: 'بعد أسبوع',
    apply: (current) => addDaysToDatetimeLocal(current || startOfTodayDatetimeLocal(), 7),
  },
]

const DURATION_PRESETS: DurationPreset[] = [
  { id: '30m', label: '+30 دقيقة', minutes: 30 },
  { id: '1h', label: '+1 ساعة', minutes: 60 },
  { id: '2h', label: '+2 ساعة', minutes: 120 },
]

function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat('ar', {
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(d)
}

function dayAriaLabel(year: number, month: number, day: number): string {
  return new Intl.DateTimeFormat('ar', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(new Date(year, month - 1, day))
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

function mergeDateTime(y: number, m: number, day: number, hour: number, minute: number): string {
  return toDatetimeLocalValue(new Date(y, m - 1, day, hour, minute, 0, 0))
}

type Draft = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function draftFromValue(value: string, fallback: Date): Draft {
  const p = parseDatetimeLocalParts(value)
  if (p) return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute }
  return {
    year: fallback.getFullYear(),
    month: fallback.getMonth() + 1,
    day: fallback.getDate(),
    hour: 9,
    minute: 0,
  }
}

function draftToValue(d: Draft): string {
  return mergeDateTime(d.year, d.month, d.day, d.hour, d.minute)
}

type Props = {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  required?: boolean
  placeholder?: string
  durationFrom?: string
  showDatePresets?: boolean
}

function TimeColumn({
  label,
  items,
  value,
  onSelect,
}: {
  label: string
  items: number[]
  value: number
  onSelect: (v: number) => void
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-center text-[10px] font-bold text-slate-500">{label}</p>
      <div className="max-h-36 overflow-y-auto rounded-xl border border-[#0C2A4B]/10 bg-white p-1 scrollbar-thin">
        {items.map((item) => {
          const active = item === value
          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelect(item)}
              className={cn(
                'flex w-full items-center justify-center rounded-lg py-1.5 text-[12px] font-bold tabular-nums transition',
                active ? 'bg-[#0077B6] text-white' : 'text-[#0C2A4B] hover:bg-slate-100',
              )}
            >
              {String(item).padStart(2, '0')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function EmcDateTimePicker({
  label,
  value,
  onChange,
  error,
  required,
  placeholder = 'اختر التاريخ والوقت',
  durationFrom,
  showDatePresets = true,
}: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const fieldId = useId()
  const today = new Date()

  const [draft, setDraft] = useState<Draft>(() => draftFromValue(value, today))
  const [viewYear, setViewYear] = useState(() => draft.year)
  const [viewMonth, setViewMonth] = useState(() => draft.month)

  useEffect(() => {
    if (!open) return
    const next = draftFromValue(value, today)
    setDraft(next)
    setViewYear(next.year)
    setViewMonth(next.month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])


  const { date: selectedDate, time: selectedTime } = splitDatetimeLocalPreview(value)
  const draftPreview = formatDatetimeLocalPreview(draftToValue(draft))
  const calendarDays = buildCalendarDays(viewYear, viewMonth)

  function patchDraft(patch: Partial<Draft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch }
      if (patch.year != null || patch.month != null) {
        const daysInMonth = new Date(next.year, next.month, 0).getDate()
        if (next.day > daysInMonth) next.day = daysInMonth
      }
      return next
    })
  }

  function selectDay(day: number) {
    patchDraft({ year: viewYear, month: viewMonth, day })
  }

  function applyPreset(next: string) {
    const p = draftFromValue(next, today)
    setDraft(p)
    setViewYear(p.year)
    setViewMonth(p.month)
  }

  function confirm() {
    onChange(draftToValue(draft))
    setOpen(false)
  }

  function prevMonth() {
    if (viewMonth === 1) {
      setViewMonth(12)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const selectedIndex = calendarDays.findIndex(
    (day) => day != null && draft.year === viewYear && draft.month === viewMonth && draft.day === day,
  )

  const { gridRef, onGridKeyDown, activeIndex } = usePickerKeyboard({
    cells: calendarDays,
    selectedIndex,
    open,
    // Enter/Space updates the DRAFT only; commit happens via the تأكيد button.
    onSelect: (index) => {
      const day = calendarDays[index]
      if (day != null) selectDay(day)
    },
    onPrevMonth: prevMonth,
    onNextMonth: nextMonth,
    onClose: () => setOpen(false),
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  return (
    <div className="block text-right font-[Cairo,Tajawal,sans-serif]">
      <span className="text-[12px] font-black text-[#0C2A4B]/70">
        {label}
        {required ? <span className="text-[#F28C00]"> *</span> : null}
      </span>

      <button
        ref={anchorRef}
        type="button"
        id={fieldId}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'mt-1.5 flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-right transition',
          error ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100' : 'border-[#0C2A4B]/12',
          'bg-white hover:border-[#0077B6]/30 focus:border-[#0077B6]/50 focus:outline-none focus:ring-4 focus:ring-[#0077B6]/10',
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-[#0077B6]" aria-hidden />
        <span className="min-w-0 flex-1">
          {value.trim() ?
            <>
              <span className="block truncate text-[13px] font-semibold text-[#0C2A4B]">{selectedDate}</span>
              <span className="block text-[12px] font-black tabular-nums text-[#0077B6]">{selectedTime}</span>
            </>
          : <span className="block text-[13px] font-semibold text-slate-400">{placeholder}</span>}
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
          className="flex max-h-[min(85vh,32rem)] flex-col overflow-hidden rounded-2xl border border-[#0C2A4B]/10 bg-white shadow-[0_20px_50px_-12px_rgba(12, 42, 75,0.35)]"
          dir="rtl"
        >
          {(showDatePresets || durationFrom) && (
            <div className="shrink-0 flex flex-wrap gap-1.5 border-b border-slate-100 bg-slate-50/80 p-2.5">
              {showDatePresets &&
                DATE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.apply(value))}
                    className="rounded-lg border border-[#0C2A4B]/10 bg-white px-2.5 py-1 text-[11px] font-black text-[#0C2A4B] transition hover:border-[#0077B6]/30 hover:text-[#0077B6]"
                  >
                    {p.label}
                  </button>
                ))}
              {durationFrom &&
                DURATION_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(addMinutesToDatetimeLocal(durationFrom, p.minutes))}
                    className="rounded-lg border border-[#F28C00]/25 bg-[#F28C00]/10 px-2.5 py-1 text-[11px] font-black text-[#C97208] transition hover:bg-[#F28C00]/20"
                  >
                    {p.label}
                  </button>
                ))}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-lg p-1.5 text-[#0C2A4B]/60 transition hover:bg-slate-100"
                aria-label="الشهر التالي"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-[13px] font-black text-[#0C2A4B]">{monthLabel(viewYear, viewMonth)}</p>
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-lg p-1.5 text-[#0C2A4B]/60 transition hover:bg-slate-100"
                aria-label="الشهر السابق"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 px-2 pb-1">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-1 text-center text-[10px] font-bold text-slate-400">
                  {wd}
                </div>
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
                const isSelected =
                  draft.year === viewYear && draft.month === viewMonth && draft.day === day
                const isToday =
                  today.getFullYear() === viewYear && today.getMonth() + 1 === viewMonth && today.getDate() === day
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
                      isSelected
                        ? 'bg-[#0077B6] text-white shadow-sm'
                        : isToday
                          ? 'bg-[#0077B6]/10 text-[#0077B6] ring-1 ring-[#0077B6]/30'
                          : 'text-[#0C2A4B] hover:bg-slate-100',
                    )}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-black text-[#0C2A4B]/70">
                <Clock className="h-3.5 w-3.5 text-[#0077B6]" aria-hidden />
                الوقت
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TimeColumn label="ساعة" items={hours} value={draft.hour} onSelect={(h) => patchDraft({ hour: h })} />
                <TimeColumn label="دقيقة" items={minutes} value={draft.minute} onSelect={(m) => patchDraft({ minute: m })} />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2.5">
            {draftPreview ?
              <p className="mb-2 text-center text-[11px] font-semibold text-[#0077B6]">{draftPreview}</p>
            : null}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-[#0C2A4B]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirm}
                className="rounded-xl bg-[#0077B6] px-4 py-2 text-[11px] font-black text-white"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      </DropdownPortal>
    </div>
  )
}
