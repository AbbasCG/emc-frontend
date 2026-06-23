import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import ErrorPageShell from '@/components/errors/ErrorPageShell'
import { useAuth } from '@/contexts/AuthContext'
import { getDashboardPathByRole } from '@/utils/dashboardAccess'

export default function ForbiddenPage() {
  const { user, isAuthenticated } = useAuth()

  const dashboardHref = getDashboardPathByRole(user?.role)

  return (
    <ErrorPageShell
      code="403"
      title="لا تملك صلاحية الوصول"
      description="هذه الصفحة مخصّصة لدور آخر في المنصة. إذا كنت تعتقد أن هذا خطأ، تواصل مع فريق الدعم."
      icon={<ShieldOff size={52} strokeWidth={1.75} className="text-customOrange" aria-hidden />}
      actions={
        <>
          {isAuthenticated ? (
            <Link
              to={dashboardHref}
              className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl bg-customBlue px-7 py-3 font-bold text-white shadow-emc-sm transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:bg-[#1e7dab] hover:shadow-emc"
            >
              لوحتي
            </Link>
          ) : (
            <Link
              to="/login"
              className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl bg-customBlue px-7 py-3 font-bold text-white shadow-emc-sm transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:bg-[#1e7dab] hover:shadow-emc"
            >
              تسجيل الدخول
            </Link>
          )}
          <Link
            to="/"
            className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl border border-deepBlue/10 bg-white px-7 py-3 font-bold text-deepBlue shadow-emc-xs transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:border-customBlue/40 hover:bg-sky-50"
          >
            الرئيسية
          </Link>
        </>
      }
    />
  )
}
