import type { EffectivePageAccessRow } from '@/api/accessControlApi'

/**
 * URL → CAPABILITY matching for the effective page-access manifest.
 *
 * PAGE ACCESS != BUSINESS AUTHORIZATION. Everything here answers only "may this
 * URL be opened". It never decides whether an action inside the page is
 * permitted — the backend owns that, independently, on every request.
 *
 * This module holds NO access rules of its own. It matches a pathname onto a
 * capability the BACKEND already decided, using the route patterns the backend
 * shipped in the manifest. There is deliberately no role list, no department
 * logic and no precedence here: re-deriving any of that in the browser is
 * exactly what the cutover exists to remove.
 */

/** Trailing slashes and query/hash are not part of a route's identity. */
export function normalizePathname(pathname: string): string {
  const withoutQuery = pathname.split('?')[0].split('#')[0]
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.replace(/\/+$/, '')
  }
  return withoutQuery
}

/**
 * Does `pathname` fall under `pattern`?
 *
 * A capability owns its own URL and everything nested beneath it, so
 * `/dashboard/admin/users` covers `/dashboard/admin/users/42/edit`. The
 * boundary is checked on a path SEGMENT so `/dashboard/admin/users-archive`
 * is not swallowed by `/dashboard/admin/users`.
 */
export function pathMatchesPattern(pathname: string, pattern: string): boolean {
  const path = normalizePathname(pathname)
  const p = normalizePathname(pattern)
  if (!p) return false
  return path === p || path.startsWith(`${p}/`)
}

/**
 * The capability that owns this pathname, or null when no catalog entry does.
 *
 * LONGEST PATTERN WINS. Capabilities legitimately nest — a specific child page
 * and the broader section above it can both match — and the more specific one
 * is the one whose decision applies. Sorting by length makes that deterministic
 * rather than dependent on catalog order.
 */
export function findPageForPath(
  pages: readonly EffectivePageAccessRow[],
  pathname: string,
): EffectivePageAccessRow | null {
  let best: EffectivePageAccessRow | null = null
  let bestLength = -1

  for (const page of pages) {
    for (const pattern of page.routePatterns) {
      if (!pathMatchesPattern(pathname, pattern)) continue
      const length = normalizePathname(pattern).length
      if (length > bestLength) {
        best = page
        bestLength = length
      }
    }
  }

  return best
}

/**
 * May this pathname be opened, according to the backend?
 *
 * An UNMAPPED path returns `null` — "the manifest has no opinion" — which is
 * deliberately distinct from `false`. The caller decides what to do with a path
 * no capability owns; treating it as a denial would break every dashboard URL
 * that is not itself a catalog capability (redirect targets, nested detail
 * routes registered outside the catalog, and so on).
 */
export function isPathAllowed(
  pages: readonly EffectivePageAccessRow[],
  pathname: string,
): boolean | null {
  const page = findPageForPath(pages, pathname)
  return page ? page.allowed : null
}
