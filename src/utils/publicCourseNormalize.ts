import type { Course } from '@/types'

/**
 * Normalizers for public course payloads where Laravel/API may return strings, arrays, or JSON strings.
 */

/** Unwrap `{ data: { data: course } }` style envelopes until a slug is found */
export function unwrapPublicCoursePayload(payload: unknown): Course | null {
  let cur: unknown = payload
  for (let depth = 0; depth < 6; depth++) {
    if (!cur || typeof cur !== 'object') return null
    const c = cur as Partial<Course> & Record<string, unknown>
    if (typeof c.slug === 'string' && c.slug.length > 0) {
      return c as Course
    }
    const next = (cur as { data?: unknown }).data
    if (next === undefined || next === cur) break
    cur = next
  }
  return null
}

function tryParseJsonArray(s: string): unknown[] | null {
  const t = s.trim()
  if (!t.startsWith('[')) return null
  try {
    const v = JSON.parse(t) as unknown
    return Array.isArray(v) ? v : null
  } catch {
    return null
  }
}

export function normalizeKeywords(keywords: unknown): string[] {
  if (Array.isArray(keywords)) {
    return keywords.map((k) => String(k).trim()).filter(Boolean)
  }
  if (typeof keywords === 'string') {
    const t = keywords.trim()
    if (!t) return []
    const parsed = tryParseJsonArray(t)
    if (parsed) {
      return parsed.map((k) => String(k).trim()).filter(Boolean)
    }
    return t
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

/** Learning bullets, curriculum lines, keywords-style lists — array, comma/semicolon string, or JSON array string */
export function normalizeBulletedCourseField(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    const out: string[] = []
    for (const item of raw) {
      if (item == null) continue
      if (typeof item === 'string') {
        const t = item.trim()
        if (!t) continue
        const nested = tryParseJsonArray(t)
        if (nested) {
          out.push(...normalizeBulletedCourseField(nested))
        } else {
          out.push(t)
        }
        continue
      }
      if (typeof item === 'object' && item && 'title' in item) {
        const t = String((item as { title?: unknown }).title ?? '').trim()
        if (t) out.push(t)
      } else {
        const t = String(item).trim()
        if (t) out.push(t)
      }
    }
    return out.filter(Boolean)
  }
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return []
    const parsed = tryParseJsonArray(t)
    if (parsed) return normalizeBulletedCourseField(parsed)
    return t
      .split(/[,،;|\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

export function hasParsableCourseDate(raw: unknown): boolean {
  if (raw == null) return false
  const s = String(raw).trim()
  if (!s || s === '—') return false
  return Number.isFinite(Date.parse(s))
}

/** Paragraph-style fields (المتطلبات، المخرجات): preserve single string prose; unwrap JSON arrays only */
export function coerceCourseBlockText(raw: unknown): string | null {
  if (raw == null) return null
  if (Array.isArray(raw)) {
    const lines = raw.map((x) => String(x).trim()).filter(Boolean)
    return lines.length ? lines.join('\n') : null
  }
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return null
    const parsed = tryParseJsonArray(t)
    if (parsed) {
      const lines = parsed.map((x) => String(x).trim()).filter(Boolean)
      return lines.length ? lines.join('\n') : null
    }
    return t
  }
  const s = String(raw).trim()
  return s || null
}

export function safeTrimUnknown(val: unknown, fallback = ''): string {
  if (val == null) return fallback
  if (typeof val === 'string') return val.trim()
  if (Array.isArray(val)) return val.map((x) => String(x)).join(' ').trim()
  return String(val).trim()
}
