import type { VolunteerRequestStatus } from '@/api/volunteerApplicationApi'

/** Badge styling per volunteer-request status — shared by the modal and the
 *  super-admin requests table. */
export const STATUS_CFG: Record<
  VolunteerRequestStatus,
  { label: string; badge: string; dot: string }
> = {
  pending: {
    label: 'قيد المراجعة',
    badge: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80',
    dot: 'bg-amber-500',
  },
  reviewed: {
    label: 'تحت المراجعة',
    badge: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200/80',
    dot: 'bg-[#0077B6]',
  },
  accepted: {
    label: 'مقبول',
    badge: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'مرفوض',
    badge: 'bg-red-50 text-red-700 ring-1 ring-red-200/80',
    dot: 'bg-red-500',
  },
  contacted: {
    label: 'تم التواصل',
    badge: 'bg-violet-50 text-violet-800 ring-1 ring-violet-200/80',
    dot: 'bg-violet-500',
  },
  reviewing: {
    label: 'جاري المراجعة',
    badge: 'bg-orange-50 text-orange-800 ring-1 ring-orange-200/80',
    dot: 'bg-orange-500',
  },
  converted_to_member: {
    label: 'تم التحويل لعضو',
    badge: 'bg-teal-50 text-teal-800 ring-1 ring-teal-200/80',
    dot: 'bg-teal-500',
  },
}
