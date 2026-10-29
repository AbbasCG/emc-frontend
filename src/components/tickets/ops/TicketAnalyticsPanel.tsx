import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TicketFilters, TicketAnalytics } from '@/types/ticketOps'
import { ANALYTICS_WINDOWS } from '@/utils/ticketFilters'
import { cn } from '@/lib/utils'
import { TICKET_CHART } from './ticketChartConfig'
import { PRIORITY_LABELS, STATUS_LABELS } from './ticketOpsUi'

const BLUE = TICKET_CHART.brand
const ORANGE = TICKET_CHART.accent
const GREEN = TICKET_CHART.success
const ROSE = TICKET_CHART.danger
const GRID = TICKET_CHART.grid

function Card({ title, note, children, className }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-3xl border border-deepBlue/[0.07] bg-white p-4 shadow-sm', className)}>
      <h3 className="text-[13px] font-black text-deepBlue">{title}</h3>
      {note ? <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/45">{note}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

const day = (d: string) => d.slice(5)

/**
 * Ticket analytics. Every figure is aggregated by the server over the tickets the viewer may see and
 * the same scope filters as the KPI cards. Each card says what window or moment it describes, and
 * where the data cannot answer something (there are no historical snapshots of overdue tickets, so no
 * overdue trend is drawn). Bars with a destination open the table filtered to exactly that group.
 */
export default function TicketAnalyticsPanel({
  data,
  loading,
  days,
  onDays,
  onDrill,
}: {
  data: TicketAnalytics | null
  loading: boolean
  days: number
  onDays: (d: number) => void
  onDrill: (patch: Partial<TicketFilters>) => void
}) {
  if (!data) {
    return <div className="space-y-4" aria-busy="true" data-testid="analytics-loading">{[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-3xl bg-deepBlue/[0.06]" />)}</div>
  }

  const created = data.volume.reduce((n, v) => n + v.created, 0)
  const resolved = data.volume.reduce((n, v) => n + v.resolved, 0)
  const statusRows = data.byStatus.map((r) => ({ ...r, label: STATUS_LABELS[r.key] ?? r.key }))
  const priorityRows = data.byPriority.map((r) => ({ ...r, label: PRIORITY_LABELS[r.key] ?? r.key }))
  const overdueTotal = data.overdueNow.reduce((n, b) => n + b.count, 0)

  return (
    <div className={cn('space-y-4 transition-opacity', loading && 'opacity-60')} aria-busy={loading} data-testid="analytics-panel">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="النافذة الزمنية">
        {ANALYTICS_WINDOWS.map((d) => (
          <button key={d} type="button" aria-pressed={days === d} onClick={() => onDays(d)} className={cn('rounded-full border px-3.5 py-1.5 text-[12px] font-black transition', days === d ? 'border-customBlue bg-customBlue text-white' : 'border-deepBlue/10 bg-white text-deepBlue/70 hover:border-customBlue/40')}>
            آخر {d} يومًا
          </button>
        ))}
        <span className="text-[11px] font-semibold text-deepBlue/45">من {data.window.from} إلى {data.window.to}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="حجم التذاكر يوميًا" note={`أُنشئت ${created} · حُلّت ${resolved} خلال النافذة`} className="lg:col-span-2">
          <div dir="ltr" className="h-64" role="img" aria-label={`رسم يوضح التذاكر المُنشأة والمحلولة يوميًا، المجموع ${created} مُنشأة و${resolved} محلولة`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.volume} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tickFormatter={day} tick={{ fontSize: 11 }} minTickGap={18} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(l) => String(l)} formatter={(v, n) => [v as number, n === 'created' ? 'مُنشأة' : 'محلولة']} />
                <Area type="monotone" dataKey="created" stroke={BLUE} fill={BLUE} fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" stroke={GREEN} fill={GREEN} fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="التوزيع حسب الحالة" note={data.notes.distribution}>
          <div dir="ltr" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusRows} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={104} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v as number, 'تذكرة']} />
                <Bar dataKey="count" fill={BLUE} radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d) => onDrill({ status: [(d as unknown as { key: string }).key as never], state: '' })} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-deepBlue/40">اضغط على شريط لعرض تذاكره في الجدول.</p>
        </Card>

        <Card title="التوزيع حسب الأولوية" note={data.notes.distribution}>
          <div dir="ltr" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityRows} margin={{ left: -16, right: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v as number, 'تذكرة']} />
                <Bar dataKey="count" fill={ORANGE} radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d) => onDrill({ priority: [(d as unknown as { key: string }).key as never] })} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="عبء الإدارات (المفتوحة الآن)" note={data.notes.workload}>
          {data.departmentWorkload.length === 0 ?
            <p className="py-10 text-center text-[12px] font-bold text-deepBlue/40">لا توجد تذاكر مفتوحة.</p>
          : <div dir="ltr" style={{ height: Math.max(180, data.departmentWorkload.length * 38) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departmentWorkload} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, n) => [v as number, n === 'open' ? 'مفتوحة' : 'متأخرة']} />
                  <Bar dataKey="open" fill={BLUE} radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d) => onDrill({ department: String((d as unknown as { id: number }).id), state: 'open' })} />
                  <Bar dataKey="overdue" fill={ROSE} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>}
        </Card>

        <Card title="توزيع التكليف (المفتوحة الآن)" note={data.notes.workload}>
          <ul className="space-y-2">
            {data.assignment.topAssignees.map((a) => {
              const max = Math.max(1, ...data.assignment.topAssignees.map((x) => x.open))

              return (
                <li key={a.id} className="text-[12px]">
                  <div className="mb-1 flex justify-between font-bold text-deepBlue/80"><span className="truncate">{a.name}</span><span>{a.open}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-deepBlue/[0.07]"><div className="h-full rounded-full bg-customBlue" style={{ width: `${(a.open / max) * 100}%` }} /></div>
                </li>
              )
            })}
          </ul>
          <button type="button" onClick={() => onDrill({ unassigned: true, state: 'open' })} className="mt-3 w-full rounded-xl bg-violet-50 px-3 py-2 text-[12px] font-black text-violet-800 hover:bg-violet-100">
            بلا مكلف: {data.assignment.unassignedOpen} تذكرة مفتوحة ← عرضها
          </button>
        </Card>

        <Card title="اتجاه زمن الحل (أسبوعيًا)" note="متوسط الساعات من الإنشاء إلى الحل للتذاكر المحلولة في كل أسبوع.">
          {data.resolutionTrend.length === 0 ?
            <p className="py-10 text-center text-[12px] font-bold text-deepBlue/40">لا توجد تذاكر محلولة في هذه النافذة.</p>
          : <div dir="ltr" className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.resolutionTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="weekStart" tickFormatter={day} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, n) => [v as number, n === 'avgHours' ? 'متوسط الساعات' : 'عدد المحلولة']} />
                  <Line type="monotone" dataKey="avgHours" stroke={GREEN} strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>}
        </Card>

        <Card title="المتأخرة الآن بحسب مدة التأخر" note={data.notes.overdue}>
          <ul className="space-y-2">
            {data.overdueNow.map((b) => (
              <li key={b.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-[12px] font-bold text-deepBlue">
                <span>{b.label}</span><span className={b.count > 0 ? 'text-rose-700' : 'text-deepBlue/40'}>{b.count}</span>
              </li>
            ))}
          </ul>
          <button type="button" disabled={overdueTotal === 0} onClick={() => onDrill({ overdue: true })} className="mt-3 w-full rounded-xl bg-rose-50 px-3 py-2 text-[12px] font-black text-rose-800 hover:bg-rose-100 disabled:opacity-40">
            عرض المتأخرة ({overdueTotal})
          </button>
        </Card>
      </div>
    </div>
  )
}
