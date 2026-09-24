import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { usePageAccess } from '@/contexts/PageAccessContext'
import { getDashboardPathByRole, normalizeRole } from '@/utils/dashboardAccess'

/**
 * Enforces page access for everything rendered inside the dashboard shell.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE BACKEND DECIDES
 * ─────────────────────────────────────────────────────────────────────────
 * This guard reads the effective page-access manifest and applies it. It no
 * longer consults canAccessDashboardPath(): that function encoded a parallel
 * role→path matrix in the browser, which could — and did — disagree with the
 * backend. There is now ONE page-access decision, made server-side by
 * EffectivePageAccessService, and this is a consumer of it.
 *
 * PAGE ACCESS != BUSINESS AUTHORIZATION. Passing this guard means a page may be
 * opened. Every endpoint it calls still authorizes independently.
 *
 * normalizeRole/getDashboardPathByRole remain from dashboardAccess.ts on
 * purpose: they are route METADATA (where does this role's home live), not
 * authorization.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FAILURE BEHAVIOUR
 * ─────────────────────────────────────────────────────────────────────────
 * Rendering is held until a decision exists, so an unauthorized page is never
 * shown for a frame and then withdrawn. A manifest that fails to load grants
 * nothing: the user is sent to their role home rather than into a page whose
 * status is unknown. An UNMAPPED path is allowed through — the manifest has no
 * opinion about URLs no catalog capability owns, and the backend still refuses
 * anything the user may not have.
 */
export default function DashboardAccessGuard() {
  const { user, isLoading } = useAuth()
  const { status, canAccessPath } = usePageAccess()
  const location = useLocation()
  const pathname = location.pathname

  const role = normalizeRole(user?.role ?? null)
  const home = getDashboardPathByRole(role)

  // Legacy alias kept: /dashboard/teacher/* is the old mount for instructors.
  if (pathname.startsWith('/dashboard/teacher') && role === 'instructor') {
    const target = pathname.replace(/^\/dashboard\/teacher/, '/dashboard/instructor')
    return <Navigate to={`${target}${location.search}${location.hash}`} replace />
  }

  // Hold rendering until BOTH the session and the manifest have resolved.
  // Showing the page first and correcting afterwards would flash content the
  // user may not be entitled to see.
  if (isLoading || status === 'idle' || status === 'loading') {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="جارٍ التحميل"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-customBlue border-t-transparent" />
      </div>
    )
  }

  const decision = status === 'error' ? false : canAccessPath(pathname)

  // `null` means no catalog capability owns this path — not a denial.
  if (decision === false) {
    // `home` is this guard's designated fallback, so it has to stay reachable:
    // redirecting a user whose home is itself denied would bounce forever and
    // lock the app with "Maximum update depth exceeded". This guard only mounts
    // inside ProtectedRoute, so the session already exists and rendering the
    // fallback is safe.
    if (pathname === home) return <Outlet />
    return <Navigate to={home} replace state={{ from: pathname }} />
  }

  return <Outlet />
}
