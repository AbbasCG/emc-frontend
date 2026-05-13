import { motion } from 'framer-motion'
import { fadeUp } from '@/utils/animations'

type SectionHeaderProps = {
  eyebrow?: string
  title: string
  /** Main supporting line */
  description?: string
  /** Alias for `description` — use whichever reads clearer at call site */
  subtitle?: string
  align?: 'center' | 'right'
  className?: string
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  subtitle,
  align = 'center',
  className = '',
}: SectionHeaderProps) {
  const body = subtitle ?? description
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-right mr-0 ml-auto'

  return (
    <motion.div
      className={`mb-10 max-w-3xl ${alignClass} ${className}`}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.5 }}
    >
      {eyebrow && (
        <span className="mb-3 inline-block rounded-full border border-customOrange/25 bg-customOrange/10 px-3 py-1.5 text-xs font-black text-deepBlue ring-1 ring-customOrange/15">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl font-black leading-[1.15] tracking-tight text-deepBlue sm:text-4xl lg:text-[2.35rem]">
        {title}
      </h2>
      <span
        className={`mt-5 block h-1 w-24 rounded-full bg-gradient-to-l from-customOrange via-customBlue/60 to-deepBlue/30 ${align === 'center' ? 'mx-auto' : ''}`}
      />
      {body && (
        <p className="mt-5 text-base font-medium leading-8 text-deepBlue/70 sm:text-lg sm:leading-9">{body}</p>
      )}
    </motion.div>
  )
}
