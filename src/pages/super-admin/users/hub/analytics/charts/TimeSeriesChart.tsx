import { useCallback, useMemo, useState } from 'react'
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
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { fmtDay, fmtDayFull, fmtInt } from '../format'
import { MAX_SOURCE_LINES, pivotSources, type SourceSeries } from '../sourcesPivot'

/**
 * The time-series charts of the analytics tabs. Loaded lazily (recharts stays out of the first paint of the users page).
 *
 * One accent per chart: the series being read is customBlue, the comparison series is a neutral. Time runs left to right
 * (dates and numbers are LTR); the container is forced LTR so the axes do not mirror, the surrounding page stays RTL.
 */

const ACCENT = EMC_CHART_PALETTE[0]
const NEUTRAL = EMC_CHART_PALETTE[5]
const NAVY = EMC_CHART_PALETTE[2]

export type TimeSeriesProps =
  | { kind: 'growth'; data: Array<{ date: string; created: number; total: number }>; height?: number; compact?: boolean }
  | { kind: 'logins'; data: Array<{ date: string; events: number; users: number }>; height?: number; compact?: boolean }
  | { kind: 'newVsReturning'; data: Array<{ date: string; new: number; returning: number }>; height?: number; compact?: boolean }
  | { kind: 'sources'; data: SourceSeries[]; height?: number; compact?: boolean }

export type { SourceSeries }

const axisTick = { fontSize: 11, fill: NEUTRAL }

/** Below the `sm` breakpoint the plot is ~260px wide. Only a fallback: the chart's own width decides once it is measured. */
const NARROW_QUERY = '(max-width: 639px)'

/** `true` below the `sm` breakpoint; without `matchMedia` (tests) the answer is `false`. */
function useNarrow(): boolean {
  return useMediaQuery(NARROW_QUERY, false)
}

/** The measured width of the chart container (null until the first measurement; never in a test stub). */
function useChartWidth() {
  const [width, setWidth] = useState<number | null>(null)
  const onResize = useCallback((w: number) => setWidth(Math.round(w)), [])
  return { width, onResize }
}

/** Room one date label needs on the axis (≈ 53px of text at 11px, plus a gap), and the y axis it shares the row with. */
const LABEL_SLOT = 64
const Y_AXIS = 44 + 8

/**
 * Recharts `interval` that keeps date labels from touching, whatever the viewport or the panel: the number of labels follows
 * the chart's own width (2 to 7). Before the first measurement it falls back to the breakpoint: 7 wide, 3 compact or narrow.
 */
function tickEvery(length: number, width: number | null, compact: boolean, narrow: boolean): number {
  const target =
    width === null ? (narrow || compact ? 3 : 7) : Math.max(2, Math.min(7, Math.floor((width - Y_AXIS) / LABEL_SLOT)))
  return Math.max(0, Math.ceil(length / target) - 1)
}

function xAxisEl(interval: number) {
  return <XAxis dataKey="date" tickFormatter={fmtDay} tick={axisTick} tickLine={false} axisLine={false} interval={interval} />
}

function yAxisEl() {
  return <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} allowDecimals={false} tickFormatter={(v: number) => fmtInt(v)} />
}

function gridEl() {
  return <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-200" />
}

function tooltipEl(labels: Record<string, string>) {
  return (
    <Tooltip
      contentStyle={{ ...emcTooltipStyle, direction: 'rtl', textAlign: 'right' }}
      labelStyle={emcTooltipLabelStyle}
      labelFormatter={(d) => fmtDayFull(String(d))}
      formatter={(value, name) => [fmtInt(Number(value)), labels[String(name)] ?? String(name)]}
    />
  )
}

const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 0 }

export default function TimeSeriesChart(props: TimeSeriesProps) {
  const narrow = useNarrow()
  const { width, onResize } = useChartWidth()
  if (props.kind === 'sources') return <SourcesChart data={props.data} height={props.height} compact={props.compact} narrow={narrow} />

  const height = props.height ?? 240
  const interval = tickEvery(props.data.length, width, props.compact ?? false, narrow)

  const common = { margin: CHART_MARGIN }
  const xAxis = xAxisEl(interval)
  const yAxis = yAxisEl()
  const grid = gridEl()
  const tooltip = tooltipEl

  return (
    <div dir="ltr" className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} onResize={onResize}>
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

/**
 * Daily sign-ups of the leading sources. The first source is the accent; the rest are navy and slate shades. Every line
 * also has its own dash pattern, so the five stay tellable apart without relying on colour (and in greyscale). The legend
 * draws the same pattern next to each name. Every neutral is at least 4.5:1 on white.
 */
const SOURCE_LINE_STYLES = [
  { stroke: ACCENT, text: '', dash: undefined, cap: 'butt' },
  { stroke: NAVY, text: '', dash: '6 4', cap: 'butt' },
  { stroke: 'currentColor', text: 'text-slate-500', dash: '2 3', cap: 'butt' },
  { stroke: 'currentColor', text: 'text-slate-700', dash: '10 3 2 3', cap: 'butt' },
  { stroke: 'currentColor', text: 'text-slate-600', dash: '1 4', cap: 'round' },
] as const

function SourcesChart({ data, height = 240, compact = false, narrow }: { data: SourceSeries[]; height?: number; compact?: boolean; narrow: boolean }) {
  const { rows, keys, labels } = useMemo(() => pivotSources(data, Math.min(MAX_SOURCE_LINES, SOURCE_LINE_STYLES.length)), [data])
  const { width, onResize } = useChartWidth()
  const interval = tickEvery(rows.length, width, compact, narrow)

  return (
    <div className="min-w-0">
      <div dir="ltr" className="w-full min-w-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} onResize={onResize}>
          <LineChart data={rows} margin={CHART_MARGIN}>
            {gridEl()}
            {xAxisEl(interval)}
            {yAxisEl()}
            {tooltipEl(labels)}
            {keys.map((key, k) => {
              const style = SOURCE_LINE_STYLES[k]
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={style.stroke}
                  className={style.text}
                  strokeDasharray={style.dash}
                  strokeLinecap={style.cap}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600" aria-label="مفتاح الخطوط">
        {keys.map((key, k) => {
          const style = SOURCE_LINE_STYLES[k]
          return (
            <li key={key} className="flex min-w-0 max-w-full items-center gap-2">
              <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden="true" focusable="false" className={`shrink-0 ${style.text}`}>
                <line x1="1" x2="27" y1="4" y2="4" stroke={style.stroke} strokeWidth="2" strokeDasharray={style.dash} strokeLinecap={style.cap} />
              </svg>
              <bdi dir="auto" className="block min-w-0 truncate" title={labels[key]}>
                {labels[key]}
              </bdi>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
