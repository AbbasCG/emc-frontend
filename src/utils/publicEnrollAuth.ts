import type { NavigateFunction } from 'react-router'
import toast from '@/lib/toast'
import { normalizeRole } from '@/utils/dashboardAccess'
import { safeEnrollmentRedirect } from '@/utils/enrollmentRedirect'
import { hasEnrollIntentHost, setEnrollIntent, type EnrollIntent } from '@/lib/enrollIntent'

// Re-exported so enroll call sites build their intent from the same module they gate with.
export type { EnrollIntent } from '@/lib/enrollIntent'

export const PUBLIC_ENROLL_STUDENT_ONLY_MSG =
  'يجب تسجيل الدخول كطالب للالتحاق بهذا البرنامج'

export type PublicEnrollGate = 'guest' | 'student' | 'non_student'

export function isStudentUser(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'student'
}

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

export function resolvePublicEnrollGate(
  isAuthenticated: boolean,
  role: string | undefined | null,
): PublicEnrollGate {
  if (!isAuthenticated) return 'guest'
  if (isStudentUser(role)) return 'student'
  return 'non_student'
}

/**
 * Returns true when the student action may proceed.
 *
 * Minimal-friction path: when the caller provides an `intent` and the
 * QuickJoinModal host is mounted (public Layout), guests join + enroll in
 * place — the `/login?redirect=…` round-trip survives ONLY as the fallback
 * for surfaces without the modal host. The `redirect` query param is the
 * single unified return-param name for that fallback.
 */
export function gatePublicEnrollClick(options: {
  isAuthenticated: boolean
  role: string | undefined | null
  redirectPath: string
  navigate: NavigateFunction
  /** In-context join+enroll payload — opens the QuickJoinModal instead of navigating away. */
  intent?: EnrollIntent
  onStudent?: () => void
}): boolean {
  const gate = resolvePublicEnrollGate(options.isAuthenticated, options.role)
  if (gate === 'guest') {
    if (options.intent && hasEnrollIntentHost()) {
      setEnrollIntent(options.intent)
      return false
    }
    options.navigate(buildPublicLoginHref(options.redirectPath))
    return false
  }
  if (gate === 'non_student') {
    if (options.intent && hasEnrollIntentHost()) {
      // Modal opens in its info state («هذا الحساب ليس حساب طالب») and offers a
      // student-account path — replaces the dead-end toast wherever it can.
      setEnrollIntent(options.intent)
      return false
    }
    toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)
    return false
  }
  options.onStudent?.()
  return true
}
