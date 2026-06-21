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
      className={`mb-8 max-w-2xl md:max-w-3xl ${alignClass} ${className}`}
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
      <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-deepBlue md:text-4xl">
        {title}
      </h2>
      <span
        className={`mt-4 block h-1 w-20 rounded-full bg-customOrange ${align === 'center' ? 'mx-auto' : ''}`}
      />
      {body && (
        <p className="mt-4 text-base font-medium leading-relaxed text-deepBlue/70 md:text-lg md:leading-relaxed">{body}</p>
      )}
    </motion.div>
  )
}
