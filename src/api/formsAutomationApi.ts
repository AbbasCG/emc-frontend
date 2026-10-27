import apiClient from './axios'
import { unwrapData } from './unwrap'
import { OWN_ERRORS, bodyOf, firstMessage } from './formsApi'

/**
 * Smart Forms Phase 8 client: a form's notifications and automation. The server checks every value against the form (an e-mail
 * question of THIS form, a reviewer who may review it, a platform manager for answers leaving the platform); this module only maps.
 */

export type FormAutomationSettings = {
  notify_owner: boolean
  notify_department: boolean
  notify_assignee: boolean
  confirmation: { enabled: boolean; email_question_id: number | null }
  auto_assign_to: number | null
  reminder_days: number | null
  webhook: boolean
  webhook_include_answers: boolean
}

export type FormAutomationOptions = {
  email_questions: { id: number; label: string }[]
  assignable: { id: number; name: string }[]
  has_department: boolean
  can_include_answers: boolean
  webhook_endpoints: number
  max_reminder_days: number
}

export type FormAutomation = { settings: FormAutomationSettings; options: FormAutomationOptions }

export type FormAutomationPatch = Partial<Omit<FormAutomationSettings, 'confirmation'>> & { confirmation?: Partial<FormAutomationSettings['confirmation']> }

const url = (formId: number) => `/operations/forms/${formId}/automation`

export async function fetchFormAutomation(formId: number): Promise<FormAutomation> {
  const res = await apiClient.get<unknown>(url(formId), OWN_ERRORS)
  return unwrapData<FormAutomation>(res.data)
}

export async function updateFormAutomation(formId: number, patch: FormAutomationPatch): Promise<FormAutomation> {
  const res = await apiClient.put<unknown>(url(formId), patch, OWN_ERRORS)
  return unwrapData<FormAutomation>(res.data)
}

/** The first message of a refusal, or one sentence for a failure. */
export function parseAutomationError(error: unknown): string {
  const { status, body } = bodyOf(error)
  if (status === 422) {
    const first = Object.values(body.errors ?? {}).map(firstMessage).find(Boolean)
    return first ?? 'لم تُحفظ الإعدادات. راجع القيم وأعد المحاولة.'
  }
  if (status === 403) return 'لا تملك صلاحية تعديل إعدادات هذا النموذج.'
  if (status === 429) return 'محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.'
  if (status === null) return 'تعذّر الاتصال بالخادم. لم يُحفظ شيء.'
  return 'حدث خطأ في الخادم. لم يُحفظ شيء.'
}

export type FormRetention = { retention_days: number | null; can_change: boolean; expired_now: number; min_days: number; max_days: number }

const retentionUrl = (formId: number) => `/operations/forms/${formId}/retention`

export async function fetchFormRetention(formId: number): Promise<FormRetention> {
  const res = await apiClient.get<unknown>(retentionUrl(formId), OWN_ERRORS)
  return unwrapData<FormRetention>(res.data)
}

/** Null keeps responses until someone deletes them. A shorter period deletes older responses at the next nightly purge. */
export async function updateFormRetention(formId: number, retentionDays: number | null): Promise<FormRetention> {
  const res = await apiClient.put<unknown>(retentionUrl(formId), { retention_days: retentionDays }, OWN_ERRORS)
  return unwrapData<FormRetention>(res.data)
}
