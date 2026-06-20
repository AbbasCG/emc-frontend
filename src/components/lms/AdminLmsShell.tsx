import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { RefreshCw, AlertCircle } from 'lucide-react'

type KpiDef = {
  label: string
  value: number | string
  icon: LucideIcon
  variant?: 'brand' | 'accent' | 'success' | 'muted'
}

type Props = {
  title: string
  description: string
  breadcrumb: string
  kpis?: KpiDef[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onRefresh?: () => void
  action?: ReactNode
  children: ReactNode
}

const variantCls: Record<string, { bg: string; text: string; iconBg: string }> = {
  brand:   { bg: 'from-customBlue/[0.06]',   text: 'text-customBlue',   iconBg: 'bg-customBlue/10 ring-customBlue/20'   },
  accent:  { bg: 'from-customOrange/[0.07]', text: 'text-customOrange', iconBg: 'bg-customOrange/10 ring-customOrange/20' },
  success: { bg: 'from-emerald-50/70',        text: 'text-emerald-700',  iconBg: 'bg-emerald-50 ring-emerald-200'         },
  muted:   { bg: 'from-slate-50/60',          text: 'text-slate-600',    iconBg: 'bg-slate-100 ring-slate-200'            },
}

function KpiCard({ label, value, icon: Icon, variant = 'brand' }: KpiDef) {
  const v = variantCls[variant]
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-deepBlue/[0.07] bg-gradient-to-br ${v.bg} to-white p-5 shadow-sm ring-1 ring-deepBlue/[0.03]`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-deepBlue/50">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${v.iconBg}`}>
          <Icon size={16} strokeWidth={2.2} className={v.text} aria-hidden />
        </span>
      </div>
      <div className="mt-3 emc-display-num text-[2rem] leading-none text-deepBlue">{value}</div>
    </div>
  )
}

function SkeletonKpi() {
  return (
    <div className="rounded-2xl border border-deepBlue/[0.06] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
        <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
      </div>
      <div className="mt-4 h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
    </div>
  )
}

export default function AdminLmsShell({
  title, description, breadcrumb, kpis, loading, error, onRetry, onRefresh, action, children,
}: Props) {
  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs font-semibold text-deepBlue/40">
        <span>لوحة الإدارة</span>
        <span className="text-deepBlue/20">/</span>
        <span>نظام التعلم</span>
        <span className="text-deepBlue/20">/</span>
        <span className="text-deepBlue/70">{breadcrumb}</span>
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-deepBlue leading-tight">{title}</h1>
          <p className="mt-1 text-sm text-deepBlue/50 font-medium">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {action}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 rounded-xl border border-deepBlue/[0.08] bg-white px-3 py-2 text-xs font-bold text-deepBlue/60 shadow-sm transition hover:bg-slate-50 hover:text-deepBlue"
            >
              <RefreshCw size={13} strokeWidth={2.4} />
              تحديث
            </button>
          )}
        </div>
      </div>

      {/* KPI row */}
      {kpis && kpis.length > 0 && (
        <div className={`grid gap-4 ${kpis.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : kpis.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {loading
            ? Array.from({ length: kpis.length }).map((_, i) => <SkeletonKpi key={i} />)
            : kpis.map((k, i) => <KpiCard key={i} {...k} />)
          }
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0 text-rose-500" />
            <p className="text-sm font-bold text-rose-700">{error}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="shrink-0 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-rose-700"
            >
              إعادة المحاولة
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {children}
    </div>
  )
}
