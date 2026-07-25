import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { normalizeRole } from '@/utils/dashboardAccess'
import type { UserRole } from '../types'

type Props = {
  allow: readonly (UserRole | string)[]
  /** Where to send users lacking permission (default: forbidden page). */
  redirectTo?: string
}

/**
 * Role-based route guard. Prefer over ad-hoc checks inside pages.
 * Alias export: `RoleRoute`.
 */
function RoleGate({ allow, redirectTo = '/403' }: Props) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="جارٍ التحميل"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-customBlue border-t-transparent" />
        <span className="text-sm font-bold text-slate-500">جارٍ التحقق من الصلاحيات…</span>
      </div>
    )
  }

  const normalizedRole = normalizeRole(user?.role ?? null)

  if (normalizedRole === 'super_admin') {
    return <Outlet />
  }

  const allowed =
    normalizedRole != null &&
    allow.some((a) => normalizeRole(String(a)) === normalizedRole)

  if (!allowed) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export default RoleGate
export { RoleGate as RoleRoute }
