import { useEffect, useId, useRef, useState } from 'react'
import { Calendar, Clock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownPortal } from '@/components/ui/DropdownPortal'
import { CALENDAR_PORTAL_CLASS, EmcCalendarBody } from '@/components/ui/EmcCalendarPopover'
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

function mergeDateTime(y: number, m: number, day: number, hour: number, minute: number): string {
  return toDatetimeLocalValue(new Date(y, m - 1, day, hour, minute, 0, 0))
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

  // Re-sync the text field when the committed value changes underneath it — adjusted
  // during render so the input never shows one frame of the previous value.
  const [seenValue, setSeenValue] = useState(value)
  if (seenValue !== value) {
    setSeenValue(value)
    setInputVal(value)
  }

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
      <div className="flex items-center gap-1 rounded-xl border border-[#0C2A4B]/12 bg-white px-2.5 py-2 focus-within:border-[#0077B6]/50 focus-within:ring-2 focus-within:ring-[#0077B6]/10">
        <Clock className="h-3.5 w-3.5 shrink-0 text-[#0077B6]" aria-hidden />
        <input
          type="text"
          value={inputVal}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder="00:00"
          dir="ltr"
          className="w-full min-w-0 bg-transparent text-center text-[13px] font-black tabular-nums text-[#0C2A4B] outline-none placeholder:text-slate-300"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 text-[#0C2A4B]/40 hover:text-[#0077B6]"
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
            className="absolute bottom-full left-0 right-0 z-[300] mb-1 max-h-48 overflow-y-auto overscroll-contain rounded-xl border border-[#0C2A4B]/10 bg-white py-1 shadow-[0_8px_30px_-6px_rgba(12,42,75,0.25)]"
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
                      ? 'bg-[#0077B6] text-white'
                      : 'text-[#0C2A4B] hover:bg-[#0077B6]/8 hover:text-[#0077B6]',
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

  // Re-seed the draft from the committed value each time the popover opens — adjusted
  // during render so the panel never paints the previous draft for a frame.
  const [seenOpen, setSeenOpen] = useState(open)
  if (seenOpen !== open) {
    setSeenOpen(open)
    if (open) {
      const next = draftFromValue(value, today)
      setDraft(next)
      setViewYear(next.year)
      setViewMonth(next.month)
    }
  }


  const { date: selectedDate, time: selectedTime } = splitDatetimeLocalPreview(value)
  const draftPreview = formatDatetimeLocalPreview(draftToValue(draft))

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
        align="end"
        offset={8}
        layer="datetime"
        constrainViewport
        className={CALENDAR_PORTAL_CLASS}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="flex flex-col overflow-hidden rounded-2xl border border-[#0C2A4B]/10 bg-white shadow-[0_20px_50px_-12px_rgba(12,42,75,0.35)]"
          dir="rtl"
        >
          {(showDatePresets || durationFrom) && (
            <div className="shrink-0 flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-3">
              {showDatePresets &&
                DATE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.apply(value))}
                    className="rounded-lg border border-[#0C2A4B]/10 bg-white px-3 py-1.5 text-[12px] font-black text-[#0C2A4B] transition hover:border-[#0077B6]/35 hover:bg-[#0077B6]/5 hover:text-[#0077B6]"
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

          <div className="flex-1">
            <EmcCalendarBody
              viewYear={viewYear}
              viewMonth={viewMonth}
              isDaySelected={(day) =>
                draft.year === viewYear && draft.month === viewMonth && draft.day === day
              }
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onSelectDay={selectDay}
              onPreset={(iso) => {
                const p = parseDatetimeLocalParts(iso + 'T12:00:00') ?? {
                  year: draft.year,
                  month: draft.month,
                  day: draft.day,
                  hour: draft.hour,
                  minute: draft.minute,
                }
                setDraft({ year: p.year, month: p.month, day: p.day, hour: draft.hour, minute: draft.minute })
                setViewYear(p.year)
                setViewMonth(p.month)
              }}
              showPresets={false}
            />

            <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2.5">
              <div className="mb-1.5 flex items-center gap-2 text-[11px] font-black text-[#0C2A4B]/70">
                <Clock className="h-3.5 w-3.5 text-[#0077B6]" aria-hidden />
                الوقت
              </div>
              <TimeDropdown value={draftTime} onChange={handleTimeChange} />
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
