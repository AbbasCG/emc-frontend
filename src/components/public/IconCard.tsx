import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { fadeUp } from '@/utils/motion'

type IconCardProps = {
  icon: LucideIcon
  title: string
  children: React.ReactNode
  iconWrapClass?: string
  delay?: number
}

export default function IconCard({
  icon: Icon,
  title,
  children,
  iconWrapClass = 'bg-sky-50 text-customBlue',
  delay = 0,
}: IconCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay }}
      whileHover={{ y: -3 }}
      className="rounded-3xl bg-white p-7 text-right ring-1 ring-line"
    >
      <div className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl ${iconWrapClass}`}>
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-black text-deepBlue">{title}</h3>
      <div className="mt-3 text-sm leading-8 text-slate-600">{children}</div>
    </motion.div>
  )
}
