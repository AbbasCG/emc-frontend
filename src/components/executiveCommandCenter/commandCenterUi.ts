import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  GraduationCap,
  LifeBuoy,
  Mail,
  ServerCog,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type {
  CommandCenterPriority,
  CommandCenterRange,
  CommandCenterSectionKey,
  CommandCenterSourceKey,
} from '@/api/executiveCommandCenterApi'

/** Presentation only: Arabic labels, tones and formatting for the command center. */

export const RANGE_OPTIONS: { value: CommandCenterRange; label: string }[] = [
  { value: 'today', label: 'اليوم' },
  { value: 'week', label: '7 أيام' },
  { value: 'month', label: '30 يوم' },
]

export const SOURCE_META: Record<CommandCenterSourceKey, { label: string; icon: LucideIcon; badge: string }> = {
  smart_rules: { label: 'التنبيهات الذكية', icon: Sparkles, badge: 'bg-customOrange/10 text-customOrange' },
  tickets: { label: 'التذاكر', icon: LifeBuoy, badge: 'bg-customBlue/10 text-customBlue' },
  meetings: { label: 'الاجتماعات', icon: CalendarClock, badge: 'bg-violet-50 text-violet-700' },
  education: { label: 'التعليم', icon: GraduationCap, badge: 'bg-emerald-50 text-emerald-700' },
  finance: { label: 'المالية', icon: CircleDollarSign, badge: 'bg-amber-50 text-amber-800' },
  hr: { label: 'الموارد البشرية', icon: Users, badge: 'bg-pink-50 text-pink-700' },
  quality: { label: 'الجودة', icon: ShieldCheck, badge: 'bg-teal-50 text-teal-700' },
  email: { label: 'البريد', icon: Mail, badge: 'bg-sky-50 text-sky-700' },
  users: { label: 'المستخدمون', icon: UserCheck, badge: 'bg-indigo-50 text-indigo-700' },
  system: { label: 'النظام', icon: ServerCog, badge: 'bg-slate-100 text-slate-700' },
}

export const PRIORITY_META: Record<CommandCenterPriority, { label: string; badge: string; bar: string }> = {
  critical: { label: 'حرج', badge: 'bg-red-50 text-red-700 ring-red-200', bar: 'bg-red-500' },
  high: { label: 'عاجل', badge: 'bg-customOrange/10 text-customOrange ring-customOrange/30', bar: 'bg-customOrange' },
  medium: { label: 'مهم', badge: 'bg-amber-50 text-amber-800 ring-amber-200', bar: 'bg-amber-400' },
  low: { label: 'متوسط', badge: 'bg-slate-100 text-slate-600 ring-slate-200', bar: 'bg-slate-300' },
  info: { label: 'معلومة', badge: 'bg-customBlue/10 text-customBlue ring-customBlue/20', bar: 'bg-customBlue/60' },
}

export const SECTION_META: Record<CommandCenterSectionKey, { icon: LucideIcon; empty: string; tone: string }> = {
  needs_attention: { icon: AlertTriangle, empty: 'لا يوجد ما يحتاج انتباهك الآن.', tone: 'text-customOrange' },
  upcoming: { icon: CalendarClock, empty: 'لا توجد مواعيد قادمة ضمن هذه الفترة.', tone: 'text-customBlue' },
  recent_updates: { icon: Activity, empty: 'لا توجد تحديثات حديثة ضمن هذه الفترة.', tone: 'text-emerald-600' },
  errors: { icon: ServerCog, empty: 'لا توجد أخطاء أو تنبيهات. كل شيء يعمل.', tone: 'text-red-600' },
}

export const SOURCE_ORDER: CommandCenterSourceKey[] = ['smart_rules', 'tickets', 'meetings', 'education', 'finance', 'hr', 'quality', 'email', 'users', 'system']
const DATE_LOCALE = 'ar-SA-u-ca-gregory-nu-latn'

export function formatDateTime(raw: string | null | undefined): string {
  if (!raw) return '—'
  const t = Date.parse(raw)
  if (!Number.isFinite(t)) return '—'
  return new Intl.DateTimeFormat(DATE_LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(t))
}

/** «منذ ساعتين» / «بعد يومين». Falls back to the absolute date beyond a month. */
export function formatRelative(raw: string | null | undefined, now: number = Date.now()): string {
  if (!raw) return '—'
  const t = Date.parse(raw)
  if (!Number.isFinite(t)) return '—'
  const diffSec = Math.round((t - now) / 1000)
  const abs = Math.abs(diffSec)
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })
  if (abs < 60) return rtf.format(0, 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day')
  return formatDateTime(raw)
}

export function initialOf(name: string): string {
  return Array.from(name.trim())[0] ?? '؟'
}
