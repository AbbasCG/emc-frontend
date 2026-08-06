import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cardHover } from '@/utils/animations'

type IconCardProps = {
  icon: LucideIcon
  title: string
  description: string
  bullets?: string[]
}

export default function IconCard({ icon: Icon, title, description, bullets }: IconCardProps) {
  return (
    <motion.article
      className="group flex min-h-[200px] flex-col rounded-2xl border-t-[3px] border-t-customBlue bg-white p-6 text-right ring-1 ring-slate-100/90"
      variants={cardHover}
      initial="rest"
      whileHover="hover"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-customBlue/10 text-customBlue transition-colors group-hover:bg-customBlue/15">
        <Icon size={22} strokeWidth={2} aria-hidden />
      </div>
      <h3 className="text-lg font-black text-deepBlue">{title}</h3>
      <p className="mt-2 flex-1 text-sm font-medium leading-7 text-slate-600">{description}</p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-xs font-semibold text-slate-600">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-customOrange" />
              {b}
            </li>
          ))}
        </ul>
      )}
    </motion.article>
  )
}
