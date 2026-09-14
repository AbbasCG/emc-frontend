import type { EligiblePageEntry } from '@/api/accessControlApi'
import type { PageAccessCatalog } from '@/api/pageAccessCatalogApi'
import type { PageAccessSelectorRow } from '@/components/access-control/PageAccessSelector'

/**
 * Build selector rows from BACKEND METADATA ONLY.
 *
 * The full catalog is used as the row list so protected capabilities stay
 * VISIBLE BUT LOCKED (a silently missing row would leave an administrator
 * wondering whether a page exists at all). A row is locked purely because the
 * backend left it out of the `eligible` / `grantable` set it returned for this
 * context — the frontend never decides "finance pages are forbidden" or any
 * other hardcoded rule, and never re-derives eligibility.
 *
 * PAGE ACCESS != BUSINESS AUTHORIZATION — these rows describe page exposure only.
 */
export function buildSelectorRows(
  catalog: PageAccessCatalog | null,
  eligible: EligiblePageEntry[],
  lockedReasonAr: string,
): PageAccessSelectorRow[] {
  const eligibleKeys = new Set(eligible.map((e) => e.key))

  // Preferred path: render every catalog capability, locking the ineligible ones.
  if (catalog && catalog.pages.length > 0) {
    return catalog.pages.map((p) => {
      const locked = !eligibleKeys.has(p.key)
      return {
        key: p.key,
        labelAr: p.labelAr,
        category: p.category,
        categoryLabelAr: p.categoryLabelAr,
        riskLevel: p.riskLevel,
        primaryRoute: p.primaryRoute,
        routePatterns: p.routePatterns,
        locked,
        lockedReasonAr: locked ? lockedReasonAr : undefined,
      }
    })
  }

  // Fallback: the catalog call is unavailable to this viewer or failed. The
  // endpoint's own eligible set is still authoritative and fully usable — the
  // UI simply cannot show the locked rows alongside it.
  return eligible.map((e) => ({
    key: e.key,
    labelAr: e.labelAr,
    category: e.category,
    categoryLabelAr: e.categoryLabelAr,
    riskLevel: e.riskLevel,
    locked: false,
  }))
}

/** Stable comparison for dirty tracking of an unordered key set. */
export function sameKeySet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((k) => set.has(k))
}

/** Stable comparison for the user override state map. */
export function sameStateMap(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every((k) => a[k] === b[k])
}
