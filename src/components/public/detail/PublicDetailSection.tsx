import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { fadeUp } from '@/utils/course'

type Props = {
  id?: string
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  compact?: boolean
}

export default function PublicDetailSection({
  id,
  title,
  subtitle,
  children,
  className = '',
  compact = false,
}: Props) {
  return (
    <motion.section
      id={id}
      className={`rounded-2xl bg-white text-right ring-1 ring-line ${
        compact ?
          'p-4 sm:p-5'
        : 'rounded-3xl p-5 sm:p-7'
      } ${className}`}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.45 }}
    >
      <div className={compact ? 'mb-3' : 'mb-5'}>
        <h2 className={`font-black text-deepBlue ${compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}>
          {title}
        </h2>
        {subtitle ?
          <p className="mt-1.5 text-sm font-semibold leading-7 text-slate-500">{subtitle}</p>
        : null}
        <span className={`block rounded-full bg-customOrange ${compact ? 'mt-2 h-0.5 w-10' : 'mt-3 h-1 w-14'}`} />
      </div>
      {children}
    </motion.section>
  )
}
