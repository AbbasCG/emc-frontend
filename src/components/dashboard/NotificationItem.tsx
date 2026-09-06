import { Link } from 'react-router'
import { markNotificationRead, notifyNotificationsRefresh } from '@/api/notificationsApi'
import { normalizeNotificationInternalPath } from '@/utils/notificationRoutes'
import { formatRelativeDate } from '@/utils/dateTime'
import {
  normalizeDashboardNotificationKind,
  resolveVisualConfig,
} from './notificationVisuals'

export type { DashboardNotificationVisualKind } from './notificationVisuals'

function safeTitle(n: NotificationLike): string {
  const t = n.title
  if (typeof t === 'string' && t.trim() !== '') return t.trim()
  return 'إشعار'
}

function safeMessage(n: NotificationLike): string {
  const m = n.message ?? n.body
  if (typeof m === 'string') return m.trim()
  return ''
}

function safeCreatedAt(n: NotificationLike): string | null {
  const c = n.created_at ?? n.createdAt
  if (typeof c === 'string' && c.trim() !== '') return c.trim()
  return null
}

function safeReadState(n: NotificationLike): boolean {
  if (typeof n.is_read === 'boolean') return n.is_read
  const ra = n.read_at ?? n.readAt
  if (ra == null) return false
  if (typeof ra === 'string' && ra.trim() === '') return false
  return true
}

function safeInternalHref(n: NotificationLike): string | null {
  const candidates = [n.href, n.action_url, n.url, n.link]
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue
    const s = raw.trim()
    if (s.startsWith('/')) return s
  }
  return null
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'تاريخ غير متاح'
  const rel = formatRelativeDate(iso)
  return rel === '—' ? 'تاريخ غير متاح' : rel
}

/** صف إشعار من اللوحة أو الـ LMS — يطابق حقولاً جزئية من الـ API */
export type NotificationLike = {
  id?: number | string
  title?: string | null
  message?: string | null
  body?: string | null
  type?: string | null
  is_read?: boolean
  read_at?: string | null
  created_at?: string | null
  createdAt?: string | null
  readAt?: string | null
  href?: string | null
  action_url?: string | null
  url?: string | null
  link?: string | null
  category?: string | null
  kind?: string | null
}

export default function NotificationItem({ notification }: { notification: NotificationLike }) {
  const rawType =
    notification.type ??
    (notification as { category?: unknown }).category ??
    (notification as { kind?: unknown }).kind
  const kind = normalizeDashboardNotificationKind(rawType)
  const config = resolveVisualConfig(kind)
  const Icon = config.Icon

  const title = safeTitle(notification)
  const message = safeMessage(notification)
  const createdAt = safeCreatedAt(notification)
  const isRead = safeReadState(notification)
  const rawHref = safeInternalHref(notification)
  const href = rawHref ? normalizeNotificationInternalPath(rawHref) : null

  function markReadFireAndForget(): void {
    const id = Number(notification.id)
    if (!Number.isFinite(id)) return
    void markNotificationRead(id).finally(() => notifyNotificationsRefresh())
  }

  const inner = (
    <div className={`flex items-start gap-3 p-3 transition ${isRead ? '' : 'bg-sky-50/60'}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${config.bg}`}>
        <Icon size={16} className={config.color} aria-hidden />
      </span>
      <div className="min-w-0 flex-1 text-right">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400">{timeAgo(createdAt)}</p>
          {!isRead ? <span className="h-2 w-2 shrink-0 rounded-full bg-customBlue" /> : null}
        </div>
        <p className="mt-0.5 text-sm font-black text-deepBlue">{title}</p>
        {message ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{message}</p> : null}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        to={href}
        className="block no-underline hover:bg-slate-50/80"
        onClick={() => markReadFireAndForget()}
      >
        {inner}
      </Link>
    )
  }

  return inner
}
