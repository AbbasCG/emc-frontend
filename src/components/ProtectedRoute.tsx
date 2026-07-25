import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
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

  return <Outlet />
}
