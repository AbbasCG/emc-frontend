import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Legacy <SectionHeader /> — kept stable for all current call-sites.
 * Optional new props (`eyebrow`, `eyebrowTone`, `className`) are additive and
 * do not change existing renders. For richer headers (with actions/breadcrumbs),
 * prefer the new <SectionHeading /> in `@/components/ui`.
 */

type EyebrowTone = 'brand' | 'accent' | 'ink'

type SectionHeaderProps = {
  title: string
  subtitle: string
  centered?: boolean
  eyebrow?: ReactNode
  eyebrowTone?: EyebrowTone
  className?: string
}

const eyebrowClass: Record<EyebrowTone, string> = {
  brand:  'emc-eyebrow',
  accent: 'emc-eyebrow-accent',
  ink:    'emc-eyebrow-ink',
}

export default function SectionHeader({
  title,
  subtitle,
  centered = true,
  eyebrow,
  eyebrowTone = 'brand',
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-10 max-w-3xl',
        centered ? 'mx-auto text-center' : 'mr-0 ml-auto text-right',
        className,
      )}
    >
      {eyebrow && (
        <div className={cn('mb-4 flex', centered ? 'justify-center' : 'justify-start')}>
          <span className={eyebrowClass[eyebrowTone]}>
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                eyebrowTone === 'brand'
                  ? 'bg-customBlue'
                  : eyebrowTone === 'accent'
                  ? 'bg-customOrange'
                  : 'bg-deepBlue/55',
              )}
            />
            {eyebrow}
          </span>
        </div>
      )}
      <h2 className="text-3xl font-black leading-tight text-deepBlue sm:text-4xl">{title}</h2>
      <span
        className={cn(
          'mt-4 block h-1 w-20 rounded-full bg-customOrange',
          centered && 'mx-auto',
        )}
      />
      <p className="mt-5 text-base font-medium leading-8 text-deepBlue/65 sm:text-lg sm:leading-9">
        {subtitle}
      </p>
    </div>
  )
}
