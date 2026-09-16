import type { EffectivePageAccessRow } from '@/api/accessControlApi'
import type { SidebarNavGroup, SidebarNavItem } from '@/layouts/dashboardSidebar'
import { isPathAllowed } from '@/utils/pageAccessMatch'

/**
 * SIDEBAR VISIBILITY, derived from backend effective page access.
 *
 * The sidebar module stays what it has always been: a navigation CATALOG of
 * labels, icons, grouping and hrefs. It is presentation configuration, not
 * authority. This filter is the authority boundary — it removes the entries the
 * backend says the user may not open, and it holds no access rules of its own.
 *
 * HIDING IS NOT SECURITY. A hidden link protects nothing; the endpoint behind
 * it enforces its own authorization on every request regardless. This exists so
 * the navigation tells the truth, not to make anything safe.
 *
 * THREE-STATE DECISION, deliberately:
 *   allowed === true   keep
 *   allowed === false  remove — the backend explicitly denies this capability
 *   no mapping (null)  keep — the manifest has no opinion about this path
 *
 * That last case matters. Not every dashboard URL is a catalog capability;
 * redirect targets, nested detail routes and utility pages legitimately have no
 * entry. Treating "unmapped" as a denial would silently empty large parts of
 * the navigation the first time the catalog drifted behind the router.
 */

/** Drop items the backend explicitly denies; keep unmapped ones. */
export function filterSidebarItemsByAccess(
  items: readonly SidebarNavItem[],
  pages: readonly EffectivePageAccessRow[],
): SidebarNavItem[] {
  return items.filter((item) => isPathAllowed(pages, item.href) !== false)
}

/**
 * Filter whole groups, dropping any group left with no items.
 *
 * An empty group would otherwise render as a heading with nothing under it,
 * which reads as a bug rather than as an absence.
 */
export function filterSidebarGroupsByAccess(
  groups: readonly SidebarNavGroup[],
  pages: readonly EffectivePageAccessRow[],
): SidebarNavGroup[] {
  if (pages.length === 0) {
    // No manifest yet: return the groups untouched rather than blanking the
    // navigation. The route guard — not the sidebar — is what actually holds
    // rendering until a decision exists, and the backend refuses regardless.
    return [...groups]
  }

  return groups
    .map((group) => ({ ...group, items: filterSidebarItemsByAccess(group.items, pages) }))
    .filter((group) => group.items.length > 0)
}
