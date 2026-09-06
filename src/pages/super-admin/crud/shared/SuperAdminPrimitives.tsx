import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SaPageRoot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div dir="rtl" className={cn('mx-auto max-w-[1600px] px-4 pb-12 pt-6 text-right sm:px-6 lg:px-8 rtl:text-right', className)}>
      {children}
    </div>
  )
}

export function SaBackLink({ className }: { className?: string }) {
  return (
    <Link
      to="/dashboard/super-admin"
      className={cn(
        'inline-flex items-center gap-2 text-[12px] font-black text-customBlue transition hover:text-deepBlue hover:underline',
        className,
      )}
    >
      لوحة السوبر مشرف
      <ArrowRight className="h-4 w-4 rotate-180" aria-hidden />
    </Link>
  )
}

/** Minimal top bar — use when the page has its own hero below */
export function SaToolbar({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-deepBlue/[0.06] pb-5">
      <div className="min-w-0 text-right">
        <SaBackLink className="mb-2" />
        {eyebrow ?
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-700">{eyebrow}</p>
        : null}
        <h1 className="mt-1 text-xl font-black text-deepBlue sm:text-2xl">{title}</h1>
        {subtitle ?
          <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-relaxed text-muted-600">{subtitle}</p>
        : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function SaGlassCard({
  children,
  className,
  glow,
}: {
  children: ReactNode
  className?: string
  glow?: 'blue' | 'orange' | 'none'
}) {
  const glowCls =
    glow === 'blue' ?
      'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(ellipse_at_100%_0%,rgba(0,119,182,0.14),transparent_55%)]'
    : glow === 'orange' ?
      'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(ellipse_at_100%_0%,rgba(242,140,0,0.16),transparent_55%)]'
    : ''

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/60 bg-white/75 shadow-[0_8px_40px_rgba(12,42,75,0.07)] backdrop-blur-md',
        glowCls,
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SaStatChip({
  label,
  value,
  tone = 'blue',
}: {
  label: string
  value: ReactNode
  tone?: 'blue' | 'orange' | 'ink' | 'success'
}) {
  const ring =
    tone === 'blue' ?
      'ring-customBlue/20 text-customBlue'
    : tone === 'orange' ?
      'ring-accent-400/30 text-accent-700'
    : tone === 'success' ?
      'ring-emerald-200 text-emerald-800'
    : 'ring-deepBlue/[0.12] text-deepBlue'

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-right shadow-sm ring-1 backdrop-blur-sm rtl:text-right',
        ring,
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-muted-600">{label}</p>
      <p className="mt-1 text-xl font-black tracking-tight">{value}</p>
    </div>
  )
}

export function SaFloatingActions({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-[120] flex flex-col items-start gap-2 sm:left-8 rtl:left-auto rtl:right-8">
      <div className="pointer-events-auto flex flex-col gap-2">{children}</div>
    </div>
  )
}
