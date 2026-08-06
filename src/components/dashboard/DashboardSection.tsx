import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

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
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-deepBlue">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {action && (
          <Link
            to={action.href}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-bold text-customBlue transition hover:bg-sky-50"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
