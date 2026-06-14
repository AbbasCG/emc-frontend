import type { Course } from '@/types'
import {
  decodeUnicodeList,
  decodeUnicodeString,
  decodeUnicodeUnknown,
  sanitizeCourseForDisplay,
} from '@/utils/decodeUnicodeText'

export { sanitizeCourseForDisplay }

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
  const decoded = decodeUnicodeUnknown(keywords)
  if (Array.isArray(decoded)) {
    return decodeUnicodeList(decoded.map((k) => String(k).trim()).filter(Boolean))
  }
  if (typeof decoded === 'string') {
    const t = decoded.trim()
    if (!t) return []
    const parsed = tryParseJsonArray(t)
    if (parsed) {
      return decodeUnicodeList(parsed.map((k) => String(k).trim()).filter(Boolean))
    }
    return decodeUnicodeList(
      t
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    )
  }
  return []
}

/** Learning bullets, curriculum lines, keywords-style lists — array, comma/semicolon string, or JSON array string */
export function normalizeBulletedCourseField(raw: unknown): string[] {
  const decoded = decodeUnicodeUnknown(raw)
  if (decoded == null) return []
  if (Array.isArray(decoded)) {
    const out: string[] = []
    for (const item of decoded) {
      if (item == null) continue
      if (typeof item === 'string') {
        const t = decodeUnicodeString(item).trim()
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
        const t = decodeUnicodeString((item as { title?: unknown }).title ?? '').trim()
        if (t) out.push(t)
      } else {
        const t = decodeUnicodeString(item).trim()
        if (t) out.push(t)
      }
    }
    return out.filter(Boolean)
  }
  if (typeof decoded === 'string') {
    const t = decoded.trim()
    if (!t) return []
    const parsed = tryParseJsonArray(t)
    if (parsed) return normalizeBulletedCourseField(parsed)
    return decodeUnicodeList(
      t
        .split(/[,،;|\n\r]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    )
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
  const decoded = decodeUnicodeUnknown(raw)
  if (decoded == null) return null
  if (Array.isArray(decoded)) {
    const lines = decoded.map((x) => decodeUnicodeString(x).trim()).filter(Boolean)
    return lines.length ? lines.join('\n') : null
  }
  if (typeof decoded === 'string') {
    const t = decoded.trim()
    if (!t) return null
    const parsed = tryParseJsonArray(t)
    if (parsed) {
      const lines = parsed.map((x) => decodeUnicodeString(x).trim()).filter(Boolean)
      return lines.length ? lines.join('\n') : null
    }
    return decodeUnicodeString(t)
  }
  const s = decodeUnicodeString(decoded).trim()
  return s || null
}

export function safeTrimUnknown(val: unknown, fallback = ''): string {
  if (val == null) return fallback
  if (typeof val === 'string') return decodeUnicodeString(val).trim()
  if (Array.isArray(val)) return decodeUnicodeList(val.map((x) => String(x))).join(' ').trim()
  return decodeUnicodeString(val).trim()
}
