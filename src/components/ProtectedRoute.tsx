import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { PASSWORD_CHANGE_PATH } from '@/lib/passwordChangeGate'
import { getDashboardPathByRole } from '@/utils/dashboardAccess'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading, user, isImpersonating } = useAuth()
  const location = useLocation()

  // While restoring the session from localStorage, show a full-screen spinner
  // so the UI doesn't flash between logged-in and logged-out states.
  if (isLoading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F6F8FB]"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="جارٍ التحميل"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-customBlue border-t-transparent" />
        <span className="text-sm font-bold text-slate-500">جارٍ تهيئة الجلسة…</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Preserve the page the user was trying to reach
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Forced password change: a user still on the temporary password gets ONE page and nothing else (this guard sits
  // above the dashboard shell, so the sidebar and topbar are never rendered for them). The reverse also holds, so
  // a finished user who opens the page again lands on their home instead of an empty form.
  // Not while a super admin previews someone else: the server skips the gate for impersonation, and gating the
  // preview would lock the admin out of the very session they are inspecting.
  const mustChangePassword = user?.must_change_password === true && !isImpersonating
  const onGatePage = location.pathname === PASSWORD_CHANGE_PATH
  if (mustChangePassword && !onGatePage) {
    return <Navigate to={PASSWORD_CHANGE_PATH} state={{ from: `${location.pathname}${location.search}` }} replace />
  }
  if (!mustChangePassword && onGatePage) {
    return <Navigate to={getDashboardPathByRole(user?.role)} replace />
  }

  return <Outlet />
}
