import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * EMC <Surface /> — the foundation card.
 * Variants compose layered shadows, borders, and backgrounds from design tokens
 * so any page can drop in a premium-looking card without re-inventing styles.
 */

export type SurfaceVariant = 'default' | 'soft' | 'glass' | 'inverse' | 'subtle'
export type SurfaceElevation = 0 | 1 | 2 | 3 | 4
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg' | 'xl'

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: SurfaceVariant
  elevation?: SurfaceElevation
  padding?: SurfacePadding
  interactive?: boolean
  children: ReactNode
}

const variantClass: Record<SurfaceVariant, string> = {
  default: 'border border-deepBlue/[0.07] bg-white',
  soft:    'border border-deepBlue/[0.06] bg-emcBg',
  glass:   'border border-white/45 bg-white/70 backdrop-blur-xl',
  inverse: 'border border-white/10 bg-deepBlue text-white',
  subtle:  'border border-transparent bg-deepBlue/[0.03]',
}

const elevationClass: Record<SurfaceElevation, string> = {
  0: 'shadow-none',
  1: 'shadow-emc-xs',
  2: 'shadow-emc-sm',
  3: 'shadow-emc',
  4: 'shadow-emc-lg',
}

const paddingClass: Record<SurfacePadding, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-6 sm:p-7',
  xl:   'p-8 sm:p-10',
}

export default function Surface({
  variant = 'default',
  elevation = 3,
  padding = 'md',
  interactive = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        'relative rounded-2xl ring-1 ring-deepBlue/[0.03] transition',
        variantClass[variant],
        elevationClass[elevation],
        paddingClass[padding],
        interactive &&
          'cursor-pointer duration-300 ease-emc-out hover:-translate-y-[2px] hover:shadow-emc-md hover:border-customBlue/30',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
