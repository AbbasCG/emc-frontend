/** Central Arabic label maps for backend status enums. */

export const KNOWLEDGE_CATEGORY_LABELS: Record<string, string> = {
  policies: 'السياسات',
  guides: 'الأدلة',
  templates: 'القوالب',
  reports: 'التقارير',
  lessons_learned: 'الدروس المستفادة',
}


export const COURSE_STATUS_LABELS: Record<string, string> = {
  published: 'منشور',
  draft: 'مسودة',
  archived: 'مؤرشف',
  active: 'نشط',
  inactive: 'غير نشط',
  upcoming: 'قادم',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  registered: 'مسجّل',
  pending_payment: 'في انتظار الدفع',
  payment_confirmed: 'مدفوع ومؤكّد',
  cancelled: 'ملغي',
  attended: 'حضر',
  no_show: 'لم يحضر',
  // Legacy/internal
  active: 'نشط',
  pending: 'قيد المعالجة',
  completed: 'مكتمل',
  rejected: 'مرفوض',
}

/**
 * Maps any raw backend registration status string to the three-value
 * Enrollment.status union used by the UI merge layer.
 */
export function normalizeRegistrationStatus(
  raw?: string | null,
): 'active' | 'pending' | 'completed' {
  const s = String(raw ?? '').toLowerCase()
  if (s === 'attended' || s.includes('complete') || s.includes('finish')) return 'completed'
  if (
    s === 'pending_payment' ||
    s === 'pending' ||
    s === 'registered' ||
    s.includes('wait') ||
    s.includes('hold')
  )
    return 'pending'
  if (s === 'cancelled' || s === 'no_show' || s.includes('cancel') || s.includes('reject'))
    return 'pending'
  return 'active'
}

/** Arabic label for a registration status string. Defaults to "مسجّل". */
export function getRegistrationStatusLabel(raw?: string | null): string {
  const s = String(raw ?? '').toLowerCase().trim()
  return REGISTRATION_STATUS_LABELS[s] ?? REGISTRATION_STATUS_LABELS['active']
}

/** Arabic label for a course status string. */
export function getCourseStatusLabel(raw?: string | null): string {
  const s = String(raw ?? '').toLowerCase().trim()
  return COURSE_STATUS_LABELS[s] ?? (raw ? String(raw) : 'غير محدد')
}

/** Badge colour tokens for registration statuses (Tailwind classes). */
export const REGISTRATION_STATUS_BADGE: Record<
  string,
  { text: string; bg: string; ring: string }
> = {
  registered: { text: 'text-sky-800', bg: 'bg-sky-50', ring: 'ring-sky-200/80' },
  pending_payment: { text: 'text-amber-800', bg: 'bg-amber-50', ring: 'ring-amber-200/80' },
  payment_confirmed: { text: 'text-emerald-800', bg: 'bg-emerald-50', ring: 'ring-emerald-200/80' },
  attended: { text: 'text-emerald-800', bg: 'bg-emerald-50', ring: 'ring-emerald-200/80' },
  cancelled: { text: 'text-rose-800', bg: 'bg-rose-50', ring: 'ring-rose-200/80' },
  no_show: { text: 'text-rose-800', bg: 'bg-rose-50', ring: 'ring-rose-200/80' },
  active: { text: 'text-sky-800', bg: 'bg-sky-50', ring: 'ring-sky-200/80' },
  pending: { text: 'text-amber-800', bg: 'bg-amber-50', ring: 'ring-amber-200/80' },
  completed: { text: 'text-emerald-800', bg: 'bg-emerald-50', ring: 'ring-emerald-200/80' },
}

export function getRegistrationStatusBadge(raw?: string | null) {
  const s = String(raw ?? '').toLowerCase().trim()
  return (
    REGISTRATION_STATUS_BADGE[s] ?? {
      text: 'text-slate-600',
      bg: 'bg-slate-50',
      ring: 'ring-slate-200/80',
    }
  )
}
