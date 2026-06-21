import { motion } from 'framer-motion'
import type { MouseEventHandler, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AppButtonProps = {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  className?: string
  'aria-label'?: string
}

export default function AppButton({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props
}: AppButtonProps) {
  const variants = {
    primary:
      'bg-[#DD7C02] text-white shadow-lg shadow-amber-200/60 hover:bg-[#C97208]',
    secondary:
      'bg-deepBlue text-white shadow-lg shadow-slate-300/60 hover:bg-[#172536]',
    outline:
      'border border-amber-300 bg-white text-deepBlue shadow-sm shadow-amber-100/70 hover:border-[#DD7C02] hover:bg-amber-50',
    ghost: 'bg-transparent text-deepBlue hover:bg-amber-50',
  }

  const sizes = {
    sm: 'h-10 px-4 text-sm',
    md: 'h-12 px-6 text-base',
    lg: 'h-14 px-8 text-base',
  }

  return (
    <motion.button
      type={type}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading ? { y: -1 } : undefined}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition outline-none emc-focus-ring',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        (disabled || isLoading) && 'cursor-not-allowed opacity-60',
        className,
      )}
      {...props}
    >
      {isLoading && (
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </motion.button>
  )
}
