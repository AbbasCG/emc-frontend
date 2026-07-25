import { useId, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownPortal } from '@/components/ui/DropdownPortal'
import { EmcCalendarBody } from '@/components/ui/EmcCalendarPopover'
import {
  CALENDAR_PORTAL_CLASS,
  formatDateDisplay,
  parseIso,
} from '@/components/ui/emcCalendarUtils'

export type EmcDatePickerProps = {
  label: string
  value: string // YYYY-MM-DD
  onChange: (v: string) => void
  error?: string
  required?: boolean
  /**
   * inline — label + field on one row (filter toolbars, h-10 alignment)
   * stacked — label above field (form grids)
   */
  layout?: 'inline' | 'stacked'
  /** Finance module uses Arabic long-month display (04 يوليو 2026) */
  displayMode?: 'default' | 'finance'
  /** Earliest selectable date (YYYY-MM-DD). Also bounds the year <select> range. */
  minDate?: string
  /** Latest selectable date (YYYY-MM-DD). Also bounds the year <select> range. */
  maxDate?: string
  /** Hide the "اليوم / غداً / بعد أسبوع" quick presets — irrelevant for fields like date of birth. */
  showPresets?: boolean
}

export default function EmcDatePicker({
  label,
  value,
  onChange,
  error,
  required,
  layout = 'inline',
  displayMode = 'default',
  minDate,
  maxDate,
  showPresets = true,
}: EmcDatePickerProps) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const fieldId = useId()
  const today = new Date()
  const todayY = today.getFullYear()
  const todayM = today.getMonth() + 1

  const parsed = parseIso(value)
  const [viewYear, setViewYear] = useState(parsed?.y ?? todayY)
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? todayM)

  // Re-centre the visible month on the committed value each time the popover opens —
  // adjusted during render so the calendar never paints the previous month first.
  const [seenOpen, setSeenOpen] = useState(open)
  if (seenOpen !== open) {
    setSeenOpen(open)
    if (open) {
      const p = parseIso(value)
      setViewYear(p ? p.y : todayY)
      setViewMonth(p ? p.m : todayM)
    }
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

  function selectMonthYear(year: number, month: number) {
    setViewYear(year)
    setViewMonth(month)
  }

  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(iso)
    setOpen(false)
  }

  function applyPreset(iso: string) {
    const p = parseIso(iso)
    if (p) {
      setViewYear(p.y)
      setViewMonth(p.m)
    }
    onChange(iso)
    setOpen(false)
  }

  const isInline = layout === 'inline'
  const displayText = value ? formatDateDisplay(value, isInline, displayMode) : ''

  const triggerButton = (
    <button
      ref={anchorRef}
      type="button"
      id={fieldId}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={value ? `${label}: ${displayText}` : `${label}: اختر التاريخ`}
      onClick={() => setOpen((v) => !v)}
      className={cn(
        'flex items-center gap-2 rounded-xl border text-right transition duration-200',
        isInline ? 'h-10 min-w-[10.5rem] px-3' : 'mt-1.5 w-full gap-3 rounded-2xl px-3.5 py-2.5',
        error ? 'border-rose-400' : 'border-[#0C2A4B]/10',
        'bg-[#f8fafc] hover:border-[#0077B6]/35 focus:border-[#0077B6]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0077B6]/20',
      )}
    >
      <Calendar className="h-4 w-4 shrink-0 text-[#0077B6]" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#0C2A4B]">
        {displayText ? (
          <span className={displayMode === 'finance' ? 'finance-date-value text-[13px]' : undefined} dir="ltr">
            {displayText}
          </span>
        ) : (
          <span className="font-semibold text-slate-400">اختر التاريخ</span>
        )}
      </span>
    </button>
  )

  const labelEl = (
    <span
      className={cn(
        'font-black text-[#0C2A4B]/70',
        isInline ? 'shrink-0 whitespace-nowrap text-[11px]' : 'text-[12px]',
      )}
    >
      {label}
      {required ? <span className="text-[#F28C00]"> *</span> : null}
    </span>
  )

  return (
    <div className={cn('text-right', isInline ? 'inline-flex items-center gap-2.5' : 'block')}>
      {isInline ? (
        <>
          {labelEl}
          {triggerButton}
        </>
      ) : (
        <>
          {labelEl}
          {triggerButton}
        </>
      )}
      {error ? <p className={cn('text-[11px] font-bold text-rose-700', isInline ? 'sr-only' : 'mt-1')}>{error}</p> : null}

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
          className="overflow-hidden rounded-2xl border border-[#0C2A4B]/10 bg-white shadow-[0_20px_50px_-12px_rgba(12,42,75,0.35)]"
          dir="rtl"
        >
          <EmcCalendarBody
            viewYear={viewYear}
            viewMonth={viewMonth}
            selectedIso={value}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onSelectDay={selectDay}
            onPreset={applyPreset}
            onSelectMonthYear={selectMonthYear}
            minDate={minDate}
            maxDate={maxDate}
            minYear={minDate ? parseIso(minDate)?.y : undefined}
            maxYear={maxDate ? parseIso(maxDate)?.y : undefined}
            showPresets={showPresets}
          />
        </div>
      </DropdownPortal>
    </div>
  )
}
