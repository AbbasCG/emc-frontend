import { motion } from 'framer-motion'
import type { Department } from '@/services/teamApi'

type Props = {
  departments: Department[]
  activeSlug: 'all' | string
  onChange: (slug: 'all' | string) => void
}

export default function DepartmentTabs({ departments, activeSlug, onChange }: Props) {
  const tabs = [
    { slug: 'all' as const, label: 'الكل' },
    ...departments.map((d) => ({ slug: d.slug, label: d.name_ar })),
  ]

  return (
    <div dir="rtl" className="border-b border-deepBlue/[0.07] pb-px">
      <div className="relative flex gap-1 overflow-x-auto py-4 scrollbar-hide lg:flex-wrap lg:justify-start lg:gap-2">
        {tabs.map((t) => {
          const pressed = activeSlug === t.slug
          return (
            <motion.button
              key={t.slug === 'all' ? '__all__' : t.slug}
              type="button"
              onClick={() => onChange(t.slug)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={pressed}
              className={`relative whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-black transition-colors ${
                pressed
                  ? 'text-white'
                  : 'border border-transparent bg-white/70 text-deepBlue hover:border-customBlue/20 hover:bg-brand-50/90 hover:text-customBlue shadow-emc-xs backdrop-blur-sm'
              }`}
            >
              {pressed ? (
                <motion.span
                  layoutId="team-tab-indicator"
                  className="absolute inset-0 rounded-xl bg-gradient-to-l from-customBlue to-[#1c6f98] shadow-emc-glow"
                  transition={{ type: 'spring', stiffness: 420, damping: 35 }}
                />
              ) : null}
              <span className="relative z-10">{t.label}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
