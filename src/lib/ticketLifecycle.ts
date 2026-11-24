import type { TicketNextActor, TicketNextStepKey } from '@/types/ticket'

/** Plain Arabic for «what is the ticket waiting for» (from the server's `workflow.next_step_key`). */
export const NEXT_STEP_TEXT: Record<TicketNextStepKey, string | null> = {
  submit_for_review: 'بانتظار إرسال المكلّف العمل للمراجعة',
  review: 'بانتظار مراجعة الإنجاز',
  deploy: 'بانتظار النشر على الموقع الحي',
  verify_live: 'بانتظار اختبار المكلّف',
  none: null,
}

/** Who holds that next action (from the server's `workflow.next_actor`). */
export const NEXT_ACTOR_TEXT: Record<Exclude<TicketNextActor, null>, string> = {
  assignee: 'المكلّف',
  reviewer: 'المراجع',
  deployer: 'مسؤول النشر',
}

export const NOTE_MIN = 5
export const NOTE_MAX = 1000
export const LIVE_URL_MAX = 500

/** A live address must be a real https URL of at most 500 characters. */
export function validateLiveUrl(raw: string): string | null {
  const v = raw.trim()
  if (v === '') return 'أدخل رابط الموقع الحي الذي نُشر عليه العمل.'
  if (v.length > LIVE_URL_MAX) return `الرابط طويل جدًا؛ الحد الأقصى ${LIVE_URL_MAX} حرف.`
  try {
    const url = new URL(v)
    if (url.protocol !== 'https:' || url.hostname === '') return 'أدخل رابطًا صحيحًا يبدأ بـ https://'
  } catch {
    return 'أدخل رابطًا صحيحًا يبدأ بـ https://'
  }

  return null
}

export const DEPLOYMENT_FROZEN_MESSAGE = 'لا يمكن تغيير هذا الخيار الآن لأن التذكرة في مرحلة المراجعة أو النشر.'
export const ASSIGNEE_FROZEN_MESSAGE = 'لا يمكنك تعديل التقدير لتذكرة أنت المكلف بها'
export const DEPLOYMENT_FLAG_LOCKED_MESSAGE = 'لا يمكن إلغاء شرط النشر على الموقع الحي بعد أول إرسال للمراجعة.'
/** The deployment clause of the estimate note: shown only where «تتطلب نشرًا» is on / the ticket requires deployment. */
export const TICKET_DEPLOYMENT_CLAUSE = 'وللتذاكر التي تتطلب نشرًا: تُضافان بعد تأكيد الحل في الاختبار الحي.'

const REVIEW_STAGES = ['PENDING_REVIEW', 'APPROVED_FOR_DEPLOY', 'PENDING_VERIFICATION']

/**
 * Why the deployment switch is frozen (the server's `can_edit_estimate` is false): the ticket is in review/deployment, or
 * the manager is the assignee of this very ticket (nobody may edit their own estimate). Never claims a stage that is not true.
 */
export function deploymentFreezeMessage(ticket: { status: string; assignee?: { id: number } | null; assigned_to_id?: number | null }, currentUserId?: number | null): string {
  if (REVIEW_STAGES.includes(ticket.status)) return DEPLOYMENT_FROZEN_MESSAGE
  const assignee = ticket.assignee?.id ?? ticket.assigned_to_id ?? null
  if (currentUserId != null && assignee != null && Number(assignee) === Number(currentUserId)) return ASSIGNEE_FROZEN_MESSAGE

  return DEPLOYMENT_FROZEN_MESSAGE
}

/** Once a deployment ticket has been submitted for review, its flag can no longer be switched off. */
export function isDeploymentFlagLocked(ticket: { requires_deployment?: boolean; deployment?: { round: number | null } | null }): boolean {
  return ticket.requires_deployment === true && (ticket.deployment?.round ?? 0) > 0
}

/** How a reviewer was tied to the ticket they reviewed (`activity_logs[].metadata.reviewer_relation`, `review_context.relation`). */
export const REVIEWER_RELATION_LABEL: Record<string, string> = {
  creator: 'المنشئ',
  assignee: 'المكلّف',
  submitter: 'مقدّم الإنجاز',
}

/** The same roles as a predicate of «أنت …»: «منشئ» / «مكلّف» / «مقدّم إنجاز». */
const RELATION_PREDICATE: Record<string, string> = {
  creator: 'منشئ',
  assignee: 'مكلّف',
  submitter: 'مقدّم إنجاز',
}

const joinAr = (parts: string[]): string => parts.join(' و')

/** Arabic names of the relations, in the order the server sent; an unknown relation is shown as it came. */
export function reviewerRelationLabels(relation: readonly string[] | null | undefined): string[] {
  return (relation ?? []).map((r) => REVIEWER_RELATION_LABEL[r] ?? r)
}

/** The log rows that record a review decision (the ones whose metadata names the reviewer's relation). */
export const REVIEW_DECISION_ACTIONS = ['APPROVED_COMPLETION', 'APPROVED_FOR_DEPLOY', 'RETURNED_FOR_REWORK']

/** «أنت منشئ ومكلّف ومقدّم إنجاز هذه التذكرة»: what the viewer is to the ticket, from `review_context.relation`. */
export function viewerRelationSentence(relation: readonly string[] | null | undefined): string {
  const parts = (relation ?? []).map((r) => RELATION_PREDICATE[r] ?? r)

  return parts.length === 0 ? '' : `أنت ${joinAr(parts)} هذه التذكرة`
}
