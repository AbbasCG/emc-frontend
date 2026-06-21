import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * EMC <EmcButton /> — premium, accessible button primitive.
 *
 * Backward-compatible API: legacy props `variant` (primary|secondary|ghost|danger)
 * and `className` continue to work. New props add sizes, icons, loading state,
 * and richer brand variants without changing existing call-sites.
 */

export type EmcButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'gradient'
  | 'outline'
  | 'accent'
  | 'dark'

export type EmcButtonSize = 'xs' | 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: EmcButtonVariant
  size?: EmcButtonSize
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

const variantClass: Record<EmcButtonVariant, string> = {
  primary:
    'bg-customBlue text-white shadow-[0_12px_30px_-12px_rgba(0, 119, 182,0.55)] hover:bg-[#1e7dab] hover:shadow-[0_18px_36px_-12px_rgba(0, 119, 182,0.6)] disabled:opacity-50',
  secondary:
    'border border-slate-200 bg-white text-deepBlue shadow-emc-xs hover:border-customBlue/35 hover:bg-sky-50 disabled:opacity-50',
  ghost:
    'text-deepBlue hover:bg-deepBlue/[0.05] disabled:opacity-50',
  danger:
    'bg-red-600 text-white shadow-[0_12px_30px_-12px_rgba(220,38,38,0.45)] hover:bg-red-700 disabled:opacity-50',
  /** New variants */
  gradient:
    'bg-brand-gradient text-white shadow-[0_14px_34px_-12px_rgba(0, 119, 182,0.55)] hover:brightness-[1.05] hover:shadow-[0_18px_40px_-12px_rgba(0, 119, 182,0.62)] disabled:opacity-50',
  outline:
    'border border-deepBlue/15 bg-transparent text-deepBlue hover:border-customBlue/35 hover:bg-customBlue/[0.05] disabled:opacity-50',
  accent:
    'bg-customOrange text-white shadow-[0_12px_30px_-12px_rgba(242, 140, 0,0.5)] hover:brightness-[1.05] hover:shadow-[0_18px_36px_-12px_rgba(242, 140, 0,0.55)] disabled:opacity-50',
  dark:
    'bg-deepBlue text-white shadow-[0_14px_30px_-12px_rgba(15,42,67,0.55)] hover:bg-[#1a283b] disabled:opacity-50',
}

const sizeClass: Record<EmcButtonSize, string> = {
  xs: 'min-h-[32px] gap-1.5 rounded-lg px-3 text-[12px]',
  sm: 'min-h-[38px] gap-1.5 rounded-xl px-4 text-[13px]',
  md: 'min-h-[44px] gap-2 rounded-xl px-5 py-2.5 text-sm',
  lg: 'min-h-[52px] gap-2.5 rounded-2xl px-6 py-3 text-[15px]',
}

export default function EmcButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  leadingIcon,
  trailingIcon,
  loading = false,
  fullWidth = false,
  disabled,
  type = 'button',
  ...rest
}: Props) {
  const isBusy = !!loading
  return (
    <button
      type={type}
      aria-busy={isBusy || undefined}
      disabled={disabled || isBusy}
      className={cn(
        'emc-focus-ring relative inline-flex items-center justify-center font-black tracking-tight transition-all duration-200 ease-emc-out',
        'disabled:cursor-not-allowed',
        'active:translate-y-[0.5px]',
        sizeClass[size],
        variantClass[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {isBusy ? (
        <Loader2 size={size === 'xs' ? 14 : size === 'sm' ? 15 : 16} className="animate-spin" aria-hidden />
      ) : (
        leadingIcon && <span className="-mr-0.5 inline-flex shrink-0 items-center">{leadingIcon}</span>
      )}
      <span className="min-w-0 truncate">{children}</span>
      {!isBusy && trailingIcon && (
        <span className="-ml-0.5 inline-flex shrink-0 items-center">{trailingIcon}</span>
      )}
    </button>
  )
}
