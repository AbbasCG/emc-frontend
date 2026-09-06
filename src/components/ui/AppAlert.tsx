import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AppAlertProps = {
  type: 'error' | 'success' | 'info'
  title: string
  message?: string | ReactNode
  dismissible?: boolean
  onDismiss?: () => void
}

export default function AppAlert({ type, title, message, dismissible = false, onDismiss }: AppAlertProps) {
  const [isVisible, setIsVisible] = useState(true)

  // A dismissed alert has to come back when the same instance is handed a *different*
  // alert — e.g. a form that reuses one <AppAlert> for every server error. Adjusted
  // during render (react.dev "adjusting state when a prop changes"), never in an effect.
  // A ReactNode message is a new object on every render, so only string messages take
  // part in the identity; otherwise such an alert could never stay dismissed.
  const identity = JSON.stringify([type, title, typeof message === 'string' ? message : null])
  const [seenIdentity, setSeenIdentity] = useState(identity)
  if (seenIdentity !== identity) {
    setSeenIdentity(identity)
    setIsVisible(true)
  }

  if (!isVisible) return null

  const styles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-100',
      icon: 'text-red-600',
      title: 'text-red-800',
      text: 'text-red-700',
      Icon: AlertCircle,
      role: 'alert',
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      icon: 'text-emerald-600',
      title: 'text-emerald-800',
      text: 'text-emerald-700',
      Icon: CheckCircle2,
      role: 'status',
    },
    info: {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      icon: 'text-[#DD7C02]',
      title: 'text-deepBlue',
      text: 'text-slate-700',
      Icon: Info,
      role: 'status',
    },
  }

  const style = styles[type]
  const Icon = style.Icon

  return (
    <div className={cn(style.bg, style.border, 'rounded-2xl border p-4 shadow-sm')} role={style.role}>
      <div className="flex items-start gap-4">
        <Icon size={22} className={cn(style.icon, 'mt-0.5 shrink-0')} aria-hidden="true" />
        <div className="flex-1 text-right">
          <h3 className={cn('font-bold', style.title)}>{title}</h3>
          {message && <p className={cn(style.text, 'mt-1 text-sm font-medium leading-6')}>{message}</p>}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={() => {
              setIsVisible(false)
              onDismiss?.()
            }}
            className={cn(style.title, 'rounded-lg p-1 transition hover:bg-white/70')}
            aria-label="إغلاق التنبيه"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
