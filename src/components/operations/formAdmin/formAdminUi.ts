import type { FormResponsesVisibility, FormStatus, FormVisibility } from '@/types/operations'

/** Wording and small helpers shared by the form-management panels. */

export const VISIBILITY_AR: Record<FormVisibility, { label: string; hint: string }> = {
  private: {
    label: 'خاص',
    hint: 'يراه المالك والمتعاونون المضافون ومديرو المنصة فقط.',
  },
  organization: {
    label: 'للمؤسسة',
    hint: 'يراه من تسمح لهم صلاحياتهم ونطاقهم: كل من يصل إلى النماذج إن لم يكن له قسم، أو أعضاء القسم إن كان له قسم.',
  },
}

export const RESPONSES_VISIBILITY_AR: Record<FormResponsesVisibility, { label: string; hint: string }> = {
  restricted: {
    label: 'مقيّدة',
    hint: 'يقرؤها المالك ومن مُنح صلاحية الإجابات صراحةً ومديرو المنصة فقط. رؤية النموذج لا تكفي.',
  },
  form_viewers: {
    label: 'لكل من يرى النموذج',
    hint: 'كل من يستطيع فتح النموذج يستطيع قراءة إجاباته. استعملها فقط للنماذج غير الحساسة.',
  },
}

export const STATUS_BADGE: Record<FormStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  closed: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  archived: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
}

/** The roles that can be given access to forms, in the words the platform uses. */
export const FORM_ROLE_AR: Record<string, string> = {
  admin: 'مدير',
  super_admin: 'مدير عام',
  tech_admin: 'مدير تقني',
  operations_manager: 'مدير العمليات',
  community_manager: 'مدير المجتمع',
}

export const ORIGIN_AR: Record<string, string> = {
  publish: 'نشر',
  restore: 'نشر بعد استعادة',
  legacy: 'نسخة مُرحَّلة (قبل تفعيل الإصدارات)',
}

/** An ISO date-time as the value of a datetime-local input (the person's own clock), or ''. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** A datetime-local value as an ISO date-time carrying the offset, or null when empty. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** The one-line summary of an activity entry's details, in Arabic. */
export function summarizeActivity(action: string, details: Record<string, unknown>): string {
  const list = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).map(String).join('، ') : '')
  const parts: string[] = []

  switch (action) {
    case 'created':
      if (details.question_count !== undefined) parts.push(`${details.question_count} سؤال`)
      break
    case 'updated':
    case 'settings_changed':
    case 'visibility_changed':
      if (list(details.fields)) parts.push(list(details.fields))
      if (list(details.changes)) parts.push(list(details.changes))
      break
    case 'questions_changed':
      if (list(details.added)) parts.push(`أُضيف: ${list(details.added)}`)
      if (list(details.edited)) parts.push(`عُدّل: ${list(details.edited)}`)
      if (list(details.removed)) parts.push(`حُذف: ${list(details.removed)}`)
      break
    case 'published':
      parts.push(`الإصدار ${details.version}`)
      if (details.question_count !== undefined) parts.push(`${details.question_count} سؤال`)
      if (details.note) parts.push(`«${details.note}»`)
      break
    case 'reopened':
      if (details.version !== undefined) parts.push(`الإصدار ${details.version}`)
      break
    case 'version_restored':
      parts.push(`من الإصدار ${details.from_version}`)
      break
    case 'ownership_changed':
      parts.push(`من ${details.from ?? '—'} إلى ${details.to}`)
      break
    case 'collaborator_added':
    case 'collaborator_updated':
    case 'collaborator_removed':
      if (details.user) parts.push(String(details.user))
      if (details.access_level) parts.push(details.access_level === 'editor' ? 'محرّر' : 'مشاهد')
      break
    default:
      break
  }

  return parts.join(' · ')
}
