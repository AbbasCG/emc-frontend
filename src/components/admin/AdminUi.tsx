import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { MoreVertical, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminFieldCls, adminLabelCls } from './adminStyles'

/**
 * The small set of pieces the admin pages share, so Team Members, Department Units and the Ticket
 * Operations Center look and behave alike: KPI cards, a labeled search box and select, status badges,
 * state cards (empty / error / access) and a row actions menu.
 */

type IconType = ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' }>

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info'

const KPI_TONE: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-deepBlue',
  good: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-50 text-amber-700',
  bad: 'bg-rose-50 text-rose-700',
  info: 'bg-sky-50 text-sky-700',
}

export function AdminKpiGrid({ children, label, cols = 4 }: { children: ReactNode; label: string; cols?: 3 | 4 | 5 }) {
  return (
    <section aria-label={label} className={cn('grid grid-cols-2 gap-3', cols === 3 && 'md:grid-cols-3', cols === 4 && 'md:grid-cols-4', cols === 5 && 'md:grid-cols-3 xl:grid-cols-5')}>
      {children}
    </section>
  )
}

export function AdminKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  active,
  onClick,
  loading,
  testId,
}: {
  label: string
  value: number | null
  hint?: string
  icon: IconType
  tone?: Tone
  /** Set (true/false) when the card is a filter toggle; leave undefined for a plain figure. */
  active?: boolean
  onClick?: () => void
  loading?: boolean
  testId?: string
}) {
  const body = (
    <>
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', KPI_TONE[tone])}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-black leading-none text-deepBlue" data-testid={testId}>
          {value === null || loading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-deepBlue/[0.08]" /> : value.toLocaleString('en-US')}
        </span>
        <span className="mt-1 block truncate text-[12px] font-black text-deepBlue/80">{label}</span>
        {hint ? <span className="block truncate text-[10px] font-semibold text-deepBlue/45">{hint}</span> : null}
      </span>
    </>
  )
  const base = 'flex items-center gap-3 rounded-2xl border bg-white p-4 text-start shadow-sm transition'

  if (!onClick) return <div className={cn(base, 'border-deepBlue/[0.08]')}>{body}</div>

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(base, 'focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40', active ? 'border-customBlue ring-2 ring-customBlue/20' : 'border-deepBlue/[0.08] hover:border-customBlue/40 hover:shadow-md')}
    >
      {body}
    </button>
  )
}

export function AdminSearchField({ value, onChange, label, placeholder, className }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string; className?: string }) {
  const id = useId()

  return (
    <div className={className}>
      <label htmlFor={id} className={adminLabelCls}>{label}</label>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-deepBlue/35" aria-hidden="true" />
        <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(adminFieldCls, 'ps-9 pe-9')} />
        {value ?
          <button type="button" onClick={() => onChange('')} aria-label="مسح البحث" className="absolute end-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-deepBlue/45 hover:bg-deepBlue/[0.06]">
            <X size={13} aria-hidden="true" />
          </button>
        : null}
      </div>
    </div>
  )
}

export function AdminSelectField({ label, value, onChange, children, disabled, className }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; disabled?: boolean; className?: string }) {
  const id = useId()

  return (
    <div className={className}>
      <label htmlFor={id} className={adminLabelCls}>{label}</label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={adminFieldCls}>
        {children}
      </select>
    </div>
  )
}

const BADGE_TONE: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  good: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warn: 'bg-amber-50 text-amber-700 ring-amber-200',
  bad: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
}

export function AdminBadge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ring-inset', BADGE_TONE[tone])}>{children}</span>
}

export function AdminStateCard({ icon: Icon, title, body, action, danger = false }: { icon: IconType; title: string; body?: string; action?: ReactNode; danger?: boolean }) {
  return (
    <div role={danger ? 'alert' : 'status'} className="mx-auto max-w-lg rounded-3xl border border-deepBlue/[0.07] bg-white p-8 text-center shadow-sm">
      <span className={cn('mx-auto grid h-14 w-14 place-items-center rounded-full ring-1', danger ? 'bg-red-50 text-red-500 ring-red-100' : 'bg-customBlue/[0.07] text-customBlue ring-customBlue/15')}>
        <Icon size={26} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-black text-deepBlue">{title}</h2>
      {body ? <p className="mt-1.5 text-sm font-bold leading-relaxed text-deepBlue/60">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function AdminRowsSkeleton({ rows = 6, label = 'جارٍ التحميل' }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label={label} data-testid="admin-loading">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-deepBlue/[0.06]" />)}
    </div>
  )
}

export interface MenuItem {
  key: string
  label: string
  icon?: IconType
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

/** A "⋯" button that opens a small menu of the actions available for one row. Escape / outside click close it. */
export function RowActionsMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (items.length === 0) return null

  return (
    <div ref={root} className="relative inline-block">
      <button ref={trigger} type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label={label} className="grid h-8 w-8 place-items-center rounded-lg border border-deepBlue/10 bg-white text-deepBlue/70 hover:border-customBlue/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40">
        <MoreVertical size={15} aria-hidden="true" />
      </button>
      {open ?
        <div role="menu" aria-label={label} className="absolute end-0 z-20 mt-1.5 min-w-44 space-y-0.5 rounded-xl border border-deepBlue/10 bg-white p-1.5 shadow-lg">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false)
                it.onSelect()
              }}
              className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-[12px] font-black transition disabled:opacity-50', it.danger ? 'text-rose-700 hover:bg-rose-50' : 'text-deepBlue hover:bg-deepBlue/[0.05]')}
            >
              {it.icon ? <it.icon size={14} aria-hidden="true" /> : null}
              {it.label}
            </button>
          ))}
        </div>
      : null}
    </div>
  )
}
