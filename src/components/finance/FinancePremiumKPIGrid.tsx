import { motion } from 'framer-motion'
import { AlertTriangle, Banknote, BarChart3, Clock3, Percent, TrendingUp, type LucideIcon } from 'lucide-react'
import type { FinanceDashboardData } from '@/types/intelligence'
import FinanceSparkline from './FinanceSparkline'
import {
  avgCapturedAmount,
  monthOverMonthGrowthPct,
  pendingCountPreview,
  successRatePct,
} from './financeDashboardDerivations'

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.06 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] as const },
  },
}

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  series,
  accent,
}: {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  trend?: { pct: number; label: string }
  series: number[]
  accent: 'blue' | 'orange'
}) {
  const pos = trend && trend.pct >= 0
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -3, transition: { duration: 0.22, ease: [0.22, 0.61, 0.36, 1] } }}
      className={[
        'group relative overflow-hidden rounded-3xl p-5 text-right shadow-emc backdrop-blur-sm',
        'border border-deepBlue/[0.06] bg-white/[0.82] ring-1 ring-deepBlue/[0.04]',
        accent === 'blue' ? 'hover:shadow-emc-glow' : 'hover:shadow-emc-glow-accent',
      ].join(' ')}
    >
      <div
        aria-hidden
        className={
          accent === 'blue' ?
            'pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-brand-400/14 blur-2xl transition-opacity group-hover:opacity-110'
          : 'pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-accent-400/16 blur-2xl'
        }
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-2 truncate font-latin text-xl font-black tabular-nums whitespace-nowrap text-deepBlue" dir="ltr">{value}</p>
              {sub ? <p className="mt-1 text-[11px] font-bold text-slate-500">{sub}</p> : null}
            </div>
            <div
              className={
                accent === 'blue' ?
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-600'
                : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-500/14 text-accent-600'
              }
            >
              <Icon size={20} aria-hidden />
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 pt-2">
            {trend ? (
              <p
                className={[
                  'inline-flex items-center gap-1 text-[11px] font-black tabular-nums font-latin',
                  pos ? 'text-emerald-600' : 'text-rose-600',
                ].join(' ')}
              >
                <TrendingUp size={14} aria-hidden className={pos ? '' : 'rotate-180'} />
                <span>
                  {trend.pct >= 0 ? '+' : ''}
                  {trend.pct.toFixed(1)}٪
                </span>
                <span className="font-bold text-slate-400">{trend.label}</span>
              </p>
            ) : (
              <span />
            )}
            <FinanceSparkline
              values={series}
              className="h-8 w-[72px]"
              strokeClass={accent === 'blue' ? 'stroke-brand-500' : 'stroke-accent-500'}
              fillClass={accent === 'blue' ? 'fill-brand-500/12' : 'fill-accent-500/14'}
            />
          </div>
        </div>
      </div>
    </motion.article>
  )
}

export default function FinancePremiumKPIGrid({
  data,
  formatCurrency,
}: {
  data: FinanceDashboardData
  formatCurrency: (n: number) => string
}) {
  const series = data.monthly_revenue.map((m) => m.amount)
  const g = monthOverMonthGrowthPct(data.monthly_revenue)
  const growthTrend = g !== null ? { pct: g, label: 'شهريًا' } : undefined

  const success = successRatePct(data)
  const avg = avgCapturedAmount(data)
  const pendingN = pendingCountPreview(data.latest_payments)

  const confirmedShape = growthTrend ?
    series.map((x) => x * (data.confirmed_revenue / Math.max(data.total_revenue, 1)))
  : series

  const pendingShape = growthTrend ?
    series.map((x) => x * (data.pending_revenue / Math.max(data.total_revenue, 1)))
  : series.slice(-Math.min(series.length, 6))

  return (
    <motion.section
      initial="hidden"
      animate="show"
      variants={stagger}
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-labelledby="finance-kpis-heading"
    >
      <h2 id="finance-kpis-heading" className="sr-only">
        مؤشرات الأداء المالي
      </h2>

      <KPICard
        icon={TrendingUp}
        label="إجمالي الإيرادات"
        value={formatCurrency(data.total_revenue)}
        sub={`مسار شهرية: ${data.monthly_revenue.length} نقاط`}
        trend={growthTrend}
        series={series}
        accent="blue"
      />
      <KPICard
        icon={Banknote}
        label="المدفوعات الناجحة"
        value={formatCurrency(data.confirmed_revenue)}
        sub="مجموع المبالغ المؤكدة للفترة"
        series={confirmedShape}
        accent="blue"
      />
      <KPICard
        icon={Clock3}
        label="المدفوعات المعلقة"
        value={formatCurrency(data.pending_revenue)}
        sub={`${pendingN} قائمة انتظار في العيّنة`}
        series={pendingShape}
        accent="orange"
      />
      <KPICard
        icon={AlertTriangle}
        label="العمليات الفاشلة"
        value={String(data.failed_count)}
        sub="عدد العمليات من الملخص"
        series={series.length >= 4 ? series.slice(-4) : [0, data.failed_count, data.failed_count * 0.7, data.failed_count]}
        accent="orange"
      />
      <KPICard
        icon={BarChart3}
        label="متوسط قيمة العملية"
        value={formatCurrency(avg)}
        sub="من المؤكدة في أحدث المدفوعات"
        series={series}
        accent="blue"
      />
      <KPICard
        icon={Percent}
        label="نسبة النجاح"
        value={`${success}٪`}
        sub="مؤكد ÷ إجمالي الإيرادات"
        series={[Math.max(12, success - 10), success - 3, success + 2, success].map((x) => Math.min(100, Math.max(0, x)))}
        accent="orange"
      />
    </motion.section>
  )
}
