import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Inbox } from 'lucide-react'

type Action = {
  label: string
  href?: string
  onClick?: () => void
}

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: Action
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border border-dashed border-deepBlue/15 bg-white px-6 py-16 text-center shadow-emc">
      {/* Calm sea-only glow — keeps the surface alive without noise */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-customBlue/[0.06] blur-3xl"
      />
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-customBlue/[0.06] ring-1 ring-customBlue/10">
        <Icon size={28} strokeWidth={1.75} className="text-customBlue/70" aria-hidden />
      </div>
      <h3 className="relative text-base font-black tracking-tight text-deepBlue font-display">{title}</h3>
      {description && (
        <p className="relative mx-auto mt-2 max-w-xs text-sm leading-7 text-deepBlue/55">{description}</p>
      )}
      {action && (
        <div className="relative mt-6">
          {action.href ? (
            <Link
              to={action.href}
              className="emc-focus-ring inline-flex items-center rounded-xl bg-customBlue px-6 py-2.5 text-sm font-bold text-white shadow-emc-sm transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:bg-[#1e7dab] hover:shadow-emc"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="emc-focus-ring inline-flex items-center rounded-xl bg-customBlue px-6 py-2.5 text-sm font-bold text-white shadow-emc-sm transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:bg-[#1e7dab] hover:shadow-emc"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
