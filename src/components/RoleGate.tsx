import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types'

type Props = {
  allow: UserRole[]
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

  const role = user?.role
  if (!role || !allow.includes(role)) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export default RoleGate
export { RoleGate as RoleRoute }
