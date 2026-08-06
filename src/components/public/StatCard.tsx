import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { fadeUp } from '@/utils/motion'

type StatCardProps = {
  icon?: LucideIcon
  label: string
  value?: string
  hint?: string
  accentClass?: string
  delay?: number
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accentClass = 'text-customBlue',
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, delay }}
      className="rounded-3xl bg-white p-7 text-center shadow-md ring-1 ring-slate-100"
    >
      {Icon && <Icon size={30} className={`mx-auto mb-3 ${accentClass}`} />}
      {value && <p className={`text-2xl font-black sm:text-3xl ${accentClass}`}>{value}</p>}
      <p className="mt-2 text-sm font-bold leading-7 text-slate-600">{label}</p>
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
    </motion.div>
  )
}
