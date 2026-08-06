import { memo, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatFinanceCurrencyCompact, formatFinanceCurrencyInteger, formatFinanceCount } from '@/utils/financeFormatters'
import { FINANCE_CHART, PROVIDER_COLORS, providerLabelAr } from './chartConfig'
import { SectionShell } from './shared'
import type { ChartPeriod } from './types'

type RevenuePoint = { label: string; revenue: number; expenses: number }
type SourcePoint = { provider: string; name: string; value: number }

const PERIODS: { id: ChartPeriod; label: string }[] = [
  { id: 'monthly', label: 'شهري' },
  { id: 'weekly', label: 'أسبوعي' },
  { id: 'yearly', label: 'سنوي' },
]

function ChartsRowInner({
  revenueExpense,
  revenueSources,
}: {
  revenueExpense: RevenuePoint[]
  revenueSources: SourcePoint[]
}) {
  const [period, setPeriod] = useState<ChartPeriod>('monthly')

  const areaData = useMemo(() => {
    if (period === 'yearly' && revenueExpense.length > 4) {
      return revenueExpense.filter((_, i) => i % 3 === 0 || i === revenueExpense.length - 1)
    }
    if (period === 'weekly' && revenueExpense.length > 2) {
      return revenueExpense.slice(-6)
    }
    return revenueExpense
  }, [period, revenueExpense])

  const pieData = revenueSources.map((s) => ({
    ...s,
    name: providerLabelAr(s.provider),
  }))

  const totalSources = pieData.reduce((a, p) => a + p.value, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SectionShell
        className="lg:col-span-2"
        eyebrow="التحليل"
        title="الإيرادات مقابل المصروفات"
        subtitle="مقارنة تدفقات الدخل والتكاليف للفترة المحددة"
        action={
          <div className="flex rounded-xl bg-slate-50 p-0.5 ring-1 ring-slate-100">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-3 py-1 text-[11px] font-black transition ${
                  period === p.id ? 'bg-white text-deepBlue shadow-sm' : 'text-slate-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      >
        <div dir="ltr" className="h-[280px] w-full">
          {areaData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={FINANCE_CHART.income} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={FINANCE_CHART.income} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={FINANCE_CHART.expense} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={FINANCE_CHART.expense} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 8" stroke={FINANCE_CHART.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Tajawal' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatFinanceCurrencyCompact(v as number)}
                />
                <Tooltip
                  contentStyle={FINANCE_CHART.tooltip}
                  labelStyle={FINANCE_CHART.labelStyle}
                  itemStyle={FINANCE_CHART.itemStyle}
                  formatter={(v, name) => [
                    formatFinanceCurrencyInteger(typeof v === 'number' ? v : 0),
                    name === 'revenue' ? 'إيراد' : 'مصروف',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={FINANCE_CHART.income}
                  strokeWidth={2}
                  fill="url(#revGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke={FINANCE_CHART.expense}
                  strokeWidth={2}
                  fill="url(#expGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="لا توجد بيانات إيرادات للفترة المحددة" />
          )}
        </div>
        <div className="mt-3 flex justify-end gap-4 text-[11px] font-bold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            إيرادات
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            مصروفات
          </span>
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="التوزيع"
        title="مصادر الإيراد"
        subtitle="حسب بوابة الدفع"
      >
        <div dir="ltr" className="relative h-[220px]">
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.provider}
                        fill={PROVIDER_COLORS[entry.provider] ?? PROVIDER_COLORS.other}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={FINANCE_CHART.tooltip}
                    formatter={(v) => formatFinanceCurrencyInteger(typeof v === 'number' ? v : 0)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-latin text-lg font-black text-deepBlue">
                  {totalSources > 0 ? '100%' : '—'}
                </p>
                <p className="text-[10px] font-bold text-slate-400">التوزيع</p>
              </div>
            </>
          ) : (
            <EmptyChart message="لا توجد مدفوعات لعرض التوزيع" />
          )}
        </div>
        {pieData.length > 0 && (
          <ul className="mt-3 space-y-2">
            {pieData.map((s) => {
              const pct = totalSources > 0 ? Math.round((s.value / totalSources) * 100) : 0
              return (
                <motion.li
                  key={s.provider}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between gap-2 text-[11px]"
                >
                  <span className="font-black tabular-nums text-deepBlue font-latin">{formatFinanceCount(pct)}%</span>
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    <span className="truncate font-bold text-slate-600">{s.name}</span>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: PROVIDER_COLORS[s.provider] ?? PROVIDER_COLORS.other }}
                    />
                  </div>
                </motion.li>
              )
            })}
          </ul>
        )}
      </SectionShell>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-2xl">📊</div>
      <p className="max-w-[200px] text-[12px] font-bold text-slate-400">{message}</p>
    </div>
  )
}

export default memo(ChartsRowInner)
