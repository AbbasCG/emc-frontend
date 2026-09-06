import { motion } from 'framer-motion'

export default function AnalyticsGrid({ widgets }: { widgets: { label: string; value: string }[] }) {
  return (
    <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-5 shadow-sm">
      <div className="mb-4 text-right">
        <p className="text-[10px] font-black uppercase tracking-wider text-brand-500">تحليلات</p>
        <h2 className="mt-0.5 text-base font-black text-deepBlue">مؤشرات تحليلية سريعة</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.map((w, i) => (
          <motion.div
            key={w.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ scale: 1.02 }}
            className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-right transition hover:border-brand-200 hover:bg-white"
          >
            <p className="text-[10px] font-bold text-slate-400">{w.label}</p>
            <p className="mt-1 truncate font-latin text-sm font-black text-deepBlue">{w.value}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
