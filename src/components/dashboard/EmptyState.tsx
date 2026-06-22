import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-deepBlue/15 bg-white px-6 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-deepBlue/[0.04] ring-1 ring-deepBlue/[0.06]">
        <Icon size={28} className="text-deepBlue/40" />
      </div>
      <h3 className="text-base font-black tracking-tight text-deepBlue font-display">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-deepBlue/50">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link
              to={action.href}
              className="inline-flex items-center rounded-xl bg-customBlue px-6 py-2.5 text-sm font-bold text-white shadow-emc-sm transition hover:bg-[#1e7dab] hover:shadow-emc"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center rounded-xl bg-customBlue px-6 py-2.5 text-sm font-bold text-white shadow-emc-sm transition hover:bg-[#1e7dab] hover:shadow-emc"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
