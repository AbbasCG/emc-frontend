import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Kpi, LoginHistoryCoverage } from '@/api/usersAnalyticsApi'
import { fmtDayFull, fmtInt, fmtPct, fmtPeriod } from './format'
import {
  REPORTING_TIMEZONE,
  RANGE_ERROR_AR,
  RANGE_PRESETS,
  type RangePreset,
  type ResolvedRange,
} from './range'

/* ── tooltip ──────────────────────────────────────────────────────────────── */

/** A tooltip keeps at least this distance from the viewport edges. */
const TIP_MARGIN = 16
const TIP_MAX_WIDTH = 256
/** Gap between the trigger and the tooltip, and the minimum distance from the top edge when it flips above. */
const TIP_GAP = 4
const TIP_EDGE = 8

interface TipPlacement {
  left: number
  /** Below the trigger; the layout effect moves it above when it would not fit. */
  top: number
  width: number
  /** The trigger's rectangle edges when placed (viewport coordinates). */
  anchorTop: number
  anchorBottom: number
}

/**
 * A small «what does this mean» control: hover, focus or press shows the definition; Escape closes it.
 *
 *  - The popover is `position: fixed`, placed from the trigger's rectangle when it opens and clamped to the viewport on
 *    both axes: near the right/left edge it shifts inward, near the bottom it flips above the trigger.
 *  - It sits below the dashboard header and sidebar (z-30), closes on resize, and closes when a scroll moves its trigger
 *    (a keyboard-focus-held tip follows the trigger instead).
 *  - A mouse click on a tip that hover/focus has just opened keeps it open (click only opens/pins). A second tap on a
 *    touch screen closes it. Mouse-leave does not close a tip that has keyboard focus. A hidden trigger (zero size, e.g.
 *    inside a hidden tab) never opens one.
 */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [placement, setPlacement] = useState<TipPlacement | null>(null)
  const id = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tipRef = useRef<HTMLSpanElement>(null)
  const anchorTopRef = useRef(0)
  const hoverRef = useRef(false)
  const focusRef = useRef(false)
  const pointerRef = useRef<{ type: string; wasOpen: boolean } | null>(null)
  const open = placement !== null

  const hide = () => setPlacement(null)

  const place = () => {
    const el = buttonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      hide()
      return
    }
    const viewport = document.documentElement.clientWidth || window.innerWidth
    const width = Math.min(TIP_MAX_WIDTH, viewport - TIP_MARGIN * 2)
    const centred = rect.left + rect.width / 2 - width / 2
    const left = Math.max(TIP_MARGIN, Math.min(centred, viewport - width - TIP_MARGIN))
    anchorTopRef.current = rect.top
    setPlacement({ left, top: rect.bottom + TIP_GAP, width, anchorTop: rect.top, anchorBottom: rect.bottom })
  }

  // Vertical fit needs the popover's own height, known only after it is laid out: flip above the trigger when it would
  // run past the bottom edge (never above the top edge). Written straight to the element: nothing re-renders.
  useLayoutEffect(() => {
    const tip = tipRef.current
    if (!placement || !tip) return
    const height = tip.offsetHeight
    if (placement.anchorBottom + TIP_GAP + height > window.innerHeight - TIP_EDGE) {
      tip.style.top = `${Math.max(TIP_EDGE, placement.anchorTop - TIP_GAP - height)}px`
    }
  }, [placement])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }
    // Scrolling: a tip the keyboard focus holds follows its trigger (the browser smooth-scrolls a focused control into view,
    // so the trigger keeps moving after the tip opens); any other tip closes as soon as its trigger moves. A scroll that
    // does not move the trigger changes nothing.
    const onScroll = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return hide()
      if (Math.abs(rect.top - anchorTopRef.current) <= 1) return
      if (focusRef.current) place()
      else hide()
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', hide)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', hide)
    }
  // `place` and `hide` only read refs and the viewport and set state: re-subscribing on every render would add nothing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => {
        hoverRef.current = true
        place()
      }}
      onMouseLeave={() => {
        hoverRef.current = false
        if (!focusRef.current) hide()
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onPointerDown={(e) => {
          pointerRef.current = { type: e.pointerType, wasOpen: open }
        }}
        onClick={() => {
          const pointer = pointerRef.current
          pointerRef.current = null
          if (pointer?.type === 'touch' && pointer.wasOpen) hide()
          else place()
        }}
        onFocus={() => {
          focusRef.current = true
          place()
        }}
        onBlur={() => {
          focusRef.current = false
          hide()
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue"
      >
        <Info className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </button>
      {placement ?
        <span
          ref={tipRef}
          id={id}
          role="tooltip"
          style={{ left: placement.left, top: placement.top, width: placement.width }}
          className="fixed z-30 rounded-xl border border-slate-200 bg-white p-3 text-start text-xs leading-6 text-slate-600 shadow-sm"
        >
          {children}
        </span>
      : null}
    </span>
  )
}

/* ── containers ───────────────────────────────────────────────────────────── */

export function Panel({
  title,
  tip,
  tipLabel,
  aside,
  children,
  className,
}: {
  title: string
  tip?: ReactNode
  tipLabel?: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section aria-label={title} className={cn('min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-5', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <h3 className="text-sm font-semibold text-navy">{title}</h3>
          {tip ? <InfoTip label={tipLabel ?? `ما معنى ${title}`}>{tip}</InfoTip> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-xl bg-slate-100', className)} />
}

export function EmptyNote({ children = 'لا توجد بيانات في هذه الفترة' }: { children?: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">{children}</p>
  )
}

/* ── metric card ──────────────────────────────────────────────────────────── */

export interface MetricCardProps {
  label: string
  /** Pre-formatted value; `null` renders an em dash. */
  value: string | null
  tip: ReactNode
  /** The comparison (only when the period comparison is on). */
  kpi?: Kpi
  compare?: boolean
  /** Not affected by the period (e.g. total accounts today). */
  cumulative?: boolean
  note?: ReactNode
  loading?: boolean
  /** A short tag next to the label (e.g. «زيارات») for a figure that must not be read as the card beside it. */
  badge?: string
}

export function MetricCard({ label, value, tip, kpi, compare, cumulative, note, loading, badge }: MetricCardProps) {
  return (
    <div role="group" aria-label={label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-1">
        <span className="text-xs font-medium leading-5 text-slate-500">{label}</span>
        <InfoTip label={`ما معنى ${label}`}>{tip}</InfoTip>
        {badge ? <span className="ms-auto rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{badge}</span> : null}
      </div>

      {loading ?
        <Skeleton className="mt-3 h-9 w-24" />
      : <p className="mt-2 text-2xl font-semibold tabular-nums text-navy sm:text-3xl">
          <bdi dir="ltr">{value ?? '—'}</bdi>
        </p>}

      <div className="mt-2 min-h-[2.5rem] text-xs leading-5">
        {cumulative ?
          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">تراكمي · لا يتأثر بالفترة</span>
        : compare && kpi ?
          <ChangeLine kpi={kpi} />
        : null}
        {note ? <p className="mt-1 text-slate-500">{note}</p> : null}
      </div>
    </div>
  )
}

function ChangeLine({ kpi }: { kpi: Kpi }) {
  if (kpi.previous === null) return null
  if (kpi.change_pct === null) {
    return <span className="text-slate-500">الفترة السابقة: {fmtInt(kpi.previous)} · لا نسبة للمقارنة</span>
  }
  const tone = kpi.change_pct > 0 ? 'text-emerald-700' : kpi.change_pct < 0 ? 'text-red-700' : 'text-slate-600'
  return (
    <>
      <span className={cn('font-medium tabular-nums', tone)} dir="ltr">
        {fmtPct(kpi.change_pct, true)}
      </span>{' '}
      <span className="text-slate-500">عن الفترة السابقة ({fmtInt(kpi.previous)})</span>
    </>
  )
}

/* ── period filter ────────────────────────────────────────────────────────── */

export function RangeFilter({
  range,
  compare,
  today,
  onPreset,
  onCustom,
  onCompare,
}: {
  range: ResolvedRange
  compare: boolean
  today: string
  onPreset: (preset: Exclude<RangePreset, 'custom'>) => void
  onCustom: (from: string, to: string) => keyof typeof RANGE_ERROR_AR | null
  onCompare: (on: boolean) => void
}) {
  const [customOpen, setCustomOpen] = useState(range.preset === 'custom')
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)
  const [error, setError] = useState<keyof typeof RANGE_ERROR_AR | null>(null)
  const fromId = useId()
  const toId = useId()

  const apply = () => {
    const result = onCustom(from, to)
    setError(result)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="الفترة الزمنية" className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1">
          {RANGE_PRESETS.map((p) => {
            const active = p.id === 'custom' ? customOpen || range.preset === 'custom' : range.preset === p.id
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (p.id === 'custom') {
                    setCustomOpen(true)
                    return
                  }
                  setCustomOpen(false)
                  setError(null)
                  onPreset(p.id)
                }}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue',
                  active ? 'bg-navy font-medium text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-navy',
                )}
              >
                {p.labelAr}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={compare}
          onClick={() => onCompare(!compare)}
          className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue"
        >
          <span
            aria-hidden="true"
            className={cn('relative h-5 w-9 rounded-full transition-colors', compare ? 'bg-customBlue' : 'bg-slate-300')}
          >
            <span
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[inset-inline-start]',
                compare ? 'start-[1.125rem]' : 'start-0.5',
              )}
            />
          </span>
          مقارنة بالفترة السابقة
        </button>
      </div>

      {customOpen ?
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <label htmlFor={fromId} className="mb-1 block text-xs font-medium text-slate-500">
              من
            </label>
            <input
              id={fromId}
              type="date"
              value={from}
              max={today}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue"
            />
          </div>
          <div>
            <label htmlFor={toId} className="mb-1 block text-xs font-medium text-slate-500">
              إلى
            </label>
            <input
              id={toId}
              type="date"
              value={to}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue"
            />
          </div>
          <button
            type="button"
            onClick={apply}
            className="h-10 rounded-xl bg-navy px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue focus-visible:ring-offset-2"
          >
            تطبيق
          </button>
          {error ?
            <p role="alert" className="basis-full text-sm text-red-700">
              {RANGE_ERROR_AR[error]}
            </p>
          : null}
        </div>
      : null}

      <p className="text-xs text-slate-500">
        {fmtPeriod(range.from, range.to)} · {range.days === 1 ? 'يوم واحد' : `${range.days} يومًا`} · التوقيت: {REPORTING_TIMEZONE}
      </p>
    </div>
  )
}

/* ── data notes ───────────────────────────────────────────────────────────── */

/** What the login figures cover. Always shown next to them: the limits are part of the number. */
export function LoginDataNotes({ coverage }: { coverage: LoginHistoryCoverage }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
      <p>
        تُحسب أرقام الدخول من أحداث تسجيل الدخول المسجَّلة فقط. لا تشمل الجلسات المستمرة دون تسجيل دخول جديد، ولا محاولات الدخول الفاشلة.
      </p>
      {coverage.first_event_at === null ?
        <p className="mt-1 font-medium text-navy">لم يُسجَّل أي حدث دخول بعد، لذا أرقام الدخول صفر.</p>
      : coverage.partial ?
        <p className="mt-1 font-medium text-navy">
          التغطية التاريخية جزئية: أقدم حدث دخول مسجَّل في {fmtDayFull(coverage.first_event_at.slice(0, 10))}، فالأرقام قبله ناقصة.
        </p>
      : <p className="mt-1 text-slate-500">أقدم حدث دخول مسجَّل: {fmtDayFull(coverage.first_event_at.slice(0, 10))}</p>}
    </div>
  )
}

/* ── distribution widgets (no chart library: they are lists) ──────────────── */

export function DistributionList({
  rows,
  total,
  empty,
  ariaLabel,
  labelledBy,
}: {
  rows: Array<{
    key: string
    label: ReactNode
    value: number
    detail?: ReactNode
    /** The full text, shown on hover when the label is cut short (free-text rows). */
    title?: string
    /** A remainder row («others», «unknown»): never takes the accent, even when it is first. */
    quiet?: boolean
  }>
  /** When given, each row also shows its share of this total. */
  total?: number
  empty?: ReactNode
  /** The list's accessible name: a text, or the id of a visible heading. */
  ariaLabel?: string
  labelledBy?: string
}) {
  const max = Math.max(0, ...rows.map((r) => r.value))
  if (rows.length === 0 || max === 0) return <EmptyNote>{empty}</EmptyNote>

  return (
    <ul className="space-y-3" aria-label={labelledBy ? undefined : ariaLabel} aria-labelledby={labelledBy}>
      {rows.map((r, i) => (
        <li key={r.key} className="min-w-0">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className={cn('min-w-0 truncate', r.quiet ? 'text-slate-500' : 'text-slate-700')} title={r.title}>
              {r.label}
            </span>
            <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
              <span className="text-navy">{fmtInt(r.value)}</span>
              {total ? <span className="text-xs text-slate-500" dir="ltr">{fmtPct((r.value / total) * 100)}</span> : null}
              {r.detail ? <span className="text-xs text-slate-500">{r.detail}</span> : null}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full', i === 0 && !r.quiet ? 'bg-customBlue' : 'bg-slate-300')}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ShareBar({ segments }: { segments: Array<{ key: string; label: string; value: number }> }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <EmptyNote />
  const tones = ['bg-customBlue', 'bg-slate-400', 'bg-slate-300', 'bg-slate-200']

  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={segments.map((s) => `${s.label}: ${fmtInt(s.value)}`).join('، ')}>
        {segments.map((s, i) => (
          <div key={s.key} className={tones[Math.min(i, tones.length - 1)]} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {segments.map((s, i) => (
          <li key={s.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', tones[Math.min(i, tones.length - 1)])} />
              {s.label}
            </span>
            <span className="tabular-nums text-navy">{fmtInt(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
