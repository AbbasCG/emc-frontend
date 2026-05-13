import { motion } from 'framer-motion'
import type { KpiMetric } from '@/types/intelligence'
import { KpiMetricCard } from './KpiMetricCard'

export default function KpiBentoGrid({
  metrics,
  highlights,
}: {
  metrics: KpiMetric[]
  highlights?: string[]
}) {
  return (
    <div className="space-y-8">
      {highlights && highlights.length > 0 && (
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-gradient-to-bl from-deepBlue to-[#152536] p-6 text-right text-white ring-1 ring-white/10"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">لمسات سريعة</p>
          <ul className="mt-3 space-y-2">
            {highlights.map((h, i) => (
              <li key={i} className="text-sm font-semibold text-white/85">
                · {h}
              </li>
            ))}
          </ul>
        </motion.ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => (
          <KpiMetricCard key={m.id} m={m} />
        ))}
      </div>
    </div>
  )
}
