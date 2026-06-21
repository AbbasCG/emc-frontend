import { cn } from '@/lib/utils'

type AppBadgeProps = {
  label: string
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md'
  className?: string
}

export default function AppBadge({ label, variant = 'primary', size = 'md', className = '' }: AppBadgeProps) {
  const variants = {
    primary: 'bg-deepBlue/10 text-deepBlue',
    secondary: 'bg-amber-100 text-[#8a621f]',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-orange-100 text-orange-700',
    error: 'bg-red-100 text-red-700',
  }

  const sizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
  }

  return <span className={cn('inline-flex rounded-full font-bold', variants[variant], sizes[size], className)}>{label}</span>
}
