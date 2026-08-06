import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Construction } from 'lucide-react'

const PAGE_LABELS: Record<string, string> = {
  '/dashboard/admin/users': 'إدارة المستخدمين',
  '/dashboard/students': 'قائمة الطلاب',
  '/dashboard/registrations': 'التسجيلات',
  '/dashboard/schedule': 'الجدول الزمني',
  '/dashboard/users': 'إدارة المستخدمين',
}

export default function AdminComingSoonPage() {
  const location = useLocation()
  const pathname = location.pathname
  const pageLabel = PAGE_LABELS[pathname] ?? 'هذه الصفحة'

  return (
    <section
      dir="rtl"
      role="region"
      aria-labelledby="coming-soon-title"
      className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#F6F8FB] px-4 py-16"
    >
      <div className="w-full max-w-lg text-center">
        <div
          className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/80 ring-1 ring-slate-100"
          aria-hidden
        >
          <Construction size={52} className="text-customOrange" />
        </div>

        <p
          className="text-6xl font-black leading-none tracking-tight text-deepBlue/10 select-none"
          aria-hidden
        >
          قريباً
        </p>

        <h1
          id="coming-soon-title"
          className="-mt-2 text-3xl font-black text-deepBlue sm:text-4xl"
        >
          الصفحة غير متاحة حالياً
        </h1>

        <p className="mx-auto mt-5 max-w-md leading-8 text-slate-500">
          هذه الصفحة قيد التطوير وسيتم تفعيلها قريباً.
        </p>

        <dl className="mx-auto mt-6 max-w-sm rounded-2xl border border-slate-100 bg-white px-6 py-4 text-right shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">الصفحة</dt>
            <dd className="font-semibold text-deepBlue">{pageLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 pt-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">المسار</dt>
            <dd className="font-mono text-sm text-slate-500 break-all">{pathname}</dd>
          </div>
        </dl>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/dashboard/admin/programs"
            className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl bg-customBlue px-7 py-3 font-bold text-white shadow-md shadow-sky-200 transition hover:bg-[#1e7dab]"
          >
            العودة للبرامج
          </Link>
          <Link
            to="/dashboard/admin"
            className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl border border-slate-200 bg-white px-7 py-3 font-bold text-deepBlue transition hover:border-customBlue/40 hover:bg-sky-50"
          >
            لوحة التحكم
          </Link>
        </div>
      </div>
    </section>
  )
}
