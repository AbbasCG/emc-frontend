import type { NavigateFunction } from 'react-router'
import { safeEnrollmentRedirect } from '@/utils/enrollmentRedirect'
import { hasEnrollIntentHost, setEnrollIntent, type EnrollIntent } from '@/lib/enrollIntent'

// Re-exported so enroll call sites build their intent from the same module they gate with.
export type { EnrollIntent } from '@/lib/enrollIntent'

/**
 * Who may enroll: every signed-in account, whatever its organizational role. Learning is not a role, so nothing here looks at
 * one. The only refusals come from the server, which knows the facts a browser cannot (the account teaches this program, it is
 * already enrolled, registration is closed) and answers with an Arabic message the enroll surfaces show as they are.
 */
export type PublicEnrollGate = 'guest' | 'learner'

export function buildPublicLoginHref(redirectPath: string): string {
  const safe = safeEnrollmentRedirect(redirectPath) ?? '/dashboard'
  return `/login?redirect=${encodeURIComponent(safe)}`
}

export function buildCourseDetailEnrollHref(slug: string): string {
  return `/courses/${slug}#enroll`
}

export function buildWorkshopDetailEnrollHref(slug: string): string {
  return `/workshops/${slug}#enroll`
}

export function resolvePublicEnrollGate(isAuthenticated: boolean): PublicEnrollGate {
  return isAuthenticated ? 'learner' : 'guest'
}

/**
 * Returns true when the enroll action may proceed (the visitor is signed in).
 *
 * Minimal-friction path: when the caller provides an `intent` and the
 * QuickJoinModal host is mounted (public Layout), guests join + enroll in
 * place — the `/login?redirect=…` round-trip survives ONLY as the fallback
 * for surfaces without the modal host. The `redirect` query param is the
 * single unified return-param name for that fallback.
 */
export function gatePublicEnrollClick(options: {
  isAuthenticated: boolean
  redirectPath: string
  navigate: NavigateFunction
  /** In-context join+enroll payload — opens the QuickJoinModal instead of navigating away. */
  intent?: EnrollIntent
  /** Runs for a signed-in visitor, of any role. */
  onLearner?: () => void
}): boolean {
  const gate = resolvePublicEnrollGate(options.isAuthenticated)
  if (gate === 'guest') {
    if (options.intent && hasEnrollIntentHost()) {
      setEnrollIntent(options.intent)
      return false
    }
    options.navigate(buildPublicLoginHref(options.redirectPath))
    return false
  }
  options.onLearner?.()
  return true
}
