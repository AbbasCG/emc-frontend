import { cn } from '@/lib/utils'

type AppBadgeProps = {
  label: string
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md'
  className?: string
}

export default function AppBadge({ label, variant = 'primary', size = 'md', className = '' }: AppBadgeProps) {
  const variants = {
    primary: 'bg-customBlue/[0.08] text-customBlue ring-1 ring-customBlue/15',
    secondary: 'bg-accent-500/[0.10] text-accent-700 ring-1 ring-accent-500/20',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    warning: 'bg-amber-50 text-accent-700 ring-1 ring-amber-200',
    error: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  }

  const sizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
  }

  return <span className={cn('inline-flex items-center rounded-full font-black tracking-tight', variants[variant], sizes[size], className)}>{label}</span>
}
