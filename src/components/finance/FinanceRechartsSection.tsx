import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FinanceDashboardData } from '@/types/intelligence'
import { gatewayTotalsFromPayments } from './financeDashboardDerivations'
import { formatFinanceCurrencyCompact, formatFinanceCurrencyInteger } from '@/utils/financeFormatters'

const brand = '#0077B6'
const accent = '#F28C00'
const ink = '#0C2A4B'

const GATEWAY_COLORS = ['#0077B6', '#F28C00', '#0E5A8A', '#F5B561', '#6B7F98']

const PROVIDER_LABEL: Record<string, string> = {
  stripe: 'سترايب',
  paypal: 'باي بال',
  fake: 'تجريبي',
}

function providerLabelAr(p: string) {
  return PROVIDER_LABEL[p.toLowerCase()] ?? p
}

function fmtCurrencyTooltip(v: number) {
  return formatFinanceCurrencyInteger(v)
}

export default function FinanceRechartsSection({ data }: { data: FinanceDashboardData }) {
  const monthlyPoints = data.monthly_revenue.map((m, i) => ({
    idx: String(i),
    label: m.month,
    revenue: m.amount,
  }))

  const courses = data.revenue_by_course.map((c) => ({
    name: c.course_name,
    revenue: c.amount,
  }))

  const gateways = gatewayTotalsFromPayments(data.latest_payments)

  const pieData =
    gateways.length > 0 ?
      gateways.map((g) => ({ name: providerLabelAr(g.provider), value: g.amount, key: g.provider }))
    : []

  const fade = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] as const } },
  }

  const tooltipStyle = {
    borderRadius: 14,
    border: `1px solid rgba(12,42,75,0.08)`,
    boxShadow: '0 22px 50px -24px rgba(15,42,67,0.22)',
    fontFamily: '"Tajawal",sans-serif',
  }

  const tooltipLabelStyle = { color: ink, fontWeight: 900, fontSize: 12 }
  const tooltipItemStyle = { color: ink, fontWeight: 700, fontSize: 12 }

  return (
    <div className="grid gap-6">
      <motion.section
        initial="hidden"
        animate="show"
        variants={fade}
        className="overflow-hidden rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.88] p-6 shadow-emc backdrop-blur-sm ring-1 ring-deepBlue/[0.04]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5 text-right">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-brand-600">الإيرادات</p>
            <h3 className="mt-1 text-lg font-black text-deepBlue">الإيراد الشهري</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">من بيانات الخادم للفترة المحددة</p>
          </div>
        </div>
        <div dir="ltr" className="mt-4 h-[300px] w-full min-h-[260px]">
          {monthlyPoints.length > 0 ?
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyPoints} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="financeAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={brand} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={brand} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 8" stroke="rgba(12,42,75,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Tajawal' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatFinanceCurrencyCompact(v as number)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v) => [
                    fmtCurrencyTooltip(typeof v === 'number' ? v : Number(v ?? 0)),
                    'الإيراد',
                  ]}
                  labelFormatter={(_, p) => String((p?.[0]?.payload as { label?: string })?.label ?? '')}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={brand}
                  strokeWidth={2.4}
                  fill="url(#financeAreaFill)"
                  dot={{ r: 3, fill: brand, strokeWidth: 0 }}
                  activeDot={{ r: 5, stroke: accent, strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          : <div className="flex h-full min-h-[200px] items-center justify-center text-center text-sm font-bold text-slate-400">
              لا توجد سلسلة شهرية لهذه الفترة.
            </div>
          }
        </div>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.section
          initial="hidden"
          animate="show"
          variants={fade}
          transition={{ delay: 0.06 }}
          className="overflow-hidden rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.88] p-6 shadow-emc backdrop-blur-sm ring-1 ring-deepBlue/[0.04]"
        >
          <div className="border-b border-slate-100 pb-4 text-right">
            <p className="text-[11px] font-black uppercase tracking-wide text-accent-600">الدورات</p>
            <h3 className="mt-1 text-base font-black text-deepBlue">الإيراد حسب الدورة</h3>
          </div>
          <div dir="ltr" className="mt-4 h-[320px] w-full">
            {courses.length > 0 ?
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courses} layout="vertical" margin={{ top: 6, right: 8, left: 8, bottom: 6 }}>
                  <defs>
                    <linearGradient id="financeBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={brand} stopOpacity={0.85} />
                      <stop offset="100%" stopColor={ink} stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 8" stroke="rgba(12,42,75,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatFinanceCurrencyCompact(v as number)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fill: '#475569', fontSize: 11, fontFamily: 'Tajawal' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(v) => [
                      fmtCurrencyTooltip(typeof v === 'number' ? v : Number(v ?? 0)),
                      'الإيراد',
                    ]}
                  />
                  <Bar dataKey="revenue" fill="url(#financeBarGrad)" radius={[0, 10, 10, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            : <div className="flex h-full min-h-[200px] items-center justify-center text-center text-sm font-bold text-slate-400">
                لا توجد بيانات دورات في الملخص.
              </div>
            }
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          animate="show"
          variants={fade}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.88] p-6 shadow-emc backdrop-blur-sm ring-1 ring-deepBlue/[0.04]"
        >
          <div className="border-b border-slate-100 pb-4 text-right">
            <p className="text-[11px] font-black uppercase tracking-wide text-brand-600">بوابات الدفع</p>
            <h3 className="mt-1 text-base font-black text-deepBlue">توزيع حسب المزود (عيّنة أحدث المدفوعات)</h3>
          </div>
          <div dir="ltr" className="mt-2 h-[320px] w-full">
            {pieData.length > 0 ?
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={GATEWAY_COLORS[i % GATEWAY_COLORS.length]!} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(v) => {
                      const num = typeof v === 'number' ? v : Number(v ?? 0)
                      return [fmtCurrencyTooltip(Number.isFinite(num) ? num : 0), 'المبلغ']
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            : <div className="flex h-full min-h-[200px] items-center justify-center text-center text-sm font-bold text-slate-400">
                لا توجد مدفوعات في عيّنة «أحدث المدفوعات» لرسم التوزيع.
              </div>
            }
          </div>
          {pieData.length > 0 ?
            <ul className="mt-2 flex flex-wrap justify-center gap-3 text-right text-[11px] font-bold text-slate-600">
              {pieData.map((s, i) => (
                <li key={`${s.key}-${i}`} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: GATEWAY_COLORS[i % GATEWAY_COLORS.length] }}
                  />
                  {s.name}
                </li>
              ))}
            </ul>
          : null}
        </motion.section>
      </div>
    </div>
  )
}
