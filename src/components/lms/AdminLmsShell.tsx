import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export type LmsKpiDef = {
  label: string
  value: number | string
  icon: LucideIcon
  variant?: 'brand' | 'accent' | 'success' | 'muted' | 'warning'
}

type Props = {
  title: string
  description: string
  breadcrumb: string
  kpis?: LmsKpiDef[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onRefresh?: () => void
  action?: ReactNode
  children: ReactNode
}

const variantCls: Record<string, { ring: string; iconBg: string; text: string; glow: string }> = {
  brand:   { ring: 'ring-[#0077B6]/15', iconBg: 'bg-[#0077B6]/10', text: 'text-[#0077B6]', glow: 'from-[#0077B6]/12' },
  accent:  { ring: 'ring-[#F7941D]/20', iconBg: 'bg-[#F7941D]/10', text: 'text-[#F7941D]', glow: 'from-[#F7941D]/14' },
  success: { ring: 'ring-emerald-200/80', iconBg: 'bg-emerald-50', text: 'text-emerald-700', glow: 'from-emerald-50/90' },
  muted:   { ring: 'ring-slate-200/80', iconBg: 'bg-slate-100', text: 'text-slate-600', glow: 'from-slate-50/90' },
  warning: { ring: 'ring-amber-200/80', iconBg: 'bg-amber-50', text: 'text-amber-700', glow: 'from-amber-50/90' },
}

function KpiCard({ label, value, icon: Icon, variant = 'brand' }: LmsKpiDef) {
  const v = variantCls[variant] ?? variantCls.brand
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className={`relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br ${v.glow} to-white p-5 shadow-[0_8px_30px_-12px_rgba(12,42,75,0.18)] ring-1 ${v.ring} backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#0C2A4B]/45">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${v.iconBg}`}>
          <Icon size={16} strokeWidth={2.2} className={v.text} aria-hidden />
        </span>
      </div>
      <div className="mt-3 emc-display-num text-[2rem] leading-none text-[#0C2A4B]">{value}</div>
    </motion.div>
  )
}

function SkeletonKpi() {
  return (
    <div className="rounded-2xl border border-[#0C2A4B]/6 bg-white/80 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
        <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
      </div>
      <div className="mt-4 h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
    </div>
  )
}

export default function AdminLmsShell({
  title, description, breadcrumb, kpis, loading, error, onRetry, onRefresh, action, children,
}: Props) {
  const kpiCols =
    kpis?.length === 3 ? 'sm:grid-cols-3' :
    kpis?.length === 5 ? 'sm:grid-cols-2 lg:grid-cols-5' :
    kpis?.length === 6 ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' :
    'sm:grid-cols-2 lg:grid-cols-4'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-screen-2xl space-y-6"
      dir="rtl"
    >
      <nav className="flex items-center gap-1.5 text-xs font-semibold text-[#0C2A4B]/40">
        <span>لوحة الإدارة</span>
        <span className="text-[#0C2A4B]/20">/</span>
        <span>نظام التعلم</span>
        <span className="text-[#0C2A4B]/20">/</span>
        <span className="text-[#0C2A4B]/70">{breadcrumb}</span>
      </nav>

      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-l from-[#0C2A4B] via-[#1a2840] to-[#0077B6]/90 p-6 shadow-[0_20px_50px_-20px_rgba(12,42,75,0.45)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[#F7941D]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm font-medium text-white/70">{description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {action}
            {onRefresh ?
              <button
                type="button"
                onClick={onRefresh}
                className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <RefreshCw size={13} strokeWidth={2.4} />
                تحديث
              </button>
            : null}
          </div>
        </div>
      </div>

      {kpis && kpis.length > 0 ?
        <div className={`grid gap-4 grid-cols-1 ${kpiCols}`}>
          {loading ?
            Array.from({ length: kpis.length }).map((_, i) => <SkeletonKpi key={i} />)
          : kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <KpiCard {...k} />
            </motion.div>
          ))}
        </div>
      : null}

      {error ?
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0 text-rose-500" />
            <p className="text-sm font-bold text-rose-700">{error}</p>
          </div>
          {onRetry ?
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-rose-700"
            >
              إعادة المحاولة
            </button>
          : null}
        </div>
      : null}

      <div className="space-y-4">{children}</div>
    </motion.div>
  )
}

/** Alias for shared LMS management pages */
export const LmsManagementShell = AdminLmsShell
