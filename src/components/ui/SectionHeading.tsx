import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { fadeUp } from '@/utils/animations'
import Eyebrow, { type EyebrowTone } from './Eyebrow'

/**
 * EMC <SectionHeading /> — the canonical section header. Optional eyebrow,
 * V3 double-arc title rule (`.emc-title-arc`), supporting line, actions slot,
 * and an optional fade-up entrance. The legacy `<SectionHeader />` components
 * in `sections/` and `shared/` are thin adapters over this component.
 */

type Props = {
  eyebrow?: ReactNode
  eyebrowTone?: EyebrowTone
  title: ReactNode
  subtitle?: ReactNode
  /** Alias for `subtitle` (legacy sections API). `subtitle` wins when both are given. */
  description?: ReactNode
  actions?: ReactNode
  /** `start` and `right` are equivalent in this RTL app. */
  align?: 'start' | 'center' | 'right'
  /** Show the V3 double-arc brand rule under the title. */
  rule?: boolean
  /** Fade-up on scroll into view (honors the global <MotionConfig reducedMotion="user">). */
  animate?: boolean
  className?: string
}

export default function SectionHeading({
  eyebrow,
  eyebrowTone = 'brand',
  title,
  subtitle,
  description,
  actions,
  align = 'start',
  rule = true,
  animate = false,
  className,
}: Props) {
  const centered = align === 'center'
  const body = subtitle ?? description

  const head = (
    <>
      {eyebrow && (
        <div className={cn('mb-4 flex', centered ? 'justify-center' : 'justify-start')}>
          <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>
        </div>
      )}
      <h2
        className={cn(
          'font-display text-3xl font-black leading-[1.15] tracking-tight text-deepBlue sm:text-4xl',
          rule && 'emc-title-arc',
          rule && centered && 'is-center',
        )}
      >
        {title}
      </h2>
      {body && (
        <p className="mt-5 text-base font-medium leading-8 text-deepBlue/65 sm:text-lg sm:leading-9">
          {body}
        </p>
      )}
    </>
  )

  // Without actions the header collapses to a single container so caller
  // classNames (margins / max-widths) apply directly to the content box.
  const rootClass = actions
    ? cn(
        'mb-10 flex flex-col gap-5',
        centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between text-right',
        className,
      )
    : cn('mb-10', centered ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl text-right', className)

  return (
    <motion.header
      className={rootClass}
      {...(animate
        ? {
            variants: fadeUp,
            initial: 'hidden',
            whileInView: 'visible',
            viewport: { once: true, amount: 0.35 },
          }
        : {})}
    >
      {actions ? (
        <>
          <div className={cn('min-w-0', centered ? 'mx-auto max-w-3xl' : 'max-w-2xl')}>{head}</div>
          <div className={cn('flex shrink-0 flex-wrap items-center gap-2', centered && 'justify-center')}>
            {actions}
          </div>
        </>
      ) : (
        head
      )}
    </motion.header>
  )
}
