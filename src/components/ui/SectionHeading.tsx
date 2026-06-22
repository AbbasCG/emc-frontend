import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Eyebrow, { type EyebrowTone } from './Eyebrow'

/**
 * EMC <SectionHeading /> — premium section header with optional eyebrow,
 * brand rule, and right-aligned actions slot. Complements existing
 * <SectionHeader /> (legacy) without replacing it.
 */

type Props = {
  eyebrow?: ReactNode
  eyebrowTone?: EyebrowTone
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  align?: 'start' | 'center'
  /** Show the orange brand rule under the title. */
  rule?: boolean
  className?: string
}

export default function SectionHeading({
  eyebrow,
  eyebrowTone = 'brand',
  title,
  subtitle,
  actions,
  align = 'start',
  rule = true,
  className,
}: Props) {
  const centered = align === 'center'
  return (
    <header
      className={cn(
        'mb-10 flex flex-col gap-5',
        centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between text-right',
        className,
      )}
    >
      <div className={cn('min-w-0', centered ? 'mx-auto max-w-3xl' : 'max-w-2xl')}>
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
        {subtitle && (
          <p className="mt-5 text-base font-medium leading-8 text-deepBlue/65 sm:text-lg sm:leading-9">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className={cn('flex shrink-0 flex-wrap items-center gap-2', centered && 'justify-center')}>
          {actions}
        </div>
      )}
    </header>
  )
}
