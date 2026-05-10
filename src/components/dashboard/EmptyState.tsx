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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        <Icon size={28} className="text-slate-400" />
      </div>
      <h3 className="text-base font-black text-deepBlue">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-slate-400">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link
              to={action.href}
              className="inline-flex items-center rounded-xl bg-customBlue px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-sky-200 transition hover:bg-[#1e7dab]"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center rounded-xl bg-customBlue px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-sky-200 transition hover:bg-[#1e7dab]"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
