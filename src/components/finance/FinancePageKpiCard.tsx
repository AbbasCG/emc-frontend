import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { financeFadeUp } from './financeTablesShared'

export function FinancePageKpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'blue',
  className = '',
}: {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  accent?: 'blue' | 'orange'
  className?: string
}) {
  return (
    <motion.article
      variants={financeFadeUp}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: [0.22, 0.61, 0.36, 1] as const } }}
      className={[
        'rounded-3xl border bg-white/90 p-5 text-right shadow-sm',
        'border-deepBlue/[0.07] ring-1 ring-deepBlue/[0.03]',
        accent === 'blue' ? 'hover:border-brand-300/40 hover:shadow-emc-glow' : 'hover:border-accent-300/45 hover:shadow-emc-glow-accent',
        className,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 font-latin text-xl font-black tabular-nums text-[#0F172A]">{value}</p>
          {sub ? <p className="mt-1 text-[11px] font-semibold text-slate-500">{sub}</p> : null}
        </div>
        <div
          className={
            accent === 'blue' ?
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/11 text-brand-600'
            : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-500/13 text-accent-600'
          }
        >
          <Icon size={20} aria-hidden />
        </div>
      </div>
    </motion.article>
  )
}
