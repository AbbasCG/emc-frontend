import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, LayoutGrid, RefreshCcw, Timer, Zap } from 'lucide-react'
import FinanceSparkline from './FinanceSparkline'
import { formatFinanceCount, formatFinanceCurrencyInteger } from '@/utils/financeFormatters'
import type { FinanceDashboardData } from '@/types/intelligence'
import { gatewayTotalsFromPayments, pickTopCourse, pickTopTrack } from './financeDashboardDerivations'

function fmt(n: number) {
  return formatFinanceCurrencyInteger(n)
}

const PROVIDER_LABEL: Record<string, string> = {
  stripe: 'سترايب',
  paypal: 'باي بال',
  fake: 'تجريبي',
}

function BentoShell({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-3xl border border-deepBlue/[0.06] bg-white/[0.88] p-5 shadow-emc backdrop-blur-sm ring-1 ring-deepBlue/[0.04]',
        'transition-shadow hover:shadow-emc-md',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export default function FinanceBentoWidgets({ data }: { data: FinanceDashboardData }) {
  const topCourse = pickTopCourse(data)
  const topTrack = pickTopTrack(data)
  const refunds = data.latest_payments.filter((p) => p.status === 'refunded').slice(0, 4)
  const pendings = data.latest_payments.filter((p) => p.status === 'pending').slice(0, 4)
  const gateways = gatewayTotalsFromPayments(data.latest_payments)
  const gwMax = Math.max(...gateways.map((g) => g.amount), 1)
  const trendSeries = data.monthly_revenue.map((m) => m.amount).slice(-6)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 0.61, 0.36, 1] }}
      className="grid auto-rows-fr gap-4"
      aria-label="لمحات ورؤى مالية"
    >
      <BentoShell className="lg:col-span-1">
        <div className="flex items-start justify-between gap-2 text-right">
          <div className="min-w-0">
            <p className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-wide text-brand-600">
              <BookOpen size={14} aria-hidden /> أقوى دورة
            </p>
            <p className="mt-2 line-clamp-2 text-base font-black text-deepBlue">
              {topCourse?.course_name ?? '—'}
            </p>
            <p className="mt-1 font-latin text-lg font-black text-brand-600">{topCourse ? fmt(topCourse.amount) : '—'}</p>
          </div>
          <FinanceSparkline
            values={trendSeries.length ? trendSeries : [0]}
            className="h-10 w-24 opacity-90"
          />
        </div>
      </BentoShell>

      <BentoShell>
        <div className="text-right">
          <p className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-wide text-accent-600">
            <LayoutGrid size={14} aria-hidden /> أعلى مسار إيرادًا
          </p>
          <p className="mt-2 line-clamp-2 font-black text-deepBlue">{topTrack?.track_name ?? '—'}</p>
          <p className="mt-1 font-latin text-lg font-black text-accent-600">{topTrack ? fmt(topTrack.amount) : '—'}</p>
        </div>
      </BentoShell>

      <BentoShell>
        <p className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
          <RefreshCcw size={14} aria-hidden /> استردادات حديثة (عيّنة)
        </p>
        <ul className="mt-3 space-y-2 text-right">
          {refunds.length === 0 ?
            <li className="text-xs font-bold text-slate-400">لا توجد استردادات في العيّنة</li>
          : refunds.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-[12px] font-bold text-deepBlue">
                <span className="font-latin tabular-nums text-customOrange">{fmt(r.amount)}</span>
                <span className="truncate">{r.course_name || `#${r.id}`}</span>
              </li>
            ))}
        </ul>
      </BentoShell>

      <BentoShell>
        <p className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-wide text-amber-700">
          <Timer size={14} aria-hidden /> معلّقات في العيّنة
        </p>
        <ul className="mt-3 space-y-2 text-right">
          {pendings.length === 0 ?
            <li className="text-xs font-bold text-slate-400">لا توجد معلّقات في العيّنة</li>
          : pendings.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-[12px] font-bold text-deepBlue">
                <span className="font-latin tabular-nums text-brand-600">{fmt(r.amount)}</span>
                <span className="truncate">{r.course_name || `#${r.id}`}</span>
              </li>
            ))}
        </ul>
      </BentoShell>

      <BentoShell className="sm:col-span-1">
        <p className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-wide text-brand-600">
          <Zap size={14} aria-hidden /> أداء المزوّدين (عيّنة)
        </p>
        <ul className="mt-4 space-y-3">
          {gateways.length === 0 ?
            <li className="text-right text-xs font-bold text-slate-400">لا بيانات</li>
          : gateways.map((g) => (
              <li key={g.provider} className="text-right">
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-black text-deepBlue">
                  <span className="font-latin tabular-nums text-slate-500">{formatFinanceCount(Math.round((g.amount / gwMax) * 100))}%</span>
                  <span>{PROVIDER_LABEL[g.provider.toLowerCase()] ?? g.provider}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(g.amount / gwMax) * 100}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                    className="h-full rounded-full bg-gradient-to-l from-brand-500 to-accent-500"
                  />
                </div>
              </li>
            ))}
        </ul>
      </BentoShell>

      <BentoShell>
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">اتجاه آخر الفترات</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <FinanceSparkline
            values={trendSeries.length ? trendSeries : [0]}
            className="h-12 w-full max-w-[200px]"
            strokeClass="stroke-deepBlue"
            fillClass="fill-brand-500/10"
          />
          <span className="text-[11px] font-bold leading-snug text-slate-500">من سلسلة الإيراد الشهري</span>
        </div>
      </BentoShell>
    </motion.div>
  )
}
