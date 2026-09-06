/** Percent-encoded backslash, either case — the encoded form of the `/\host` bypass. */
const ENCODED_BACKSLASH = /%5c/i

/**
 * C0 controls + DEL. Browsers strip tab/LF/CR while parsing a URL, so a path such as
 * `/<tab>/evil.example` collapses to the protocol-relative `//evil.example`.
 */
function hasControlChar(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

/** Safe internal path for post-auth redirect (course detail, etc.). */
export function safeEnrollmentRedirect(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  // A backslash is never part of a legitimate internal path, and browsers normalise it
  // to `/` — so `/\host`, `/\/host` and `/\\host` all resolve to the protocol-relative
  // URL `//host`, i.e. an off-site jump.
  if (raw.includes('\\') || ENCODED_BACKSLASH.test(raw)) return null
  if (hasControlChar(raw)) return null
  return raw
}

/** @deprecated Use buildPublicLoginHref from publicEnrollAuth */
export function buildCourseEnrollSignupHref(courseSlug: string): string {
  const redirect = encodeURIComponent(`/courses/${courseSlug}`)
  return `/login?redirect=${redirect}`
}

export function enrollActionLabel(itemType: 'course' | 'workshop' | 'program'): string {
  if (itemType === 'workshop') return 'التسجيل في الورشة'
  return 'الالتحاق بالدورة'
}
