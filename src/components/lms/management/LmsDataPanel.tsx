import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

type Props = {
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function LmsDataPanel({ children, footer, className = '' }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className={`overflow-hidden rounded-2xl border border-[#0C2A4B]/6 bg-white shadow-sm ${className}`}
    >
      {children}
      {footer ?
        <div className="border-t border-[#0C2A4B]/6 bg-[#f8fafc]/80 px-5 py-2.5 text-[11px] font-bold text-[#0C2A4B]/45">
          {footer}
        </div>
      : null}
    </motion.div>
  )
}
