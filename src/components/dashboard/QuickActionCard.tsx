import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'

type QuickActionCardProps = {
  icon: LucideIcon
  label: string
  description?: string
  href: string
  color?: 'blue' | 'orange' | 'green' | 'purple'
}

const colorMap = {
  blue:   { iconBg: 'bg-sky-50 ring-sky-100',     iconColor: 'text-customBlue'  },
  orange: { iconBg: 'bg-orange-50 ring-orange-100',iconColor: 'text-customOrange'},
  green:  { iconBg: 'bg-emerald-50 ring-emerald-100', iconColor: 'text-emerald-500'},
  purple: { iconBg: 'bg-violet-50 ring-violet-100',iconColor: 'text-violet-500'  },
}

export default function QuickActionCard({
  icon: Icon,
  label,
  description,
  href,
  color = 'blue',
}: QuickActionCardProps) {
  const c = colorMap[color]

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Link
        to={href}
        className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-customBlue/20"
      >
        <div
          className={[
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1',
            c.iconBg,
          ].join(' ')}
        >
          <Icon size={20} className={c.iconColor} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-deepBlue">{label}</p>
          {description && (
            <p className="mt-0.5 truncate text-xs text-slate-400">{description}</p>
          )}
        </div>
        <ChevronLeft size={16} className="shrink-0 text-slate-300" />
      </Link>
    </motion.div>
  )
}
