/** Shared helpers for course/program create & update payloads (matches Laravel admin API). */

export type CourseLifecycleStatus = 'draft' | 'published' | 'archived'

export function linesToStringArray(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Keywords: comma, semicolon, or newline separated */
export function splitKeywords(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Map UI / legacy / localized values → API enums only (`draft` | `published` | `archived`). Never send Arabic labels. */
export function normalizeCourseStatus(raw: string): CourseLifecycleStatus {
  const t = String(raw ?? '').trim()
  const s = t.toLowerCase()

  // English variants
  if (s === 'published' || s === 'active' || s === 'live') return 'published'
  if (s === 'archived' || s === 'inactive') return 'archived'
  if (s === 'draft' || s === 'pending') return 'draft'

  // Arabic labels from legacy servers or pasted data (never forwarded as-is)
  if (t.includes('منشور')) return 'published'
  if (t.includes('مؤرشف')) return 'archived'
  if (t.includes('مسود')) return 'draft'

  return 'draft'
}

/** Maps wizard kind → Laravel courses.program_type */
export function kindToProgramType(kind: string): 'course' | 'workshop' | 'one_session' | 'full_program' {
  const m: Record<string, 'course' | 'workshop' | 'one_session' | 'full_program'> = {
    course: 'course',
    workshop: 'workshop',
    program: 'full_program',
    track: 'full_program',
  }
  return m[kind] ?? 'course'
}

/**
 * Join API array fields into textarea text for the wizard.
 */
export function apiListToText(val: unknown): string {
  if (Array.isArray(val)) return val.map((x) => String(x)).join('\n')
  if (val == null) return ''
  return String(val)
}
