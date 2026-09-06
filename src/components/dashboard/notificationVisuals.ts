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

export type VisualConfig = {
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

export function resolveVisualConfig(kind: DashboardNotificationVisualKind): VisualConfig {
  const resolved = typeConfig[kind]
  return resolved ?? fallbackTypeConfig
}
