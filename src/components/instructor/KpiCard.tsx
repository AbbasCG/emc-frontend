import { memo, useEffect } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import type { ElementType } from 'react'

type Props = {
  icon: ElementType
  label: string
  value: number | string
  tone?: string
  badge?: string
  index?: number
  loading?: boolean
}

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 80, damping: 18 })
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString('ar-EG', { numberingSystem: 'latn' }))

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return <motion.span>{display}</motion.span>
}

function KpiCardInner({
  icon: Icon,
  label,
  value,
  tone = 'text-[#2691C2] bg-[#2691C2]/[0.08]',
  badge,
  index = 0,
  loading,
}: Props) {
  const numeric = typeof value === 'number'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-[16px] border border-[#22334A]/[0.06] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(38,145,194,0.18)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        {badge && (
          <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[9px] font-bold text-slate-500 ring-1 ring-slate-200/80">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="h-7 w-12 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <p className="font-mono text-[22px] font-bold leading-none tabular-nums text-[#22334A]">
            {numeric ? <AnimatedNumber value={value} /> : value}
          </p>
        )}
        <p className="mt-1.5 text-[11px] font-semibold text-slate-500">{label}</p>
      </div>
    </motion.div>
  )
}

export const KpiCard = memo(KpiCardInner)

export function KpiSkeletonRow({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[88px] animate-pulse rounded-[16px] bg-slate-100" />
      ))}
    </div>
  )
}
