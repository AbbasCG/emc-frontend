import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * EMC <StatTile /> — premium KPI tile for dashboards, admin command centers, and
 * marketing-style stat strips. Renders large Inter numerals, an optional icon
 * cap, an optional delta chip, and an optional caption row.
 *
 * Backward-compatible companion to the existing <StatCard /> primitive — choose
 * StatTile when you want a richer KPI tile, StatCard for compact hero stats.
 */

export type StatTrend = 'up' | 'down' | 'flat'
export type StatTone = 'brand' | 'accent' | 'ink' | 'success' | 'danger' | 'neutral'

type Props = {
  label: string
  value: ReactNode
  /** Right-aligned icon shown in a soft chip. */
  icon?: LucideIcon
  /** Color accent for icon chip + glow. */
  tone?: StatTone
  /** Smaller secondary line under the label. */
  caption?: string
  /** Delta % string, e.g. "+12.4%" or "-3.2%". */
  delta?: string
  trend?: StatTrend
  /** Optional trailing footer node (sparkline placeholder, link, etc.). */
  footer?: ReactNode
  className?: string
}

const toneIconChip: Record<StatTone, string> = {
  brand:   'bg-customBlue/[0.10] text-customBlue ring-customBlue/15',
  accent:  'bg-customOrange/[0.12] text-customOrange ring-customOrange/15',
  ink:     'bg-deepBlue/[0.06] text-deepBlue ring-deepBlue/10',
  success: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
  danger:  'bg-rose-50 text-rose-600 ring-rose-200',
  neutral: 'bg-slate-50 text-slate-500 ring-slate-200',
}

const toneGlow: Record<StatTone, string> = {
  brand:   'before:bg-[radial-gradient(70%_60%_at_85%_0%,rgba(0,119,182,0.16),transparent)]',
  accent:  'before:bg-[radial-gradient(70%_60%_at_85%_0%,rgba(242,140,0,0.14),transparent)]',
  ink:     'before:bg-[radial-gradient(70%_60%_at_85%_0%,rgba(12,42,75,0.10),transparent)]',
  success: 'before:bg-[radial-gradient(70%_60%_at_85%_0%,rgba(16,185,129,0.14),transparent)]',
  danger:  'before:bg-[radial-gradient(70%_60%_at_85%_0%,rgba(244,63,94,0.14),transparent)]',
  neutral: 'before:bg-[radial-gradient(70%_60%_at_85%_0%,rgba(12,42,75,0.06),transparent)]',
}

function trendClasses(trend?: StatTrend) {
  switch (trend) {
    case 'up':   return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'down': return 'bg-rose-50 text-rose-700 ring-rose-200'
    default:     return 'bg-slate-50 text-slate-600 ring-slate-200'
  }
}

export default function StatTile({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  caption,
  delta,
  trend = 'flat',
  footer,
  className,
}: Props) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-2xl border border-deepBlue/[0.07] bg-white p-5 shadow-kpi transition duration-250 ease-emc-out',
        'before:pointer-events-none before:absolute before:inset-0 before:opacity-90',
        toneGlow[tone],
        className,
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-deepBlue/55 font-latin">
            {label}
          </p>
          {caption && (
            <p className="mt-1 line-clamp-1 text-xs font-medium text-deepBlue/55">{caption}</p>
          )}
        </div>
        {Icon && (
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
              toneIconChip[tone],
            )}
          >
            <Icon size={18} strokeWidth={2.2} aria-hidden />
          </span>
        )}
      </div>

      <div className="relative mt-3 flex items-end justify-between gap-3">
        <div className="emc-display-num text-[2rem] leading-none text-deepBlue sm:text-[2.25rem]">
          {value}
        </div>
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ring-1 font-latin',
              trendClasses(trend),
            )}
          >
            {TrendIcon && <TrendIcon size={12} strokeWidth={2.5} />}
            {delta}
          </span>
        )}
      </div>

      {footer && (
        <div className="relative mt-4 border-t border-deepBlue/[0.05] pt-3 text-xs font-bold text-deepBlue/65">
          {footer}
        </div>
      )}
    </article>
  )
}
