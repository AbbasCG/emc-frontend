import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  accent?: string
}

export default function PartnerMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'from-customBlue/15 to-sky-50',
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        'relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-bl',
        accent,
        'before:opacity-90',
      ].join(' ')}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-deepBlue">{value}</p>
          {hint && <p className="mt-2 text-xs font-bold text-slate-500">{hint}</p>}
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-deepBlue text-white shadow-lg shadow-deepBlue/25">
          <Icon size={22} />
        </span>
      </div>
    </motion.div>
  )
}
