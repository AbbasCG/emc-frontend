import type { ElementType, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const accentBg: Record<'blue' | 'orange' | 'navy' | 'mint', string> = {
  blue: 'from-[#0077B6]/15 via-white to-transparent',
  orange: 'from-[#F28C00]/14 via-white to-transparent',
  navy: 'from-[#0C2A4B]/14 via-white to-transparent',
  mint: 'from-emerald-400/14 via-white to-transparent',
}

export type EnterpriseMetricTileProps = {
  icon: ElementType
  label: string
  value: ReactNode
  /** Short secondary line — real-derived hints only (avoid inventing KPIs). */
  hint?: string
  deltaLabel?: ReactNode
  accent?: keyof typeof accentBg
  loading?: boolean
}

export function EnterpriseMetricTile({
  icon: Icon,
  label,
  value,
  hint,
  deltaLabel,
  accent = 'blue',
  loading,
}: EnterpriseMetricTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_10px_40px_-12px_rgba(12,42,75,0.12)] ring-1 ring-ink-100/50 backdrop-blur-md',
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-bl opacity-95',
          accentBg[accent],
        )}
      />
      <div className="relative flex items-start justify-between gap-3 text-right rtl:text-right">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-600">{label}</p>
          {loading ?
            <div className="mt-3 h-8 w-[60%] max-w-[7rem] animate-pulse rounded-lg bg-slate-200/80" />
          : <p className="mt-2 text-2xl font-black tabular-nums tracking-tight text-deepBlue">{value}</p>}
          {deltaLabel ?
            <p className="mt-2 text-[11px] font-bold text-emerald-700/90 rtl:text-right">{deltaLabel}</p>
          : null}
          {hint ?
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-muted-600">{hint}</p>
          : null}
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-white to-slate-50 text-customBlue shadow-inner ring-1 ring-ink-100/70">
          <Icon className="h-5 w-5" aria-hidden strokeWidth={2} />
        </span>
      </div>
    </motion.div>
  )
}

/** Marketing-style hero ribbon for dense enterprise CRUD hubs. */
/** Optional springy replace on change — avoids inventing KPIs while adding perceived polish. */
export function AnimatedTabular({ value }: { value: number | string }) {
  return (
    <motion.span layout key={`${typeof value === 'number' ? value : encodeURIComponent(String(value))}`}
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {value}
    </motion.span>
  )
}

export function EnterpriseCrudHero({
  eyebrow,
  title,
  subtitle,
  actions,
  variant = 'navy',
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
  variant?: 'blue' | 'orange' | 'navy'
}) {
  const ring =
    variant === 'orange'
      ? 'ring-accent-400/25'
      : variant === 'blue'
        ? 'ring-customBlue/20'
        : 'ring-deepBlue/[0.12]'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-ink-100/80 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)]',
        ring,
        'bg-gradient-to-bl from-[#0C2A4B] via-[#1a2940] to-[#0F172A]',
      )}
    >
      <div aria-hidden className="pointer-events-none absolute -start-28 top-0 h-64 w-64 rounded-full bg-[#0077B6]/20 blur-[100px]" />
      <div aria-hidden className="pointer-events-none absolute -end-20 bottom-0 h-52 w-52 rounded-full bg-[#F28C00]/14 blur-[90px]" />
      <div className="relative flex flex-wrap items-start justify-between gap-5 p-6 sm:p-8">
        <div className="min-w-0 max-w-3xl text-right text-white rtl:text-right">
          {eyebrow ?
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/65">{eyebrow}</p>
          : null}
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-[1.85rem]">{title}</h1>
          {subtitle ?
            <p className="mt-3 max-w-2xl text-[13px] font-semibold leading-relaxed text-white/82">{subtitle}</p>
          : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

export function EnterpriseTableSkeleton({ cols = 6, rows = 8 }: { cols?: number; rows?: number }) {
  return (
    <div dir="rtl" className="space-y-2 p-4" aria-busy aria-label="جارٍ تحميل الجدول">
      {Array.from({ length: rows }).map((_, ri) => (
        <div
          key={`sk-${String(ri)}`}
          className="flex gap-3 rounded-2xl border border-ink-100/60 bg-white/70 p-3 shadow-sm"
          style={{ animationDelay: `${ri * 40}ms` }}
        >
          {Array.from({ length: cols }).map((__, ci) => (
            <div
              key={`skc-${String(ri)}-${String(ci)}`}
              className="h-4 flex-1 animate-pulse rounded-md bg-gradient-to-r from-slate-200/90 via-slate-100/90 to-slate-200/90"
              style={{ animationDuration: '1.1s' }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
