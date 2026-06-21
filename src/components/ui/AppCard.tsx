import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AppCardProps = {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

export default function AppCard({ children, className = '', hoverable = false }: AppCardProps) {
  return (
    <motion.div
      className={cn(
        'rounded-2xl border border-amber-100/80 bg-white shadow-xl shadow-amber-100/50',
        hoverable && 'transition-shadow hover:shadow-2xl hover:shadow-amber-100/70',
        className,
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverable ? { y: -3 } : undefined}
      transition={{ duration: 0.24 }}
    >
      {children}
    </motion.div>
  )
}
