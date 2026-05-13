import { motion } from 'framer-motion'

type Point = { label?: string; month?: string; amount: number }

export default function RevenueChart({
  data,
  title = 'الإيراد الشهري',
}: {
  data: Point[]
  title?: string
}) {
  const max = Math.max(...data.map((d) => d.amount), 1)
  return (
    <div dir="rtl" className="rounded-[1.35rem] bg-white p-6 shadow-lg ring-1 ring-deepBlue/[0.06]">
      <h3 className="text-right text-sm font-black text-deepBlue">{title}</h3>
      <div className="mt-8 flex h-48 items-end justify-between gap-2">
        {data.map((d, i) => {
          const h = Math.round((d.amount / max) * 100)
          const lab = d.label ?? d.month ?? '—'
          return (
            <div key={`${lab}-${i}`} className="flex flex-1 flex-col items-center gap-2">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.04, type: 'spring', damping: 18 }}
                className="w-full max-w-[52px] rounded-t-xl bg-gradient-to-t from-deepBlue to-customBlue"
                title={`${d.amount}`}
              />
              <span className="text-[9px] font-bold text-slate-400">{lab}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-center text-[10px] font-bold text-slate-400">
        مخطط تقديري — يُستبدل بمكتبة رسوم عند ربط البيانات الحية
      </p>
    </div>
  )
}
