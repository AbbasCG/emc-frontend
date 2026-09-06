import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import {
  canAccessDashboardPath,
  getDashboardPathByRole,
  normalizeRole,
} from '@/utils/dashboardAccess'

/**
 * Enforces namespace rules for everything rendered inside the dashboard shell.
 * Must wrap dashboard routes (not the public site).
 */
export default function DashboardAccessGuard() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

  if (isLoading) {
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

  const role = normalizeRole(user?.role ?? null)
  const home = getDashboardPathByRole(role)

  if (pathname.startsWith('/dashboard/teacher') && role === 'instructor') {
    const target = pathname.replace(/^\/dashboard\/teacher/, '/dashboard/instructor')
    return <Navigate to={`${target}${location.search}${location.hash}`} replace />
  }

  if (!canAccessDashboardPath(role, pathname)) {
    // `home` is this guard's designated fallback, so it has to be reachable. A user
    // whose payload carries no role resolves `home` to /dashboard/profile, which
    // `canAccessDashboardPath` *also* rejects — its `authenticated` sentinel is
    // evaluated against the role rather than the session — so redirecting there would
    // bounce forever and lock the app up with "Maximum update depth exceeded". This
    // guard only ever mounts inside ProtectedRoute, so the session is already
    // established by this point and rendering the fallback is safe.
    if (pathname === home) return <Outlet />
    return <Navigate to={home} replace state={{ from: pathname }} />
  }

  return <Outlet />
}
