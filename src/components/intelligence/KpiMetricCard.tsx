import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { KpiMetric } from '@/types/intelligence'

export function KpiMetricCard({ m }: { m: KpiMetric }) {
  const TrendIcon = m.trend === 'up' ? ArrowUpRight : m.trend === 'down' ? ArrowDownRight : Minus
  const trendCls =
    m.trend === 'up' ? 'text-emerald-600' : m.trend === 'down' ? 'text-red-500' : 'text-slate-400'

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className={[
        'rounded-2xl bg-white p-5 text-right shadow-md ring-1 ring-deepBlue/[0.05]',
        m.accent === 'orange'
          ? 'border-r-4 border-customOrange'
          : 'border-r-4 border-customBlue',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        {m.trend && <TrendIcon size={18} className={trendCls} />}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{m.label}</p>
          <p className="mt-2 text-2xl font-black text-deepBlue">{m.value}</p>
          {m.hint && <p className="mt-1 text-[10px] font-bold text-slate-500">{m.hint}</p>}
        </div>
      </div>
    </motion.div>
  )
}
