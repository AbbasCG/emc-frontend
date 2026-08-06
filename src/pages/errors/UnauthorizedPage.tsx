import { Link, useLocation } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import ErrorPageShell from '@/components/errors/ErrorPageShell'

export default function UnauthorizedPage() {
  const location = useLocation()
  const stateFrom = (location.state as { from?: string } | null)?.from
  const from = stateFrom ?? `${location.pathname}${location.search}`

  return (
    <ErrorPageShell
      code="401"
      title="يجب تسجيل الدخول أولًا"
      description="لا يمكن عرض هذا المحتوى بدون حساب نشط. سجّل دخولك للمتابعة."
      icon={<KeyRound size={52} className="text-customBlue" aria-hidden />}
      actions={
        <>
          <Link
            to="/login"
            state={{ from }}
            className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl bg-customBlue px-7 py-3 font-bold text-white shadow-md shadow-sky-200 transition hover:bg-[#1e7dab]"
          >
            تسجيل الدخول
          </Link>
          <Link
            to="/signup"
            className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl border border-slate-200 bg-white px-7 py-3 font-bold text-deepBlue transition hover:border-customBlue/40 hover:bg-sky-50"
          >
            إنشاء حساب
          </Link>
        </>
      }
    />
  )
}
