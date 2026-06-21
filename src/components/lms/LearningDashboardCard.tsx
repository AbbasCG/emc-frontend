import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

type Props = {
  title: string
  value: string | number
  hint?: string
  icon: LucideIcon
  accent?: 'blue' | 'orange'
}

export default function LearningDashboardCard({
  title,
  value,
  hint,
  icon: Icon,
  accent = 'blue',
}: Props) {
  const glow =
    accent === 'orange'
      ? 'shadow-[0_18px_45px_-18px_rgba(242, 140, 0,0.45)]'
      : 'shadow-[0_18px_45px_-18px_rgba(0, 119, 182,0.38)]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        'relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-deepBlue/[0.06]',
        glow,
      ].join(' ')}
    >
      <div
        className={[
          'absolute -left-8 -top-8 h-24 w-24 rounded-full opacity-[0.12]',
          accent === 'orange' ? 'bg-customOrange' : 'bg-customBlue',
        ].join(' ')}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-black text-deepBlue">{value}</p>
          {hint && <p className="mt-1 text-[11px] font-semibold text-slate-500">{hint}</p>}
        </div>
        <span
          className={[
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            accent === 'orange' ? 'bg-customOrange/15 text-customOrange' : 'bg-customBlue/15 text-customBlue',
          ].join(' ')}
        >
          <Icon size={22} />
        </span>
      </div>
    </motion.div>
  )
}
