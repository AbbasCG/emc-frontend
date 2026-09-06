import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import FinanceAnimatedNumber from '../FinanceAnimatedNumber'
import FinanceSparkline from '../FinanceSparkline'
import type { FinanceKpiCard } from './types'

const ACCENT: Record<FinanceKpiCard['accent'], { icon: string; spark: string; fill: string; ring: string }> = {
  income: {
    icon: 'bg-emerald-500/10 text-emerald-600',
    spark: 'stroke-emerald-500',
    fill: 'fill-emerald-500/12',
    ring: 'hover:ring-emerald-500/20',
  },
  expense: {
    icon: 'bg-rose-500/10 text-rose-600',
    spark: 'stroke-rose-500',
    fill: 'fill-rose-500/12',
    ring: 'hover:ring-rose-500/20',
  },
  pending: {
    icon: 'bg-amber-500/10 text-amber-600',
    spark: 'stroke-amber-500',
    fill: 'fill-amber-500/12',
    ring: 'hover:ring-amber-500/20',
  },
  neutral: {
    icon: 'bg-brand-500/10 text-brand-600',
    spark: 'stroke-brand-500',
    fill: 'fill-brand-500/12',
    ring: 'hover:ring-brand-500/20',
  },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}

const card = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 0.61, 0.36, 1] as const } },
}

function KpiTooltip({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="cursor-help text-[10px] font-bold text-slate-400 underline decoration-dotted underline-offset-2"
    >
      i
    </span>
  )
}

export default function KpiGrid({
  cards,
  formatCurrency,
}: {
  cards: FinanceKpiCard[]
  formatCurrency: (n: number) => string
}) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((kpi) => {
        const style = ACCENT[kpi.accent]
        const pos = kpi.trendPct === null || kpi.trendPct >= 0
        return (
          <motion.article
            key={kpi.id}
            variants={card}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={`group relative overflow-hidden rounded-2xl border border-deepBlue/[0.05] bg-white p-4 shadow-[0_1px_2px_rgba(12,42,75,0.04)] ring-1 ring-transparent transition-shadow hover:shadow-[0_8px_28px_-12px_rgba(12,42,75,0.15)] ${style.ring}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <KpiTooltip text={kpi.trendLabel} />
                  <p className="text-[11px] font-black text-slate-500">{kpi.label}</p>
                  <span className="text-base" aria-hidden>
                    {kpi.emoji}
                  </span>
                </div>
                <p className="mt-2 font-latin text-xl font-black tabular-nums whitespace-nowrap text-deepBlue sm:text-[1.35rem]" dir="ltr">
                  {kpi.suffix ? (
                    <FinanceAnimatedNumber value={kpi.value} format={(n) => `${Math.round(n)}${kpi.suffix}`} />
                  ) : kpi.id === 'paid_students' || kpi.id === 'outstanding_invoices' ? (
                    <FinanceAnimatedNumber value={kpi.value} format={(n) => String(Math.round(n))} />
                  ) : (
                    <FinanceAnimatedNumber value={kpi.value} format={formatCurrency} />
                  )}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-slate-400">{kpi.trendLabel}</p>
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between gap-2 border-t border-slate-50 pt-3">
              {kpi.trendPct !== null ? (
                <p
                  className={`inline-flex items-center gap-0.5 text-[11px] font-black tabular-nums font-latin ${
                    pos ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {pos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {kpi.trendPct >= 0 ? '+' : ''}
                  {kpi.trendPct.toFixed(1)}٪
                </p>
              ) : (
                <span />
              )}
              <FinanceSparkline
                values={kpi.sparkline}
                className="h-7 w-[68px]"
                strokeClass={style.spark}
                fillClass={style.fill}
              />
            </div>
          </motion.article>
        )
      })}
    </motion.div>
  )
}
