import type { EffectivePageAccessRow } from '@/api/accessControlApi'
import type { SidebarNavGroup, SidebarNavItem } from '@/layouts/dashboardSidebar'
import { findPageForPath, isPathAllowed } from '@/utils/pageAccessMatch'
import { CATEGORY_ICON, FALLBACK_ICON, HIDDEN_FROM_SIDEBAR, PERMISSION_GATED_PAGES, STRUCTURAL_SIDEBAR_PATHS } from '@/utils/sidebarNavigationMeta'

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

/* ───────────────────────────────────────────────────────────────────────────
 * ONE SOURCE OF TRUTH FOR THE MENU
 *
 * The functions above only ever REMOVE entries from a static, per-role menu. That left a
 * gap: a page granted outside the role's usual set (a baseline page, a department
 * default, a user override) opened by URL but could never appear in the menu, because
 * the static list for that role simply did not contain it.
 *
 * resolveSidebarNavigation() closes it from both directions using the SAME manifest the
 * route guard reads:
 *   - removes what the backend denies,
 *   - drops links the manifest knows nothing about unless they are declared structural,
 *   - ADDS every page the backend allows that the static menu does not already list.
 *
 * No role name appears anywhere in it.
 * ───────────────────────────────────────────────────────────────────────── */

export type SidebarAccessStatus = 'idle' | 'loading' | 'ready' | 'error'

export type ResolvedSidebar = {
  /** `loading`: no decision yet, show nothing rather than a menu that may be wrong. `error`: fail closed. */
  state: 'loading' | 'error' | 'ready'
  groups: SidebarNavGroup[]
}

/** The links that need no manifest decision. */
function keepStructuralOnly(groups: readonly SidebarNavGroup[]): SidebarNavGroup[] {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => STRUCTURAL_SIDEBAR_PATHS.has(i.href)) }))
    .filter((g) => g.items.length > 0)
}

/**
 * Strict filter: allowed keeps, denied removes, and an unmapped link survives only if it is
 * declared structural. (The lenient filterSidebarItemsByAccess above keeps unmapped links.)
 */
function strictFilter(
  groups: readonly SidebarNavGroup[],
  pages: readonly EffectivePageAccessRow[],
  permissions: ReadonlySet<string>,
): SidebarNavGroup[] {
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        const decision = isPathAllowed(pages, item.href)
        if (decision === null) return STRUCTURAL_SIDEBAR_PATHS.has(item.href)
        if (!decision) return false

        const owner = findPageForPath(pages, item.href)
        const needed = owner ? PERMISSION_GATED_PAGES[owner.key] : undefined
        return needed === undefined || permissions.has(needed)
      }),
    }))
    .filter((g) => g.items.length > 0)
}

/** Allowed pages the menu does not list yet, in the manifest's own (catalog) order. */
export function findUnlistedAccessiblePages(
  groups: readonly SidebarNavGroup[],
  pages: readonly EffectivePageAccessRow[],
  permissions: ReadonlySet<string> = new Set(),
): EffectivePageAccessRow[] {
  const listed = new Set<string>()
  for (const g of groups) {
    for (const item of g.items) {
      const owner = findPageForPath(pages, item.href)
      if (owner) listed.add(owner.key)
    }
  }

  return pages.filter(
    (p) =>
      p.allowed &&
      !listed.has(p.key) &&
      !(p.key in HIDDEN_FROM_SIDEBAR) &&
      (PERMISSION_GATED_PAGES[p.key] === undefined || permissions.has(PERMISSION_GATED_PAGES[p.key])) &&
      p.primaryRoute !== '' &&
      !p.primaryRoute.includes(':') &&
      // Root authority reaches every page; that is not a reason to list all of them. Only a
      // real grant (role, department, user allow, baseline) puts a page in someone's menu.
      p.sources.some((s) => s !== 'root_authority'),
  )
}

function appendUnlisted(groups: SidebarNavGroup[], extra: readonly EffectivePageAccessRow[]): SidebarNavGroup[] {
  if (extra.length === 0) return groups

  const result = groups.map((g) => ({ ...g, items: [...g.items] }))
  const added = new Map<string, SidebarNavGroup>()

  for (const page of extra) {
    const title = page.categoryLabelAr || 'صفحات أخرى'
    const item: SidebarNavItem = {
      label: page.labelAr || page.key,
      href: page.primaryRoute,
      icon: CATEGORY_ICON[page.category] ?? FALLBACK_ICON,
    }

    const existing = result.find((g) => g.title === title) ?? added.get(title)
    if (existing) {
      existing.items.push(item)
      continue
    }

    const created: SidebarNavGroup = { title, collapsible: true, defaultOpen: true, items: [item] }
    added.set(title, created)
  }

  // New headings go above the trailing account group, which is meant to stay last.
  const last = result[result.length - 1]
  const tail = last?.title === 'الحساب' ? result.pop() : undefined
  result.push(...added.values())
  if (tail) result.push(tail)

  return result
}

export function resolveSidebarNavigation(input: {
  groups: readonly SidebarNavGroup[]
  pages: readonly EffectivePageAccessRow[]
  status: SidebarAccessStatus
  /** The viewer's business permissions; consulted only for pages in PERMISSION_GATED_PAGES. */
  permissions?: readonly string[]
}): ResolvedSidebar {
  const { groups, pages, status } = input
  const permissions = new Set(input.permissions ?? [])

  if (status === 'idle' || status === 'loading') return { state: 'loading', groups: [] }
  if (status === 'error') return { state: 'error', groups: keepStructuralOnly(groups) }

  const visible = strictFilter(groups, pages, permissions)
  const withGranted = appendUnlisted(visible, findUnlistedAccessiblePages(visible, pages, permissions))

  return { state: 'ready', groups: withGranted.filter((g) => g.items.length > 0) }
}
