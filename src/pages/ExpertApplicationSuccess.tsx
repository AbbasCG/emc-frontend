import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { CheckCircle, Home, Hash } from 'lucide-react'
import PublicSeo from '@/components/public/PublicSeo'

export default function ExpertApplicationSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state as { uuid?: string } | null

  useEffect(() => {
    if (!result) {
      navigate('/join-expert', { replace: true })
    }
  }, [result, navigate])

  if (!result) return null

  return (
    <div className="min-h-screen bg-[#f4f7fb]" dir="rtl">
      <PublicSeo
        title="تم استلام طلبك"
        description="تأكيد استلام طلب الانضمام لمجتمع المدربين والخبراء."
        path="/join-expert/success"
        noIndex
      />
      <div className="bg-deepBlue px-6 py-4">
        <Link to="/" className="text-xl font-black text-white">EMC</Link>
      </div>

      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100 sm:p-10">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="text-emerald-500" size={44} strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="mb-3 text-center text-2xl font-black text-deepBlue">شكرًا لاهتمامك بالانضمام إلى مجتمع EMC</h1>
          <div className="mb-8 text-center text-sm font-semibold leading-relaxed text-slate-600 space-y-3">
            <p className="font-bold text-emerald-600 text-base">تم استلام بياناتك بنجاح.</p>
            <p>سيقوم فريق EMC بمراجعة معلوماتك وخبراتك وتصنيفها ضمن مجتمع المدربين والخبراء والمتخصصين، وسيتم التواصل معك عند توفر فرص تدريبية أو مشاريع أو استشارات أو فعاليات أو مبادرات تتناسب مع تخصصك وخبرتك.</p>
            <p className="text-deepBlue font-bold pt-2">نتطلع إلى بناء مجتمع معرفي ومهني يجمع الخبرات والكفاءات، ويحوّل المعرفة والخبرة إلى أثر حقيقي.</p>
          </div>

          <div className="mb-8 space-y-3 rounded-2xl bg-slate-50 p-5">
            <div className="flex items-center gap-3 text-sm">
              <Hash size={16} className="shrink-0 text-customBlue" />
              <span className="font-semibold text-slate-500">رقم الطلب</span>
              <span className="mr-auto font-black text-deepBlue ltr text-xs">{result.uuid?.substring(0, 8)}...</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link to="/" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-deepBlue px-5 py-3 text-sm font-extrabold text-white transition hover:bg-deepBlue/90">
              <Home size={16} /> الصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
