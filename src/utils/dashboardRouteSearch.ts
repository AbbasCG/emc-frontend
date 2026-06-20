import type { SidebarNavGroup } from '@/layouts/dashboardSidebar'
import { normalizeRole } from '@/utils/dashboardAccess'

export type DashboardSearchEntry = {
  href: string
  label: string
  section: string
}

/** Flatten sidebar groups into searchable route entries (title + section). */
export function flattenSidebarForSearch(groups: SidebarNavGroup[]): DashboardSearchEntry[] {
  const out: DashboardSearchEntry[] = []
  for (const group of groups) {
    const section = group.title?.trim() || 'القائمة الرئيسية'
    for (const item of group.items) {
      out.push({ href: item.href, label: item.label, section })
    }
  }
  return out
}

export function filterDashboardSearchEntries(
  entries: DashboardSearchEntry[],
  query: string,
  limit = 40,
): DashboardSearchEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries.slice(0, limit)
  return entries
    .filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.section.toLowerCase().includes(q) ||
        e.href.toLowerCase().includes(q),
    )
    .slice(0, limit)
}

export function filterSidebarGroups(
  groups: SidebarNavGroup[],
  query: string,
): SidebarNavGroup[] {
  const q = query.trim().toLowerCase()
  if (!q) return groups
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          (g.title ?? '').toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q),
      ),
    }))
    .filter((g) => g.items.length > 0)
}

export function isAdminSidebarSearchRole(roleRaw?: string | null): boolean {
  const n = normalizeRole(roleRaw ?? null)
  return n === 'admin' || n === 'super_admin' || n === 'tech_admin'
}
