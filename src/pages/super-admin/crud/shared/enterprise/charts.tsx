import type { CSSProperties } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from 'recharts'

export const EMC_CHART_PALETTE = ['#0077B6', '#F28C00', '#0C2A4B', '#10B981', '#6366F1', '#94A3B8'] as const

export const emcTooltipStyle: CSSProperties = {
  borderRadius: 14,
  border: '1px solid rgba(12, 42, 75,0.08)',
  boxShadow: '0 22px 50px -24px rgba(15,42,67,0.22)',
}

export const emcTooltipLabelStyle = { color: '#0C2A4B', fontWeight: 900, fontSize: 12 }

export const emcTooltipItemStyle = { color: '#0C2A4B', fontWeight: 700, fontSize: 12 }

type Point = Record<string, string | number>

export function EnterpriseBarChartRtl({
  data,
  dataKey,
  nameKey,
  height = 220,
  gradientId = 'emc-bar',
}: {
  data: Point[]
  dataKey: string
  nameKey: string
  height?: number
  gradientId?: string
}) {
  if (!data.length) return null
  return (
    <div dir="ltr" className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ left: 8, right: 28, top: 8, bottom: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#0077B6" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#0C2A4B" stopOpacity={0.92} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(15,23,42,0.06)" />
          <XAxis hide type="number" />
          <YAxis type="category" dataKey={nameKey} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }} width={118} />
          <Tooltip cursor={{ fill: 'rgba(0, 119, 182,0.06)' }} contentStyle={emcTooltipStyle} labelStyle={emcTooltipLabelStyle} itemStyle={emcTooltipItemStyle} />
          <Bar dataKey={dataKey} fill={`url(#${gradientId})`} radius={[0, 12, 12, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EnterpriseColumnChart({
  data,
  bars,
  height = 216,
}: {
  data: Point[]
  bars: { key: string; color: string; label?: string }[]
  height?: number
}) {
  if (!data.length) return null
  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,23,42,0.06)" />
          <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} />
          <Tooltip contentStyle={emcTooltipStyle} labelStyle={emcTooltipLabelStyle} itemStyle={emcTooltipItemStyle} />
          {bars.map((b) => (
            <Bar key={b.key} dataKey={b.key} name={b.label ?? b.key} fill={b.color} radius={[10, 10, 4, 4]} maxBarSize={48} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EnterprisePieRadial({
  data,
  height = 200,
}: {
  data: { name: string; value: number; fill: string }[]
  height?: number
}) {
  if (!data.length) return null
  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip contentStyle={emcTooltipStyle} labelStyle={emcTooltipLabelStyle} itemStyle={emcTooltipItemStyle} />
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
          >
            {data.map((e, idx) => (
              <Cell key={`${e.name}-${idx}`} fill={e.fill} stroke="rgba(255,255,255,0.94)" strokeWidth={2} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EnterpriseScatterPlot({
  data,
  height = 260,
}: {
  data: { id: number; title: string; x: number; y: number; z?: number }[]
  height?: number
}) {
  if (!data.length) return null
  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 12, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
          <XAxis type="number" dataKey="x" name="البرامج" tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }} />
          <YAxis type="number" dataKey="y" name="المدة (شهر)" tick={{ fill: '#64748B', fontSize: 11 }} />
          <ZAxis range={[72, 120]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={emcTooltipStyle}
            labelFormatter={(_, pl) =>
              typeof pl?.[0] === 'object' && pl[0] && 'payload' in pl[0] ?
                String((pl[0] as { payload: { title?: string } }).payload?.title ?? '')
              : ''
            }
            formatter={(vx, _n, item) => {
              const dot = typeof item?.payload === 'object' && item.payload ? item.payload : null
              if (!dot || !('x' in dot && 'y' in dot)) return [String(vx), '']
              const p = dot as { x: number; y: number }
              return [`${p.x} برنامج`, `${p.y} شهرًا`]
            }}
          />
          <Scatter name="مسارات" data={data} fill="#0077B6">
            {data.map((d, i) => (
              <Cell key={d.id} fill={EMC_CHART_PALETTE[i % EMC_CHART_PALETTE.length]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EnterpriseTinyArea({
  data,
  height = 120,
}: {
  data: { idx: number; v: number }[]
  height?: number
}) {
  if (!data.length) return null
  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, left: 0, right: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="emc-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0077B6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0077B6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip contentStyle={{ ...emcTooltipStyle, fontSize: 11 }} labelStyle={{ display: 'none' }} />
          <Area type="monotone" dataKey="v" stroke="#0C2A4B" strokeWidth={2} fillOpacity={1} fill="url(#emc-area)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
