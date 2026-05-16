import { Navigate, Outlet, useLocation } from 'react-router-dom'
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
  const { user } = useAuth()
  const location = useLocation()
  const pathname = location.pathname
  const role = normalizeRole(user?.role ?? null)
  const home = getDashboardPathByRole(role)

  if (pathname.startsWith('/dashboard/teacher') && role === 'instructor') {
    const target = pathname.replace(/^\/dashboard\/teacher/, '/dashboard/instructor')
    return <Navigate to={`${target}${location.search}${location.hash}`} replace />
  }

  if (!canAccessDashboardPath(role, pathname)) {
    return <Navigate to={home} replace state={{ from: pathname }} />
  }

  return <Outlet />
}
