import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { fadeUp, staggerItem } from '@/utils/animations'

type FeatureCardProps = {
  icon: LucideIcon
  title: string
  description: string
  iconClassName?: string
  delay?: number
  /** Use inside a parent `staggerContainer` (e.g. FeatureGrid) */
  animation?: 'fade' | 'stagger'
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  iconClassName = 'bg-customBlue/10 text-customBlue',
  delay = 0,
  animation = 'fade',
}: FeatureCardProps) {
  const variants = animation === 'stagger' ? staggerItem : fadeUp

  return (
    <motion.article
      variants={variants}
      {...(animation === 'fade'
        ? {
            initial: 'hidden' as const,
            whileInView: 'visible' as const,
            viewport: { once: true, amount: 0.2 },
            transition: { duration: 0.45, delay },
          }
        : {})}
      whileHover={{ y: -4 }}
      className="flex min-h-[220px] flex-col rounded-3xl border-x border-b border-deepBlue/[0.06] border-t-[3px] border-t-customBlue/35 bg-white p-7 text-right shadow-[0_16px_40px_-24px_rgba(12,42,75,0.14)] transition-all duration-300 hover:-translate-y-1 hover:border-t-customOrange/55 hover:shadow-[0_22px_48px_-22px_rgba(0,119,182,0.18)]"
    >
      <div
        className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${iconClassName}`}
      >
        <Icon size={28} />
      </div>
      <h3 className="text-lg font-black text-deepBlue">{title}</h3>
      <p className="mt-3 flex-1 leading-8 text-deepBlue/70">{description}</p>
    </motion.article>
  )
}
