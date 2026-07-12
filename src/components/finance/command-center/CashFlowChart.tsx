import { memo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatEuroCompact, formatEuroInteger } from '@/utils/currency'
import { FINANCE_CHART } from './chartConfig'
import { SectionShell } from './shared'

type Point = {
  label: string
  income: number
  expenses: number
  transfers: number
  net: number
}

function CashFlowChartInner({ data }: { data: Point[] }) {
  return (
    <SectionShell
      eyebrow="التدفق النقدي"
      title="حركة النقد"
      subtitle="الدخل والمصروفات والتحويلات وصافي الحركة"
    >
      <div dir="ltr" className="h-[300px] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                tickFormatter={(v) => formatEuroCompact(v as number)}
              />
              <Tooltip
                contentStyle={FINANCE_CHART.tooltip}
                labelStyle={FINANCE_CHART.labelStyle}
                itemStyle={FINANCE_CHART.itemStyle}
                formatter={(v, name) => {
                  const labels: Record<string, string> = {
                    income: 'دخل',
                    expenses: 'مصروف',
                    transfers: 'تحويل',
                    net: 'صافي',
                  }
                  return [formatEuroInteger(typeof v === 'number' ? v : 0, 'ar'), labels[String(name)] ?? name]
                }}
              />
              <Legend
                wrapperStyle={{ fontFamily: 'Tajawal', fontSize: 11, fontWeight: 700 }}
                formatter={(v) => {
                  const m: Record<string, string> = {
                    income: 'دخل',
                    expenses: 'مصروف',
                    transfers: 'تحويل',
                    net: 'صافي',
                  }
                  return m[v] ?? v
                }}
              />
              <Bar dataKey="income" fill={FINANCE_CHART.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expenses" fill={FINANCE_CHART.expense} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="transfers" fill={FINANCE_CHART.pending} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="net" fill={FINANCE_CHART.brand} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] font-bold text-slate-400">
            لا توجد بيانات تدفق نقدي
          </div>
        )}
      </div>
    </SectionShell>
  )
}

export default memo(CashFlowChartInner)
