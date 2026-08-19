import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { fadeUp } from '@/utils/motion'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; href: string }
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-20 text-center ring-1 ring-line"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-sky-50 text-customBlue">
        <Icon size={36} />
      </div>
      <h3 className="text-xl font-black text-deepBlue">{title}</h3>
      <p className="mt-3 max-w-md leading-8 text-slate-600">{description}</p>
      {action && (
        <a
          href={action.href}
          className="mt-8 inline-flex rounded-xl bg-customBlue px-6 py-3 text-sm font-bold text-white transition hover:bg-customBlue/90"
        >
          {action.label}
        </a>
      )}
    </motion.div>
  )
}
