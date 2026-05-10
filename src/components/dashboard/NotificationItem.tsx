import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import type { Notification } from '../../types'

const typeConfig = {
  info:    { Icon: Info,          color: 'text-customBlue',    bg: 'bg-sky-50'    },
  success: { Icon: CheckCircle,   color: 'text-emerald-600',   bg: 'bg-emerald-50'},
  warning: { Icon: AlertTriangle, color: 'text-customOrange',  bg: 'bg-orange-50' },
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  return `منذ ${Math.floor(hours / 24)} يوم`
}

export default function NotificationItem({ notification }: { notification: Notification }) {
  const { Icon, color, bg } = typeConfig[notification.type]

  return (
    <div className={`flex items-start gap-3 p-3 transition ${notification.is_read ? '' : 'bg-sky-50/60'}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${bg}`}>
        <Icon size={16} className={color} />
      </span>
      <div className="min-w-0 flex-1 text-right">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400">{timeAgo(notification.created_at)}</p>
          {!notification.is_read && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-customBlue" />
          )}
        </div>
        <p className="mt-0.5 text-sm font-black text-deepBlue">{notification.title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{notification.message}</p>
      </div>
    </div>
  )
}
