import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { CheckCircle, Home, Clock, Mail, Hash } from 'lucide-react'
import type { AmbassadorSubmitResult } from '@/api/ambassadorApplicationApi'
import { formatDateTime } from '@/utils/dateTime'

export default function AmbassadorApplicationSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state as AmbassadorSubmitResult | null

  // Guard: if no state, the user navigated here directly — redirect to apply
  useEffect(() => {
    if (!result) {
      navigate('/ambassador/apply', { replace: true })
    }
  }, [result, navigate])

  if (!result) return null

  const submittedDate = result.submitted_at ? formatDateTime(result.submitted_at) : null

  return (
    <div className="min-h-screen bg-[#f4f7fb]" dir="rtl">
      {/* Top bar */}
      <div className="bg-deepBlue px-6 py-4">
        <Link to="/" className="text-xl font-black text-white">
          EMC
        </Link>
      </div>

      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        {/* Card */}
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100 sm:p-10">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="text-emerald-500" size={44} strokeWidth={1.5} />
            </div>
          </div>

          {/* Title */}
          <h1 className="mb-3 text-center text-2xl font-black text-deepBlue">
            تم استلام طلبك بنجاح
          </h1>
          <p className="mb-8 text-center text-sm font-semibold leading-relaxed text-slate-500">
            شكراً لتقديمك على برنامج سفراء التحول الرقمي.
            <br />
            سيقوم فريق EMC بمراجعة طلبك والتواصل معك عبر البريد الإلكتروني.
          </p>

          {/* Details */}
          <div className="mb-8 space-y-3 rounded-2xl bg-slate-50 p-5">
            <div className="flex items-center gap-3 text-sm">
              <Hash size={16} className="shrink-0 text-customBlue" />
              <span className="font-semibold text-slate-500">رقم الطلب</span>
              <span className="mr-auto font-black text-deepBlue ltr">{result.reference_number}</span>
            </div>
            {submittedDate && (
              <div className="flex items-center gap-3 text-sm">
                <Clock size={16} className="shrink-0 text-customBlue" />
                <span className="font-semibold text-slate-500">تاريخ التقديم</span>
                <span className="mr-auto font-bold text-slate-700">{submittedDate}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="shrink-0 text-customBlue" />
              <span className="font-semibold text-slate-500">تأكيد بالبريد</span>
              <span className="mr-auto font-bold text-emerald-600">تم الإرسال</span>
            </div>
          </div>

          {/* Next step hint */}
          <div className="mb-8 rounded-xl border border-customBlue/20 bg-sky-50/50 p-4 text-sm text-slate-600">
            <p className="font-bold text-customBlue">الخطوات التالية</p>
            <p className="mt-1 leading-relaxed">
              سيراجع فريق EMC طلبك خلال أيام عمل. قد يتواصل معك الفريق لاستفسارات إضافية
              أو لترتيب موعد مقابلة. تابع بريدك الإلكتروني للتحديثات.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              to="/"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-deepBlue px-5 py-3 text-sm font-extrabold text-white transition hover:bg-deepBlue/90"
            >
              <Home size={16} />
              الصفحة الرئيسية
            </Link>
            <Link
              to="/ambassador"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              برنامج السفراء
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
