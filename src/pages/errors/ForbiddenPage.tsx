import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import ErrorPageShell from '@/components/errors/ErrorPageShell'
import { useAuth } from '@/contexts/AuthContext'

export default function ForbiddenPage() {
  const { user, isAuthenticated } = useAuth()

  const dashboardHref =
    user?.role === 'admin'
      ? '/dashboard/admin'
      : user?.role === 'teacher'
        ? '/dashboard/teacher'
        : user?.role === 'partner'
          ? '/partner/dashboard'
          : '/dashboard/student'

  return (
    <ErrorPageShell
      code="403"
      title="لا تملك صلاحية الوصول"
      description="هذه الصفحة مخصّصة لدور آخر في المنصة. إذا كنت تعتقد أن هذا خطأ، تواصل مع فريق الدعم."
      icon={<ShieldOff size={52} className="text-customOrange" aria-hidden />}
      actions={
        <>
          {isAuthenticated ? (
            <Link
              to={dashboardHref}
              className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl bg-customBlue px-7 py-3 font-bold text-white shadow-md shadow-sky-200 transition hover:bg-[#1e7dab]"
            >
              لوحتي
            </Link>
          ) : (
            <Link
              to="/login"
              className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl bg-customBlue px-7 py-3 font-bold text-white shadow-md shadow-sky-200 transition hover:bg-[#1e7dab]"
            >
              تسجيل الدخول
            </Link>
          )}
          <Link
            to="/"
            className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl border border-slate-200 bg-white px-7 py-3 font-bold text-deepBlue transition hover:border-customBlue/40 hover:bg-sky-50"
          >
            الرئيسية
          </Link>
        </>
      }
    />
  )
}
