import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Calendar, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownPortal } from '@/components/ui/DropdownPortal'
import { CALENDAR_PORTAL_CLASS, EmcCalendarBody, parseIso } from '@/components/ui/EmcCalendarPopover'

const WEEKDAYS_AR_LONG = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] as const

/** Local-date weekday/DMY formatting — never routes through `new Date(iso)`
 *  (which parses as UTC midnight and can shift the displayed day), always
 *  builds the Date from the parsed y/m/d components directly. */
function weekdayOf(iso: string): string {
  const p = parseIso(iso)
  if (!p) return ''
  return WEEKDAYS_AR_LONG[new Date(p.y, p.m - 1, p.d).getDay()]
}

function dmy(iso: string): string {
  const p = parseIso(iso)
  if (!p) return ''
  return `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}`
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type SingleProps = {
  mode: 'single'
  value: string
  onChange: (iso: string) => void
  minDate?: string
  error?: string
}

type RangeProps = {
  mode: 'range'
  from: string
  to: string
  onChange: (range: { from: string; to: string }) => void
  minDate?: string
  error?: string
}

type Props = SingleProps | RangeProps

/** Premium EMC-styled date picker for the availability form — replaces the
 *  native browser `<input type="date">` popup. Built on the shared
 *  EmcCalendarBody/DropdownPortal primitives already used across the admin
 *  and finance modules, extended here with range-selection highlighting. */
export function AvailabilityDatePicker(props: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const min = props.minDate ?? todayIso()

  // Pending range start while the user hasn't picked an end date yet.
  const [pendingFrom, setPendingFrom] = useState<string | null>(null)

  const anchorIso = props.mode === 'single' ? props.value : pendingFrom ?? props.from
  const initial = parseIso(anchorIso) ?? parseIso(todayIso())!
  const [viewYear, setViewYear] = useState(initial.y)
  const [viewMonth, setViewMonth] = useState(initial.m)

  useEffect(() => {
    if (!open) return
    setPendingFrom(null)
    const p = parseIso(anchorIso) ?? parseIso(todayIso())!
    setViewYear(p.y)
    setViewMonth(p.m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1) } else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1) } else setViewMonth((m) => m + 1)
  }

  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (props.mode === 'single') {
      props.onChange(iso)
      setOpen(false)
      return
    }
    // Range: first click sets the start, second click sets the end (swapping
    // if the user clicks an earlier date second) and closes on Apply below.
    if (!pendingFrom) {
      setPendingFrom(iso)
      return
    }
    const from = iso < pendingFrom ? iso : pendingFrom
    const to = iso < pendingFrom ? pendingFrom : iso
    props.onChange({ from, to })
    setPendingFrom(null)
  }

  function applyToday() {
    const t = todayIso()
    if (props.mode === 'single') {
      props.onChange(t)
      setOpen(false)
    } else {
      setPendingFrom(t)
    }
  }

  function clearSelection() {
    if (props.mode === 'single') {
      props.onChange('')
    } else {
      setPendingFrom(null)
    }
  }

  const triggerLabel =
    props.mode === 'single'
      ? props.value
        ? `${weekdayOf(props.value)}، ${dmy(props.value)}`
        : 'اختر التاريخ'
      : props.from && props.to
        ? `${dmy(props.from)} — ${dmy(props.to)}`
        : 'اختر نطاق التاريخ'

  const rangeFrom = props.mode === 'range' ? (pendingFrom ?? props.from) : undefined
  const rangeTo = props.mode === 'range' ? (pendingFrom ? undefined : props.to) : undefined

  return (
    <div>
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`التاريخ: ${triggerLabel}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-2xl border bg-white px-3.5 text-right text-[13px] font-bold text-deepBlue outline-none transition duration-200',
          'hover:border-customBlue/35 focus:border-customBlue focus:ring-4 focus:ring-sky-100',
          props.error ? 'border-red-400' : 'border-slate-200',
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-customBlue" aria-hidden />
        <span className="min-w-0 flex-1 truncate" dir="ltr">
          {(props.mode === 'single' ? props.value : props.from) ? (
            triggerLabel
          ) : (
            <span className="font-semibold text-slate-400" dir="rtl">{triggerLabel}</span>
          )}
        </span>
      </button>
      {props.error && <p className="mt-1 text-[11px] font-semibold text-red-500">{props.error}</p>}

      <DropdownPortal
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        align="start"
        offset={8}
        layer="datetime"
        constrainViewport
        className={CALENDAR_PORTAL_CLASS}
      >
        <AnimatePresence>
          <motion.div
            role="dialog"
            aria-label="اختيار التاريخ"
            initial={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-12px_rgba(12,42,75,0.35)]"
            dir="rtl"
          >
            {props.mode === 'range' && (
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-bold text-deepBlue/60">
                <span>
                  من <span className="font-mono text-deepBlue" dir="ltr">{(pendingFrom ?? props.from) ? dmy(pendingFrom ?? props.from) : '—'}</span>
                </span>
                <span>
                  إلى <span className="font-mono text-deepBlue" dir="ltr">{!pendingFrom && props.to ? dmy(props.to) : '—'}</span>
                </span>
              </div>
            )}

            <EmcCalendarBody
              viewYear={viewYear}
              viewMonth={viewMonth}
              selectedIso={props.mode === 'single' ? props.value : undefined}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onSelectDay={selectDay}
              onPreset={(iso) => {
                if (props.mode === 'single') { props.onChange(iso); setOpen(false) }
                else selectDay(parseIso(iso)!.d)
              }}
              onSelectMonthYear={(y, m) => { setViewYear(y); setViewMonth(m) }}
              minDate={min}
              minYear={parseIso(min)?.y}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              showPresets
            />

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
              <button
                type="button"
                onClick={clearSelection}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-deepBlue/45 transition hover:bg-slate-100 hover:text-deepBlue/70"
              >
                <X className="h-3 w-3" />
                مسح
              </button>
              {props.mode === 'range' ? (
                <button
                  type="button"
                  disabled={!props.from || !props.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-customBlue px-3 py-1.5 text-[11px] font-black text-white transition hover:brightness-105 disabled:opacity-40"
                >
                  تطبيق
                </button>
              ) : (
                <button
                  type="button"
                  onClick={applyToday}
                  className="rounded-lg px-2 py-1 text-[11px] font-bold text-customBlue transition hover:bg-customBlue/5"
                >
                  اليوم
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </DropdownPortal>
    </div>
  )
}
