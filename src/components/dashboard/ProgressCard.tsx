import { motion } from 'framer-motion'

type ProgressCardProps = {
  title: string
  subtitle?: string
  current: number
  total: number
  unit?: string
  color?: 'blue' | 'orange' | 'green'
}

const colorMap = {
  blue:   { bar: 'bg-customBlue',   text: 'text-customBlue'   },
  orange: { bar: 'bg-customOrange', text: 'text-accent-700' },
  green:  { bar: 'bg-emerald-500',  text: 'text-emerald-500'  },
}

export default function ProgressCard({
  title,
  subtitle,
  current,
  total,
  unit = '',
  color = 'blue',
}: ProgressCardProps) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
  const c = colorMap[color]

  return (
    <div className="rounded-2xl border border-deepBlue/[0.06] bg-white p-5 shadow-emc ring-1 ring-deepBlue/[0.03]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-black text-deepBlue">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-deepBlue/45">{subtitle}</p>}
        </div>
        <span className={['text-lg font-black tabular-nums', c.text].join(' ')}>
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 overflow-hidden rounded-full bg-deepBlue/[0.06]">
        <motion.div
          className={['h-full rounded-full', c.bar].join(' ')}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>

      <p className="mt-2.5 text-right text-xs font-bold text-deepBlue/45">
        <span className="tabular-nums">{current}{unit}</span> من <span className="tabular-nums">{total}{unit}</span>
      </p>
    </div>
  )
}
