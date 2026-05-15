import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { useImpactCountUp } from '@/components/impact/useImpactCountUp'
import { staggerItem } from '@/utils/animations'

type Props = {
  icon: LucideIcon
  label: string
  end: number
  suffix?: string
  subtitle?: string
  tone?: 'blue' | 'orange' | 'ink'
}

const toneRing: Record<NonNullable<Props['tone']>, string> = {
  blue: 'from-customBlue/18 to-transparent',
  orange: 'from-customOrange/22 to-transparent',
  ink: 'from-deepBlue/12 to-transparent',
}

export default function ImpactStatCard({ icon: Icon, label, end, suffix = '', subtitle, tone = 'blue' }: Props) {
  const { ref, count } = useImpactCountUp(end, { duration: 2 })
  const display = `${new Intl.NumberFormat('ar').format(count)}${suffix}`

  return (
    <motion.article
      ref={ref}
      variants={staggerItem}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-deepBlue/[0.075] bg-white/[0.88] p-6 text-right shadow-sm shadow-deepBlue/[0.04] ring-1 ring-white backdrop-blur-md transition-[box-shadow] hover:border-customBlue/[0.2] hover:shadow-emc-md`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${toneRing[tone]} via-transparent opacity-95`}
      />
      <span
        className={`mb-4 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-inner transition group-hover:scale-[1.03] ${
          tone === 'orange'
            ? 'bg-accent-50 text-customOrange ring-1 ring-customOrange/22'
            : tone === 'ink'
              ? 'bg-ink-50 text-deepBlue ring-1 ring-deepBlue/10'
              : 'bg-brand-50 text-customBlue ring-1 ring-customBlue/15'
        }`}
      >
        <Icon size={20} strokeWidth={2} aria-hidden />
      </span>
      <p className="font-display text-3xl font-black tabular-nums leading-none text-deepBlue md:text-4xl" aria-live="polite">
        {display}
      </p>
      <h3 className="mt-3 text-lg font-black leading-snug text-deepBlue">{label}</h3>
      {subtitle ? <p className="mt-2 text-sm font-semibold leading-snug text-foreground/65">{subtitle}</p> : null}
    </motion.article>
  )
}
