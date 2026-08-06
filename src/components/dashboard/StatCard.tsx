import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

type Trend = {
  value: number
  label: string
  direction: 'up' | 'down'
}

type StatCardProps = {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: Trend
  color?: 'blue' | 'orange' | 'green' | 'purple'
}

const colorMap = {
  blue:   { bg: 'bg-sky-50',     icon: 'text-customBlue',  ring: 'ring-sky-100'     },
  orange: { bg: 'bg-orange-50',  icon: 'text-customOrange',ring: 'ring-orange-100'  },
  green:  { bg: 'bg-emerald-50', icon: 'text-emerald-500', ring: 'ring-emerald-100' },
  purple: { bg: 'bg-violet-50',  icon: 'text-violet-500',  ring: 'ring-violet-100'  },
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
}: StatCardProps) {
  const c = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-black text-deepBlue">{value}</p>
          {trend && (
            <div className="mt-3 flex items-center gap-1.5">
              {trend.direction === 'up' ? (
                <TrendingUp size={14} className="shrink-0 text-emerald-500" />
              ) : (
                <TrendingDown size={14} className="shrink-0 text-red-400" />
              )}
              <span
                className={[
                  'text-xs font-bold',
                  trend.direction === 'up' ? 'text-emerald-500' : 'text-red-400',
                ].join(' ')}
              >
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-slate-400">{trend.label}</span>
            </div>
          )}
        </div>

        <div
          className={[
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1',
            c.bg,
            c.ring,
          ].join(' ')}
        >
          <Icon size={22} className={c.icon} />
        </div>
      </div>
    </motion.div>
  )
}
