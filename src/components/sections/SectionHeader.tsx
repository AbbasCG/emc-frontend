import SectionHeading from '@/components/ui/SectionHeading'
import { cn } from '@/lib/utils'

/**
 * Thin adapter over the canonical `<SectionHeading />` (`@/components/ui`).
 * Preserves the legacy sections API (`description`, `align: 'right'`, fade-up
 * entrance) so the existing call sites stay untouched. New code should import
 * `SectionHeading` directly.
 */

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
  return (
    <SectionHeading
      eyebrow={eyebrow}
      eyebrowTone="accent"
      title={title}
      subtitle={subtitle}
      description={description}
      align={align}
      animate
      className={cn('mb-8 max-w-2xl md:max-w-3xl', className)}
    />
  )
}
