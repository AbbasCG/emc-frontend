import { cn } from '@/lib/utils'

const MAP: Record<
  string,
  { className: string }
> = {
  default: { className: 'border-ink-200 bg-ink-50 text-ink-700' },
  brand: { className: 'border-brand-200 bg-brand-50 text-brand-900' },
  accent: { className: 'border-accent-200 bg-accent-50 text-accent-900' },
  success: { className: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  danger: { className: 'border-red-200 bg-red-50 text-red-900' },
}

export function CrudBadge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: keyof typeof MAP
}) {
  const s = MAP[variant] ?? MAP.default
  return (
    <span
      className={cn(
        'inline-flex max-w-[11rem] items-center truncate rounded-full border px-2.5 py-0.5 text-[11px] font-black',
        s.className,
      )}
    >
      {children}
    </span>
  )
}
