import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

export default function HrStatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'blue',
}: {
  icon: LucideIcon
  label: string
  value: string | number
  hint?: string
  accent?: 'blue' | 'orange'
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 0.61, 0.36, 1] as const }}
      whileHover={{ y: -2 }}
      className={[
        'rounded-3xl border p-5 text-right shadow-emc backdrop-blur-sm',
        'border-deepBlue/[0.06] bg-white/[0.88] ring-1 ring-deepBlue/[0.04]',
        accent === 'blue' ? 'hover:shadow-emc-glow' : 'hover:shadow-emc-glow-accent',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 font-latin text-2xl font-black tabular-nums text-deepBlue">{value}</p>
          {hint ? <p className="mt-1 text-[11px] font-semibold text-slate-500">{hint}</p> : null}
        </div>
        <div
          className={
            accent === 'blue' ?
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-600'
            : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-500/14 text-accent-600'
          }
        >
          <Icon size={20} aria-hidden />
        </div>
      </div>
    </motion.article>
  )
}
