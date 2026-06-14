/** Shared helpers for course/program create & update payloads (matches Laravel admin API). */

export type CourseLifecycleStatus = 'draft' | 'published' | 'archived'

export type CourseBulletFieldKey =
  | 'features'
  | 'learning_outcomes'
  | 'requirements'
  | 'curriculum_topics'

export const COURSE_BULLET_MAX_CHARS: Record<CourseBulletFieldKey, number> = {
  features: 255,
  learning_outcomes: 500,
  requirements: 500,
  curriculum_topics: 500,
}

export const COURSE_BULLET_MAX_MESSAGE: Record<CourseBulletFieldKey, string> = {
  features: 'كل نقطة يجب ألا تتجاوز 255 حرفاً',
  learning_outcomes: 'كل مخرج تعليمي يجب ألا يتجاوز 500 حرف',
  requirements: 'كل متطلب يجب ألا يتجاوز 500 حرف',
  curriculum_topics: 'كل محور يجب ألا يتجاوز 500 حرف',
}

const BULLET_PREFIX_RE = /^[\s•·\-*●○▪▸►]+/

/** Split textarea content into short bullet items (newlines, Arabic/English commas, bullet prefixes). */
export function splitBulletListText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const lines = normalized.split(/\n+/)
  const out: string[] = []

  for (const line of lines) {
    const cleaned = line.replace(BULLET_PREFIX_RE, '').trim()
    if (!cleaned) continue

    const segments = cleaned.split(/[،,;]\s*/)
    for (const segment of segments) {
      const item = segment.trim()
      if (item) out.push(item)
    }
  }

  return out
}

/** Normalize textarea text to one bullet per line after auto-splitting. */
export function normalizeBulletListText(text: string): string {
  return splitBulletListText(text).join('\n')
}

export function parseBulletField(text: string): string[] {
  return splitBulletListText(text)
}

export type BulletListStats = {
  count: number
  maxItemLength: number
  invalid: boolean
  message: string | null
}

export function getBulletListStats(text: string, field: CourseBulletFieldKey): BulletListStats {
  const items = parseBulletField(text)
  const maxLen = COURSE_BULLET_MAX_CHARS[field]
  const maxItemLength = items.reduce((m, item) => Math.max(m, item.length), 0)
  const invalid = items.some((item) => item.length > maxLen)

  return {
    count: items.length,
    maxItemLength,
    invalid,
    message: invalid ? COURSE_BULLET_MAX_MESSAGE[field] : null,
  }
}

export function validateBulletField(
  text: string,
  field: CourseBulletFieldKey,
): { valid: boolean; message?: string; items: string[] } {
  const items = parseBulletField(text)
  const maxLen = COURSE_BULLET_MAX_CHARS[field]
  const tooLong = items.find((item) => item.length > maxLen)
  if (tooLong) {
    return { valid: false, message: COURSE_BULLET_MAX_MESSAGE[field], items }
  }
  return { valid: true, items }
}

/** Load API array / legacy string into normalized one-item-per-line textarea text. */
export function loadBulletFieldFromApi(value: unknown): string {
  const lines: string[] = []
  if (Array.isArray(value)) {
    for (const item of value) {
      lines.push(...splitBulletListText(String(item ?? '')))
    }
  } else if (value != null && String(value).trim() !== '') {
    lines.push(...splitBulletListText(String(value)))
  }
  return lines.join('\n')
}

export function linesToStringArray(text: string): string[] {
  return splitBulletListText(text)
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
