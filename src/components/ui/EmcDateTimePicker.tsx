import { useEffect, useId, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownPortal } from '@/components/ui/DropdownPortal'
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

const TIME_OPTIONS: string[] = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

function TimeDropdown({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [inputVal, setInputVal] = useState(value)
  const anchorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputVal(value)
  }, [value])

  useEffect(() => {
    if (open && listRef.current) {
      const idx = TIME_OPTIONS.indexOf(value)
      if (idx >= 0) {
        const btn = listRef.current.children[idx] as HTMLElement
        btn?.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [open, value])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setInputVal(v)
    if (/^\d{1,2}:\d{2}$/.test(v)) {
      const [hStr, mStr] = v.split(':')
      const h = parseInt(hStr, 10)
      const m = parseInt(mStr, 10)
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
  }

  function handleSelect(opt: string) {
    onChange(opt)
    setInputVal(opt)
    setOpen(false)
  }

  return (
    <div ref={anchorRef} className="relative">
      <div className="flex items-center gap-1 rounded-xl border border-[#22334A]/12 bg-white px-2.5 py-2 focus-within:border-[#2691C2]/50 focus-within:ring-2 focus-within:ring-[#2691C2]/10">
        <Clock className="h-3.5 w-3.5 shrink-0 text-[#2691C2]" aria-hidden />
        <input
          type="text"
          value={inputVal}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder="00:00"
          dir="ltr"
          className="w-full min-w-0 bg-transparent text-center text-[13px] font-black tabular-nums text-[#22334A] outline-none placeholder:text-slate-300"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 text-[#22334A]/40 hover:text-[#2691C2]"
          tabIndex={-1}
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-[290]" onClick={() => setOpen(false)} />
          <div
            ref={listRef}
            className="absolute bottom-full left-0 right-0 z-[300] mb-1 max-h-48 overflow-y-auto overscroll-contain rounded-xl border border-[#22334A]/10 bg-white py-1 shadow-[0_8px_30px_-6px_rgba(34,51,74,0.25)]"
            dir="ltr"
          >
            {TIME_OPTIONS.map((opt) => {
              const active = opt === value
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    'flex w-full items-center justify-center py-1.5 text-[13px] font-black tabular-nums transition',
                    active
                      ? 'bg-[#2691C2] text-white'
                      : 'text-[#22334A] hover:bg-[#2691C2]/8 hover:text-[#2691C2]',
                  )}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </>
      )}
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

  const draftTime = `${String(draft.hour).padStart(2, '0')}:${String(draft.minute).padStart(2, '0')}`

  function handleTimeChange(t: string) {
    const [hStr, mStr] = t.split(':')
    patchDraft({ hour: parseInt(hStr, 10), minute: parseInt(mStr, 10) })
  }

  return (
    <div className="block text-right font-[Cairo,Tajawal,sans-serif]">
      <span className="text-[12px] font-black text-[#22334A]/70">
        {label}
        {required ? <span className="text-[#EC943C]"> *</span> : null}
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
          error ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100' : 'border-[#22334A]/12',
          'bg-white hover:border-[#2691C2]/30 focus:border-[#2691C2]/50 focus:outline-none focus:ring-4 focus:ring-[#2691C2]/10',
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-[#2691C2]" aria-hidden />
        <span className="min-w-0 flex-1">
          {value.trim() ?
            <>
              <span className="block truncate text-[13px] font-semibold text-[#22334A]">{selectedDate}</span>
              <span className="block text-[12px] font-black tabular-nums text-[#2691C2]">{selectedTime}</span>
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
          aria-label={label}
          className="flex max-h-[min(85vh,32rem)] flex-col overflow-hidden rounded-2xl border border-[#22334A]/10 bg-white shadow-[0_20px_50px_-12px_rgba(34,51,74,0.35)]"
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
                    className="rounded-lg border border-[#22334A]/10 bg-white px-2.5 py-1 text-[11px] font-black text-[#22334A] transition hover:border-[#2691C2]/30 hover:text-[#2691C2]"
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
                    className="rounded-lg border border-[#EC943C]/25 bg-[#EC943C]/10 px-2.5 py-1 text-[11px] font-black text-[#b36a1f] transition hover:bg-[#EC943C]/20"
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
                className="rounded-lg p-1.5 text-[#22334A]/60 transition hover:bg-slate-100"
                aria-label="الشهر التالي"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-[13px] font-black text-[#22334A]">{monthLabel(viewYear, viewMonth)}</p>
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-lg p-1.5 text-[#22334A]/60 transition hover:bg-slate-100"
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

            <div className="grid grid-cols-7 gap-0.5 px-2 pb-3">
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
                    onClick={() => selectDay(day)}
                    className={cn(
                      'aspect-square rounded-xl text-[12px] font-bold tabular-nums transition',
                      isSelected
                        ? 'bg-[#2691C2] text-white shadow-sm'
                        : isToday
                          ? 'bg-[#2691C2]/10 text-[#2691C2] ring-1 ring-[#2691C2]/30'
                          : 'text-[#22334A] hover:bg-slate-100',
                    )}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-black text-[#22334A]/70">
                <Clock className="h-3.5 w-3.5 text-[#2691C2]" aria-hidden />
                الوقت
              </div>
              <TimeDropdown value={draftTime} onChange={handleTimeChange} />
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2.5">
            {draftPreview ?
              <p className="mb-2 text-center text-[11px] font-semibold text-[#2691C2]">{draftPreview}</p>
            : null}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-[#22334A]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirm}
                className="rounded-xl bg-[#2691C2] px-4 py-2 text-[11px] font-black text-white"
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
