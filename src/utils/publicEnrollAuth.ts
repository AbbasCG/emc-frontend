import type { NavigateFunction } from 'react-router'
import toast from '@/lib/toast'
import { normalizeRole } from '@/utils/dashboardAccess'
import { safeEnrollmentRedirect } from '@/utils/enrollmentRedirect'

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

/** Returns true when the student action may proceed. */
export function gatePublicEnrollClick(options: {
  isAuthenticated: boolean
  role: string | undefined | null
  redirectPath: string
  navigate: NavigateFunction
  onStudent?: () => void
}): boolean {
  const gate = resolvePublicEnrollGate(options.isAuthenticated, options.role)
  if (gate === 'guest') {
    options.navigate(buildPublicLoginHref(options.redirectPath))
    return false
  }
  if (gate === 'non_student') {
    toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)
    return false
  }
  options.onStudent?.()
  return true
}
