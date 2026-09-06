/** Decode Laravel/JSON escaped Arabic strings like `\u0625\u062a...` for display. */
export function decodeUnicodeText(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (!value.includes('\\u')) return value

  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string
  } catch {
    return value
  }
}

export function decodeUnicodeString(value: unknown): string {
  const decoded = decodeUnicodeText(value)
  return typeof decoded === 'string' ? decoded : String(decoded ?? '')
}

function tryParseJsonValue(s: string): unknown | null {
  const t = s.trim()
  if (!t) return null
  if (
    !(t.startsWith('[') && t.endsWith(']')) &&
    !(t.startsWith('{') && t.endsWith('}')) &&
    !(t.startsWith('"') && t.endsWith('"'))
  ) {
    return null
  }
  try {
    return JSON.parse(t) as unknown
  } catch {
    return null
  }
}

/** Recursively decode strings inside arrays, objects, and JSON-encoded string payloads. */
export function decodeUnicodeUnknown(raw: unknown): unknown {
  if (raw == null) return raw

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return raw

    const parsed = tryParseJsonValue(trimmed)
    if (parsed != null) {
      return decodeUnicodeUnknown(parsed)
    }

    return decodeUnicodeText(trimmed)
  }

  if (Array.isArray(raw)) {
    return raw.map((item) => decodeUnicodeUnknown(item))
  }

  if (typeof raw === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      out[key] = decodeUnicodeUnknown(value)
    }
    return out
  }

  return raw
}

export function decodeUnicodeList(items: string[]): string[] {
  return items.map((item) => decodeUnicodeString(item))
}

/** Prepare a course API record for public display (decode escaped Unicode in all text fields). */
export function sanitizeCourseForDisplay<T>(course: T): T {
  return decodeUnicodeUnknown(course) as T
}
