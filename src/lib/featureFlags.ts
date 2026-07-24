/**
 * Hide-before-delete switchboard (M2b).
 *
 * Legacy UI entry points are hidden behind these flags before their code is
 * ever deleted. Flipping a value to `false` restores the links instantly —
 * no route changes, no rebuild of navigation structures.
 *
 * Deletion of the underlying pages is gated to a later phase; see the orphan
 * list in docs/01-assessment/route-map.md (§6).
 */
export const LEGACY_HIDDEN = {
  /**
   * Admin sidebar links that point at `AdminComingSoonPage` placeholder
   * routes (/dashboard/registrations, /dashboard/users). Routes stay
   * reachable by URL while hidden from navigation.
   */
  comingSoonAdminLinks: true,
} as const

export type LegacyHiddenKey = keyof typeof LEGACY_HIDDEN

/** Returns true when the given legacy surface should stay hidden from navigation. */
export function isHidden(key: LegacyHiddenKey): boolean {
  return LEGACY_HIDDEN[key]
}
