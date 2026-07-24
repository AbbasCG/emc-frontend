import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * EMC <Eyebrow /> — small uppercase tag that anchors section titles, cards, and
 * navigation chunks. Three tones map to the brand triad.
 */

export type EyebrowTone = 'brand' | 'accent' | 'ink' | 'success' | 'danger'

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: EyebrowTone
  /** Optional leading dot. Hidden when false. */
  dot?: boolean
  children: ReactNode
}

const toneClass: Record<EyebrowTone, string> = {
  brand:   'emc-eyebrow',
  accent:  'emc-eyebrow-accent',
  ink:     'emc-eyebrow-ink',
  success: 'emc-chip-success uppercase tracking-[0.18em]',
  danger:  'emc-chip-danger uppercase tracking-[0.18em]',
}

const dotClass: Record<EyebrowTone, string> = {
  brand:   'bg-customBlue',
  accent:  'bg-customOrange',
  ink:     'bg-deepBlue/55',
  success: 'bg-emerald-500',
  danger:  'bg-rose-500',
}

export default function Eyebrow({
  tone = 'brand',
  dot = true,
  className,
  children,
  ...rest
}: Props) {
  return (
    <span className={cn(toneClass[tone], className)} {...rest}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotClass[tone])} />}
      {children}
    </span>
  )
}
