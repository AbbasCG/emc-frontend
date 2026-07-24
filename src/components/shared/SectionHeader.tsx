import type { ReactNode } from 'react'
import SectionHeading from '@/components/ui/SectionHeading'
import type { EyebrowTone } from '@/components/ui/Eyebrow'
import { cn } from '@/lib/utils'

/**
 * Thin adapter over the canonical `<SectionHeading />` (`@/components/ui`).
 * Preserves the legacy shared API (`centered`, required `subtitle`) so the
 * existing call sites stay untouched. New code should import `SectionHeading`
 * directly.
 */

type SectionHeaderProps = {
  title: string
  subtitle: string
  centered?: boolean
  eyebrow?: ReactNode
  eyebrowTone?: EyebrowTone
  className?: string
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
    <SectionHeading
      title={title}
      subtitle={subtitle}
      eyebrow={eyebrow}
      eyebrowTone={eyebrowTone}
      align={centered ? 'center' : 'start'}
      className={cn(!centered && 'max-w-3xl', className)}
    />
  )
}
