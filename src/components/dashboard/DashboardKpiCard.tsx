import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'

export type KpiVariant = 'brand' | 'accent' | 'muted' | 'success'

type Props = {
  label: string
  value: string | number
  icon: LucideIcon
  variant?: KpiVariant
  hint?: string
  trend?: { value: number; direction: 'up' | 'down' }
  loading?: boolean
  href?: string
}

const variantMap: Record<KpiVariant, { iconBg: string; iconColor: string; gradientFrom: string }> = {
  brand:   { iconBg: 'bg-customBlue/[0.10] ring-customBlue/20',     iconColor: 'text-customBlue',   gradientFrom: 'from-customBlue/[0.04]'   },
  accent:  { iconBg: 'bg-customOrange/[0.12] ring-customOrange/20', iconColor: 'text-customOrange', gradientFrom: 'from-customOrange/[0.05]' },
  muted:   { iconBg: 'bg-deepBlue/[0.06] ring-deepBlue/10',         iconColor: 'text-deepBlue',     gradientFrom: 'from-deepBlue/[0.03]'     },
  success: { iconBg: 'bg-emerald-50 ring-emerald-200',               iconColor: 'text-emerald-600',  gradientFrom: 'from-emerald-50/50'       },
}

function Inner({ label, value, icon: Icon, variant = 'brand', hint, trend, loading }: Omit<Props, 'href'>) {
  const v = variantMap[variant]
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-deepBlue/[0.07] bg-gradient-to-br ${v.gradientFrom} to-white p-5 shadow-sm ring-1 ring-deepBlue/[0.03]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-deepBlue/55 font-latin">
            {label}
          </p>
          {hint && (
            <p className="mt-1 line-clamp-1 text-[11px] font-medium text-deepBlue/40">{hint}</p>
          )}
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${v.iconBg}`}
        >
          {loading ? (
            <div className="h-4 w-4 animate-pulse rounded-full bg-slate-200" />
          ) : (
            <Icon size={18} strokeWidth={2.2} className={v.iconColor} aria-hidden />
          )}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        {loading ? (
          <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <div className="emc-display-num text-[2rem] leading-none text-deepBlue">{value}</div>
        )}
        {trend && !loading && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ring-1 font-latin ${
              trend.direction === 'up'
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-rose-50 text-rose-700 ring-rose-200'
            }`}
          >
            {trend.direction === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
    </div>
  )
}

export default function DashboardKpiCard({ href, ...props }: Props) {
  if (href) {
    return (
      <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
        <Link to={href} className="block">
          <Inner {...props} />
        </Link>
      </motion.div>
    )
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Inner {...props} />
    </motion.div>
  )
}
