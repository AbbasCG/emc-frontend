import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import type { PublicTheme } from '@/data/publicPages'
import { staggerItem } from '@/utils/animations'

type Props = {
  theme: PublicTheme
  Icon: LucideIcon
  index: number
}

export default function TrackPremiumCard({ theme, Icon, index }: Props) {
  const tags = theme.bullets.slice(0, 3)
  const tone = index % 2 === 0 ? 'blue' : 'amber'
  const glow =
    tone === 'blue'
      ? 'from-customBlue/[0.12] via-transparent to-transparent'
      : 'from-customOrange/[0.14] via-transparent to-transparent'

  return (
    <motion.article
      variants={staggerItem}
      whileHover={{ y: -5, transition: { type: 'spring', stiffness: 420, damping: 28 } }}
      className="group flex h-full max-h-[21rem] flex-col overflow-hidden rounded-3xl border border-deepBlue/[0.07] bg-white/[0.78] text-right shadow-emc-md shadow-deepBlue/[0.05] ring-1 ring-white backdrop-blur-md transition-[box-shadow,border-color] hover:border-customBlue/[0.22] hover:shadow-emc-lg sm:max-h-[22rem]"
    >
      <div
        aria-hidden
        className={`pointer-events-none h-px w-full bg-gradient-to-l ${glow} opacity-90`}
      />
      <div className="flex flex-1 flex-col px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner transition-transform duration-300 group-hover:scale-[1.05] ${
              tone === 'blue'
                ? 'bg-brand-50 text-customBlue ring-1 ring-customBlue/20'
                : 'bg-accent-50 text-customOrange ring-1 ring-customOrange/25'
            }`}
          >
            <Icon size={24} strokeWidth={2} aria-hidden />
          </div>
        </div>

        <h3 className="line-clamp-2 min-h-[2.5rem] text-base font-black leading-snug text-deepBlue sm:text-lg">
          {theme.title.ar}
        </h3>
        <p className="mt-2 flex-1 text-[13px] font-medium leading-7 text-deepBlue/70 line-clamp-3 sm:text-sm">
          {theme.shortDescription.ar}
        </p>

        <ul className="mt-4 flex flex-wrap justify-end gap-1.5">
          {tags.map((b) => (
            <li
              key={b.ar}
              className="rounded-full border border-deepBlue/[0.06] bg-emcBg/95 px-2.5 py-0.5 text-[10px] font-bold text-deepBlue/65 sm:text-[11px]"
            >
              {b.ar.length > 28 ? `${b.ar.slice(0, 27)}…` : b.ar}
            </li>
          ))}
        </ul>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-5">
          <Link
            to="/courses"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-deepBlue/[0.06] bg-gradient-to-l from-customBlue to-[#1c6f98] py-3 text-[13px] font-black text-white shadow-[0_10px_28px_-12px_rgba(38,145,194,0.5)] ring-1 ring-white/15 transition-[filter] hover:brightness-[1.06]"
          >
            استكشف البرامج
            <ArrowLeft size={16} aria-hidden />
          </Link>
        </motion.div>
      </div>
    </motion.article>
  )
}
