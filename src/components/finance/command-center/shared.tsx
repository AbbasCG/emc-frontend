import { motion } from 'framer-motion'

export default function FinanceCommandCenterSkeleton() {
  return (
    <div dir="rtl" className="space-y-6 animate-pulse">
      <div className="h-28 rounded-2xl bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-80 rounded-2xl bg-slate-100 lg:col-span-2" />
        <div className="h-80 rounded-2xl bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-44 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-slate-100" />
      <div className="h-96 rounded-2xl bg-slate-100" />
    </div>
  )
}

export function SectionShell({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      className={`rounded-2xl border border-deepBlue/[0.06] bg-white shadow-[0_1px_3px_rgba(12,42,75,0.04),0_8px_24px_-8px_rgba(12,42,75,0.08)] ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="text-right">
          {eyebrow && (
            <p className="text-[10px] font-black uppercase tracking-wider text-brand-500">{eyebrow}</p>
          )}
          <h2 className="mt-0.5 text-base font-black text-deepBlue">{title}</h2>
          {subtitle && <p className="mt-1 text-[12px] font-semibold text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </motion.section>
  )
}
