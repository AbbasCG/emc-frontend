/**
 * Links that come from user input (an applicant's LinkedIn / portfolio) are only ever opened when they are real
 * http(s) addresses: `javascript:`, `data:` and the like are never turned into an href.
 */

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i
// A host with at least one dot, an optional :port and an optional path. Checked BEFORE the scheme test, because
// `example.com:8080/x` looks like a scheme («example.com:») but is a host; `javascript:`/`data:`/`mailto:` have no dot.
const BARE_HOST = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d{1,5})?(?:[/?#]\S*)?$/i

/** The address as typed (with `https://` added when it had no scheme) when it is a valid http(s) URL, or null when it is not one. A bare `linkedin.com/in/x` gets `https://`. */
export function toHttpUrl(raw: string | null | undefined): string | null {
  const text = (raw ?? '').trim()
  if (!text || /\s/.test(text)) return null

  const candidate = BARE_HOST.test(text) ? `https://${text}` : HAS_SCHEME.test(text) ? text : null
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null

    return candidate
  } catch {
    return null
  }
}
