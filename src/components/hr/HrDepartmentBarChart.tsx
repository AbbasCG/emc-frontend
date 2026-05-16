import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export default function HrDepartmentBarChart({
  rows,
}: {
  rows: { label: string; count: number }[]
}) {
  const data =
    rows.length > 0 ?
      rows.map((r) => ({ name: r.label.slice(0, 14), full: r.label, count: r.count }))
    : [{ name: '—', full: '', count: 0 }]

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.45, ease: [0.22, 0.61, 0.36, 1] as const }}
      className="rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.88] p-6 shadow-emc backdrop-blur-sm ring-1 ring-deepBlue/[0.04]"
    >
      <div className="border-b border-slate-100 pb-4 text-right">
        <p className="text-[11px] font-black uppercase tracking-wide text-brand-600">هيكلة</p>
        <h3 className="mt-1 text-base font-black text-deepBlue">توزيع أعضاء حسب الوحدة (عند توفر البيانات)</h3>
      </div>
      <div dir="ltr" className="mt-4 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 24 }}>
            <defs>
              <linearGradient id="hrBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2691C2" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#22334A" stopOpacity={0.65} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 8" stroke="rgba(34,51,74,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Tajawal' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 14,
                border: '1px solid rgba(34,51,74,0.08)',
                fontFamily: 'Tajawal',
              }}
              formatter={(v) =>
                `${new Intl.NumberFormat('ar-SA').format(typeof v === 'number' ? v : Number(v ?? 0))}`
              }
              labelFormatter={(_, payload) =>
                typeof payload?.[0]?.payload === 'object' && payload[0]?.payload && 'full' in payload[0].payload ?
                  String((payload[0].payload as { full: string }).full)
                : ''
              }
            />
            <Bar dataKey="count" fill="url(#hrBarGrad)" radius={[8, 8, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  )
}
