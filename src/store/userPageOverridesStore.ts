/**
 * User Page Access Overrides Store
 *
 * Stores per-user page access overrides in localStorage.
 * Each override can:
 *  - ALLOW a page that the user's role doesn't normally grant
 *  - DENY  a page that the user's role normally grants
 */

const STORAGE_KEY = 'emc_user_page_overrides'

export type PageOverrideEntry = {
  /** Page id from sitePagesCatalog */
  pageId: string
  /** 'allow' = granted beyond role, 'deny' = blocked despite role */
  mode: 'allow' | 'deny'
}

export type UserPageOverrides = {
  userId: number
  roleSlug: string
  overrides: PageOverrideEntry[]
  updatedAt: string
}

type OverridesMap = Record<number, UserPageOverrides>

function readAll(): OverridesMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as OverridesMap
  } catch {
    return {}
  }
}

function writeAll(map: OverridesMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // silently ignore quota errors
  }
}

/** Get overrides for a specific user */
export function getUserPageOverrides(userId: number): UserPageOverrides | null {
  const all = readAll()
  return all[userId] ?? null
}

/** Save/update overrides for a user */
export function saveUserPageOverrides(
  userId: number,
  roleSlug: string,
  overrides: PageOverrideEntry[],
): void {
  const all = readAll()
  all[userId] = {
    userId,
    roleSlug,
    overrides,
    updatedAt: new Date().toISOString(),
  }
  writeAll(all)
}

/** Get the effective access mode for a specific page for a user.
 *  Returns 'allow' | 'deny' | 'default'
 */
export function getEffectivePageAccess(
  userId: number,
  pageId: string,
): 'allow' | 'deny' | 'default' {
  const entry = getUserPageOverrides(userId)
  if (!entry) return 'default'
  const override = entry.overrides.find((o) => o.pageId === pageId)
  return override?.mode ?? 'default'
}

/** Build a flat allowed/denied sets for UI rendering */
export function buildOverrideSets(overrides: PageOverrideEntry[]): {
  allowSet: Set<string>
  denySet: Set<string>
} {
  const allowSet = new Set<string>()
  const denySet = new Set<string>()
  for (const o of overrides) {
    if (o.mode === 'allow') allowSet.add(o.pageId)
    else denySet.add(o.pageId)
  }
  return { allowSet, denySet }
}

/** Clear all overrides for a user */
export function clearUserPageOverrides(userId: number): void {
  const all = readAll()
  delete all[userId]
  writeAll(all)
}
