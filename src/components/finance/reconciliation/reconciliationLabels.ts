import type { ReconciliationCase, ReconciliationResolution } from '@/api/paymentReconciliationsApi'

/** Arabic wording of everything a reconciliation case can say. One place, so the table, the drawer and the dialogs never disagree. */

export const REASON_LABEL: Record<string, string> = {
  instructor_conflict: 'الدافع صار مدرّب هذا البرنامج',
}

export const REASON_EXPLANATION: Record<string, string> = {
  instructor_conflict:
    'بدأ هذا الشخص الدفع، ثم أُسند مدرّباً للبرنامج نفسه قبل وصول تأكيد الدفع. استُلم المبلغ وسُجّل، لكن لم يُفعَّل تسجيله حتى لا يحصل على وصول متعلّم لما يدرّسه.',
}

export const PROGRAM_TYPE_LABEL = { course: 'دورة', workshop: 'ورشة', learning_path: 'مسار تعليمي' } as const

export const RESOLUTION_LABEL: Record<ReconciliationResolution, string> = {
  enrollment_activated: 'فُعّل التسجيل',
  closed_without_enrollment: 'أُغلقت دون تفعيل التسجيل',
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  payment_confirmed: 'دفعة مؤكَّدة',
  pending_payment: 'بانتظار الدفع',
  payment_failed: 'دفعة فاشلة',
}

export const REGISTRATION_STATUS_LABEL: Record<string, string> = {
  pending_payment: 'غير مفعّل (قيد المراجعة)',
  registered: 'مفعّل',
  payment_confirmed: 'مفعّل',
  attended: 'حضر',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  no_show: 'لم يحضر',
}

export type Tone = 'amber' | 'green' | 'slate' | 'blue'

export const TONE_CLASS: Record<Tone, string> = {
  amber: 'bg-amber-50 text-amber-900 ring-amber-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-brand-50 text-deepBlue ring-brand-200',
}

export type Badge = { key: string; label: string; tone: Tone }

/**
 * The badges of a case, in reading order: where the ENROLLMENT stands, then the refund follow-up when there is one.
 * "Refund pending" is a to-do marker; there is deliberately no "refunded" anywhere, because the platform holds no verified refund
 * evidence to base it on.
 */
export function badgesOf(c: ReconciliationCase): Badge[] {
  if (c.status === 'open') return [{ key: 'open', label: 'بانتظار القرار', tone: 'amber' }]

  const out: Badge[] = []
  if (c.resolution === 'enrollment_activated') out.push({ key: 'activated', label: RESOLUTION_LABEL.enrollment_activated, tone: 'green' })
  else out.push({ key: 'closed', label: RESOLUTION_LABEL.closed_without_enrollment, tone: 'slate' })
  if (c.refund_status === 'pending') out.push({ key: 'refund', label: 'استرداد معلّق', tone: 'amber' })

  return out
}

export const MIN_NOTE = 5
