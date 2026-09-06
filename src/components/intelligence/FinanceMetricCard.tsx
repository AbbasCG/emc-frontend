import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

export default function FinanceMetricCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'blue',
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  accent?: 'blue' | 'orange'
}) {
  const glow =
    accent === 'orange'
      ? 'shadow-[0_18px_42px_-18px_rgba(242,140,0,0.35)]'
      : 'shadow-[0_18px_42px_-18px_rgba(0,119,182,0.35)]'

  return (
    <motion.div
      layout
      whileHover={{ y: -3 }}
      className={[
        'relative overflow-hidden rounded-2xl bg-white p-5 text-right ring-1 ring-deepBlue/[0.06]',
        glow,
      ].join(' ')}
    >
      <div
        className={
          accent === 'orange'
            ? 'pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-customOrange/12 blur-2xl'
            : 'pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-customBlue/12 blur-2xl'
        }
      />
      <div className="relative flex items-start justify-between gap-3">
        <Icon size={22} className={accent === 'orange' ? 'text-customOrange' : 'text-customBlue'} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-black text-deepBlue">{value}</p>
          {hint && <p className="mt-1 text-[11px] font-bold text-slate-500">{hint}</p>}
        </div>
      </div>
    </motion.div>
  )
}
