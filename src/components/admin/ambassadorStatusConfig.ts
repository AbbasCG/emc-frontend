import type { AmbassadorStatus } from '@/api/ambassadorApplicationApi'

export const AMBASSADOR_STATUS_CFG: Record<
  AmbassadorStatus,
  { label: string; badge: string; dot: string }
> = {
  new: {
    label: 'جديد',
    badge: 'bg-blue-50 text-blue-800 ring-1 ring-blue-200/80',
    dot: 'bg-blue-500',
  },
  under_review: {
    label: 'قيد المراجعة',
    badge: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80',
    dot: 'bg-amber-500',
  },
  interview_scheduled: {
    label: 'مقابلة مجدولة',
    badge: 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200/80',
    dot: 'bg-indigo-500',
  },
  approved: {
    label: 'مقبول',
    badge: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'مرفوض',
    badge: 'bg-red-50 text-red-700 ring-1 ring-red-200/80',
    dot: 'bg-red-500',
  },
  waitlisted: {
    label: 'قائمة انتظار',
    badge: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
    dot: 'bg-slate-500',
  },
  cancelled: {
    label: 'ملغى',
    badge: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/80',
    dot: 'bg-slate-400',
  },
}
