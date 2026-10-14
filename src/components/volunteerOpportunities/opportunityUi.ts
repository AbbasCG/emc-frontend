import type { PublicOpportunityStatus } from '@/api/volunteerOpportunitiesApi'

export const STATUS_BADGE: Record<PublicOpportunityStatus, string> = {
  open: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  closing_soon: 'bg-customOrange/10 text-customOrange ring-customOrange/30',
  closed: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export const SORT_OPTIONS: { value: 'newest' | 'deadline' | 'title'; label: string }[] = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'deadline', label: 'الأقرب موعدًا' },
  { value: 'title', label: 'الاسم' },
]

export const EXPERIENCE_LEVELS = ['مبتدئ', 'متوسط', 'متقدم', 'خبير']

export const AVAILABILITY_OPTIONS = ['أقل من 3 ساعات أسبوعيًا', '3-5 ساعات أسبوعيًا', '5-10 ساعات أسبوعيًا', 'أكثر من 10 ساعات أسبوعيًا']

const LOCALE = 'ar-SA-u-ca-gregory-nu-latn'

export function formatDay(raw: string | null | undefined): string {
  if (!raw) return '—'
  const t = Date.parse(raw)
  return Number.isFinite(t) ? new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long' }).format(new Date(t)) : '—'
}

export function deadlineText(closesAt: string | null, daysLeft: number | null): string {
  if (!closesAt) return 'بدون موعد نهائي'
  if (daysLeft === 0) return `آخر يوم للتقديم: ${formatDay(closesAt)}`
  return `آخر موعد للتقديم: ${formatDay(closesAt)}`
}
