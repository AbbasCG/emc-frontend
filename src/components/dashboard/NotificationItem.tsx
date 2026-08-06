import {
  Award,
  Bell,
  BookOpen,
  CheckCircle,
  ClipboardList,
  CreditCard,
  MessageSquare,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { markNotificationRead, notifyNotificationsRefresh } from '@/api/notificationsApi'
import { normalizeNotificationInternalPath } from '@/utils/notificationRoutes'
import { formatRelativeDate } from '@/utils/dateTime'

/** أنواع مدعومة من الواجهة — أي نوع آخر يُعرَض كـ general */
export type DashboardNotificationVisualKind =
  | 'general'
  | 'course_registered'
  | 'instructor_assigned'
  | 'course_updated'
  | 'registration_confirmed'
  | 'registration_rejected'
  | 'certificate_issued'
  | 'review_requested'
  | 'payment_confirmed'
  | 'assignment_graded'
  | 'assignment_submitted'
  | 'assignment_created'
  | 'session_scheduled'
  | 'attendance_marked'

type VisualConfig = {
  Icon: typeof Bell
  color: string
  bg: string
  label: string
}

const fallbackTypeConfig: VisualConfig = {
  Icon: Bell,
  color: 'text-customBlue',
  bg: 'bg-sky-50',
  label: 'إشعار',
}

const typeConfig: Record<DashboardNotificationVisualKind, VisualConfig> = {
  general: {
    Icon: Bell,
    color: 'text-customBlue',
    bg: 'bg-sky-50',
    label: 'إشعار',
  },
  course_registered: {
    Icon: UserPlus,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    label: 'تسجيل في دورة',
  },
  instructor_assigned: {
    Icon: UserCheck,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    label: 'مدرّب معيّن',
  },
  course_updated: {
    Icon: BookOpen,
    color: 'text-brand-600',
    bg: 'bg-brand-50',
    label: 'تحديث دورة',
  },
  registration_confirmed: {
    Icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    label: 'تأكيد التسجيل',
  },
  registration_rejected: {
    Icon: XCircle,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    label: 'رفض التسجيل',
  },
  certificate_issued: {
    Icon: Award,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    label: 'شهادة',
  },
  review_requested: {
    Icon: MessageSquare,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    label: 'طلب مراجعة',
  },
  payment_confirmed: {
    Icon: CreditCard,
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    label: 'دفع مؤكد',
  },
  assignment_graded: {
    Icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    label: 'تقييم واجب',
  },
  assignment_submitted: {
    Icon: ClipboardList,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    label: 'تسليم واجب',
  },
  assignment_created: {
    Icon: ClipboardList,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    label: 'واجب جديد',
  },
  session_scheduled: {
    Icon: BookOpen,
    color: 'text-customBlue',
    bg: 'bg-sky-50',
    label: 'جلسة مجدولة',
  },
  attendance_marked: {
    Icon: UserCheck,
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    label: 'تسجيل حضور',
  },
}

const SUPPORTED_KINDS = new Set<string>(Object.keys(typeConfig))

/** مطابقة أنواع قديمة / من notificationsApi أو لوحة أخرى */
const TYPE_ALIASES: Record<string, DashboardNotificationVisualKind> = {
  info: 'general',
  success: 'registration_confirmed',
  warning: 'general',
  registration: 'course_registered',
  course_registration: 'course_registered',
  payment: 'payment_confirmed',
  session_reminder: 'general',
  assignment_due: 'review_requested',
  assignment_graded: 'assignment_graded',
  assignment_submitted: 'assignment_submitted',
  assignment_created: 'assignment_created',
  session_scheduled: 'session_scheduled',
  attendance_marked: 'attendance_marked',
  task_assigned: 'instructor_assigned',
  meeting_invite: 'general',
  support_reply: 'review_requested',
  partner_update: 'general',
}

export function normalizeDashboardNotificationKind(raw: unknown): DashboardNotificationVisualKind {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  if (!key) return 'general'
  if (SUPPORTED_KINDS.has(key)) return key as DashboardNotificationVisualKind
  const aliased = TYPE_ALIASES[key]
  if (aliased) return aliased
  return 'general'
}

function resolveVisualConfig(kind: DashboardNotificationVisualKind): VisualConfig {
  const resolved = typeConfig[kind]
  return resolved ?? fallbackTypeConfig
}

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
