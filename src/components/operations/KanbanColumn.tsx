import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export default function KanbanColumn({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <motion.section
      layout
      className="flex min-h-[420px] w-[280px] shrink-0 flex-col rounded-2xl bg-deepBlue/[0.03] p-3 ring-1 ring-deepBlue/[0.06]"
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-deepBlue ring-1 ring-deepBlue/10">
          {count}
        </span>
        <h3 className="text-xs font-black text-deepBlue">{title}</h3>
      </header>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pb-2">{children}</div>
    </motion.section>
  )
}
