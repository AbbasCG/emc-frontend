import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { staggerContainer } from '@/utils/animations'

type FeatureGridProps = {
  children: ReactNode
  className?: string
}

export default function FeatureGrid({ children, className = '' }: FeatureGridProps) {
  return (
    <motion.div
      className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
    >
      {children}
    </motion.div>
  )
}
