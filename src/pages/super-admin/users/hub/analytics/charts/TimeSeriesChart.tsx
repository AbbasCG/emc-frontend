import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EMC_CHART_PALETTE, emcTooltipLabelStyle, emcTooltipStyle } from '@/pages/super-admin/crud/shared/enterprise/chartPrimitives'
import { fmtDay, fmtDayFull, fmtInt } from '../format'

/**
 * The time-series charts of the analytics tabs. Loaded lazily (recharts stays out of the first paint of the users page).
 *
 * One accent per chart: the series being read is customBlue, the comparison series is a neutral. Time runs left to right
 * (dates and numbers are LTR); the container is forced LTR so the axes do not mirror, the surrounding page stays RTL.
 */

const ACCENT = EMC_CHART_PALETTE[0]
const NEUTRAL = EMC_CHART_PALETTE[5]

export type TimeSeriesProps =
  | { kind: 'growth'; data: Array<{ date: string; created: number; total: number }>; height?: number; compact?: boolean }
  | { kind: 'logins'; data: Array<{ date: string; events: number; users: number }>; height?: number; compact?: boolean }
  | { kind: 'newVsReturning'; data: Array<{ date: string; new: number; returning: number }>; height?: number; compact?: boolean }

const axisTick = { fontSize: 11, fill: NEUTRAL }

function tickEvery(length: number, compact: boolean): number {
  // keep ≈ 7 date labels (4 in a narrow chart) whatever the window
  return Math.max(0, Math.ceil(length / (compact ? 4 : 7)) - 1)
}

export default function TimeSeriesChart(props: TimeSeriesProps) {
  const height = props.height ?? 240
  const interval = tickEvery(props.data.length, props.compact ?? false)

  const common = {
    margin: { top: 8, right: 8, bottom: 0, left: 0 },
  }
  const xAxis = <XAxis dataKey="date" tickFormatter={fmtDay} tick={axisTick} tickLine={false} axisLine={false} interval={interval} />
  const yAxis = <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} allowDecimals={false} tickFormatter={(v: number) => fmtInt(v)} />
  const grid = <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-200" />

  const tooltip = (labels: Record<string, string>) => (
    <Tooltip
      contentStyle={{ ...emcTooltipStyle, direction: 'rtl', textAlign: 'right' }}
      labelStyle={emcTooltipLabelStyle}
      labelFormatter={(d) => fmtDayFull(String(d))}
      formatter={(value, name) => [fmtInt(Number(value)), labels[String(name)] ?? String(name)]}
    />
  )

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {props.kind === 'growth' ?
          <LineChart data={props.data} {...common}>
            {grid}
            {xAxis}
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
              tickFormatter={(v: number) => fmtInt(v)}
              // fitted to the data: from zero a 7% rise over a month is a flat line
              domain={[(min: number) => Math.max(0, Math.floor(min - 5)), (max: number) => Math.ceil(max + 5)]}
            />
            {tooltip({ total: 'إجمالي الحسابات' })}
            <Line type="monotone" dataKey="total" stroke={ACCENT} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        : props.kind === 'logins' ?
          <LineChart data={props.data} {...common}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip({ events: 'تسجيلات الدخول', users: 'مستخدمون فريدون' })}
            <Line type="monotone" dataKey="events" stroke={ACCENT} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="users" stroke={NEUTRAL} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        : <BarChart data={props.data} {...common}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip({ new: 'جدد (أُنشئ حسابهم في الفترة)', returning: 'عائدون (حسابهم أقدم)' })}
            <Bar dataKey="returning" stackId="a" fill={NEUTRAL} isAnimationActive={false} />
            <Bar dataKey="new" stackId="a" fill={ACCENT} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        }
      </ResponsiveContainer>
    </div>
  )
}
