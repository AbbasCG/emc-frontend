import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { BORDER, CARD } from '@/components/detailModal/detailModalTokens'

/**
 * Compact label/value row — controlled columns, never justify-between.
 * Desktop: fixed label column + nearby value. Mobile: stacked.
 * `wide` = volunteer-info spacing (wider label + larger gap).
 */
export function InfoRow({
  label,
  value,
  trailing,
  last,
  wide,
  preserveLineBreaks,
}: {
  label: string
  value: ReactNode
  trailing?: ReactNode
  last?: boolean
  wide?: boolean
  preserveLineBreaks?: boolean
}) {
  const empty = value == null || value === ''
  const cols = wide
    ? 'sm:grid-cols-[minmax(150px,190px)_minmax(0,1fr)] sm:gap-x-8'
    : 'sm:grid-cols-[165px_minmax(0,1fr)] sm:gap-x-7'
  return (
    <div
      data-testid="detail-info-row"
      data-wide={wide ? 'true' : undefined}
      className={`detail-row grid min-h-0 grid-cols-1 items-start gap-1 py-2.5 sm:min-h-[38px] sm:items-center ${cols} ${
        last ? '' : `border-b ${BORDER}`
      }`}
    >
      <span className="detail-row__label text-[12px] font-semibold text-slate-400">{label}</span>
      <div className="detail-row__value flex min-w-0 items-start gap-1.5">
        <div
          className={`min-w-0 text-[13px] font-bold text-deepBlue [overflow-wrap:anywhere] ${preserveLineBreaks ? 'whitespace-pre-line' : ''}`}
          dir="auto"
        >
          {empty ? <span className="font-semibold text-slate-300">غير متوفر</span> : value}
        </div>
        {trailing}
      </div>
    </div>
  )
}

export function CardShell({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`${CARD} p-5 sm:p-6 ${className}`}>
      <h3 className="mb-3.5 flex items-center gap-2 text-[13px] font-black text-customBlue">
        <Icon size={16} className="shrink-0" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  )
}

export function Chips({ items, tone = 'blue' }: { items: string[]; tone?: 'blue' | 'sky' }) {
  if (items.length === 0) {
    return <p className="text-[12px] font-semibold text-slate-300">غير متوفر</p>
  }
  const cls = tone === 'sky'
    ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
    : 'bg-customBlue/10 text-customBlue ring-1 ring-customBlue/15'
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`} dir="auto">
          {item}
        </span>
      ))}
    </div>
  )
}

