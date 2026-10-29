import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EMC_CHART_PALETTE, emcTooltipItemStyle, emcTooltipLabelStyle, emcTooltipStyle } from '@/pages/super-admin/crud/shared/enterprise/chartPrimitives'
import type { FormAnalytics } from '@/api/formsAnalyticsApi'

const GRANULARITY_AR = { day: 'يومياً', week: 'أسبوعياً (بداية الأسبوع)', month: 'شهرياً' } as const

const BRAND = EMC_CHART_PALETTE[0]
const NAVY = EMC_CHART_PALETTE[2]
const MUTED = EMC_CHART_PALETTE[5]

/** "2026-03-02" → "2 مارس", "2026-03" → "مارس 2026", in the reader's calendar but always Gregorian. */
function periodLabel(period: string, granularity: FormAnalytics['series']['granularity']): string {
  const [y, m, d] = period.split('-').map(Number)
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  const opts: Intl.DateTimeFormatOptions = granularity === 'month' ? { month: 'long', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' }

  return new Intl.DateTimeFormat('ar-EG-u-ca-gregory-nu-latn', opts).format(date)
}

/**
 * Responses per day, week or month: one series, one colour, columns from a single baseline. The same numbers are one click away
 * as a table, for screen readers and for anyone who wants the exact values.
 */
export default function ResponsesOverTimeChart({ series }: { series: FormAnalytics['series'] }) {
  const [asTable, setAsTable] = useState(false)
  const data = series.points.map((p) => ({ ...p, label: periodLabel(p.period, series.granularity) }))
  const total = data.reduce((n, p) => n + p.count, 0)

  return (
    <section aria-labelledby="series-title" className="rounded-2xl bg-white p-5 text-right shadow-md ring-1 ring-deepBlue/[0.06]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="series-title" className="text-sm font-black text-deepBlue">الردود عبر الزمن</h3>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{GRANULARITY_AR[series.granularity]} · {total} رداً في الفترة المعروضة</p>
        </div>
        {data.length > 0 && (
          <button type="button" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} className="rounded-lg px-3 py-1.5 text-[11px] font-black text-customBlue ring-1 ring-customBlue/25 hover:bg-customBlue/5">
            {asTable ? 'عرض كرسم بياني' : 'عرض كجدول'}
          </button>
        )}
      </div>

      {data.length === 0 ? (
        <p className="mt-6 rounded-xl bg-slate-50 px-4 py-8 text-center text-xs font-bold text-slate-500">لا توجد ردود في هذه الفترة بعد.</p>
      ) : asTable ? (
        <div className="mt-4 max-h-72 overflow-auto">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 bg-white text-slate-500">
              <tr><th scope="col" className="py-2 font-black">الفترة</th><th scope="col" className="py-2 font-black">عدد الردود</th></tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.period} className="border-t border-slate-100">
                  <td className="py-1.5 font-semibold text-deepBlue">{p.label}</td>
                  <td className="py-1.5 font-bold tabular-nums text-deepBlue">{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div dir="ltr" className="mt-4 h-60 w-full" role="img" aria-label={`رسم بياني لعدد الردود ${GRANULARITY_AR[series.granularity]}، المجموع ${total}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid stroke={MUTED} strokeOpacity={0.25} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: NAVY, fontSize: 10, opacity: 0.7 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fill: NAVY, fontSize: 10, opacity: 0.7 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                cursor={{ fill: BRAND, fillOpacity: 0.08 }}
                contentStyle={emcTooltipStyle}
                labelStyle={emcTooltipLabelStyle}
                itemStyle={emcTooltipItemStyle}
                formatter={(v) => [String(v), 'الردود']}
              />
              <Bar dataKey="count" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
