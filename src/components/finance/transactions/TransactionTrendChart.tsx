import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FinancialTransaction } from '@/types/intelligence'
import { formatEuroCompact, formatEuroInteger } from '@/utils/currency'
import { deriveTransactionTrend } from './deriveTrend'
import { TREND_RANGE_OPTIONS, type TrendRangeKey } from './constants'
import { FINANCE_CHART } from '@/components/finance/command-center/chartConfig'

export default function TransactionTrendChart({
  rows,
  rangeKey,
  onRangeChange,
}: {
  rows: FinancialTransaction[]
  rangeKey: TrendRangeKey
  onRangeChange: (k: TrendRangeKey) => void
}) {
  const points = useMemo(() => deriveTransactionTrend(rows, rangeKey), [rows, rangeKey])

  if (points.length < 2) return null

  return (
    <section
      dir="rtl"
      className="rounded-[20px] border border-[#E2E8F0] bg-white p-5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.1)]"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2691C2]">تحليلات</p>
          <h2 className="mt-1 text-sm font-black text-[#0F172A]">نشاط المعاملات</h2>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {TREND_RANGE_OPTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onRangeChange(r.value)}
              className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
                rangeKey === r.value
                  ? 'bg-[#22334A] text-white'
                  : 'bg-[#F6F8FB] text-[#64748B] hover:bg-[#E2E8F0]/80'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div dir="ltr" className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="txTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2691C2" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#2691C2" stopOpacity={0} />
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
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatEuroCompact(v as number)}
            />
            <Tooltip
              contentStyle={FINANCE_CHART.tooltip}
              labelStyle={FINANCE_CHART.labelStyle}
              itemStyle={FINANCE_CHART.itemStyle}
              formatter={(v, _n, item) => {
                const payload = item?.payload as { count?: number } | undefined
                const count = payload?.count ?? 0
                return [
                  `${formatEuroInteger(typeof v === 'number' ? v : 0, 'ar')} · ${count} معاملة`,
                  'الحجم',
                ]
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#2691C2"
              strokeWidth={2}
              fill="url(#txTrendFill)"
              dot={false}
              activeDot={{ r: 4, fill: '#2691C2' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
