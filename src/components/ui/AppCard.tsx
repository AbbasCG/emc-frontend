import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AppCardProps = {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

/** @deprecated Prefer the canonical <Surface> (`@/components/ui`) — hoverable→interactive. */
export default function AppCard({ children, className = '', hoverable = false }: AppCardProps) {
  return (
    <motion.div
      className={cn(
        'rounded-2xl border border-deepBlue/[0.07] bg-white shadow-emc',
        hoverable && 'transition-shadow duration-250 ease-emc-out hover:shadow-emc-md',
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
