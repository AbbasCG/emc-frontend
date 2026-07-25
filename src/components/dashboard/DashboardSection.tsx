import type { ReactNode } from 'react'
import { Link } from 'react-router'

type DashboardSectionProps = {
  title: string
  subtitle?: string
  action?: { label: string; href: string }
  children: ReactNode
  className?: string
}

export default function DashboardSection({
  title,
  subtitle,
  action,
  children,
  className = '',
}: DashboardSectionProps) {
  return (
    <section className={className}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="emc-title-arc text-xl font-black tracking-tight text-deepBlue font-display">{title}</h2>
          {subtitle && (
            <p className="mt-2 text-sm leading-relaxed text-deepBlue/55">{subtitle}</p>
          )}
        </div>
        {action && (
          <Link
            to={action.href}
            className="shrink-0 rounded-xl px-4 py-2 text-sm font-black text-customBlue transition-colors duration-200 hover:bg-customBlue/[0.06]"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
