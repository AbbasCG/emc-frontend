import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Activity, BellRing, Cloud, LayoutDashboard, Smartphone } from 'lucide-react'
import { fetchMobileReadiness } from '@/api/mobileReadinessApi'
import MobileReadinessCard from '@/components/enterprise/MobileReadinessCard'
import SecretWarningPanel from '@/components/enterprise/SecretWarningPanel'
import { LoadingSkeletonStack } from '@/components/enterprise/LoadingSkeleton'
import type { MobileReadinessPayload } from '@/types/phase7'

export default function AdminMobileReadinessPage() {
  const [data, setData] = useState<MobileReadinessPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const payload = await fetchMobileReadiness()
      if (!cancelled) {
        setData(payload)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-accent-700">Mobile</p>
          <h1 className="text-3xl font-black text-deepBlue">جاهزية التطبيق المحمول</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-500">
            لوحة قراءة للمنظومة القادمة — حالة واجهات الـ API، نقاط النهاية، وتجربة لوحة الطالب المختصرة بدون بناء تطبيق حقيقي بعد.
          </p>
        </div>
        <Link to="/dashboard/admin/platform-scale" className="text-xs font-black text-customBlue hover:underline">
          نمو المنصة
        </Link>
      </motion.div>

      <SecretWarningPanel body="هذه الشاشة تشخيصية فقط. لا يوجد تطبيق عميل نهائي بعد — استخدمها لمزامنة فرق المنتج والهندسة." />

      {loading || !data ? (
        <LoadingSkeletonStack rows={4} />
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <MobileReadinessCard
              icon={Cloud}
              title="حالة واجهة الـ API"
              value={data.api_online ? 'متصل' : 'غير متصل'}
              hint="يقيس استجابة `/api/mobile/v1/health` عند توفرها."
              tone={data.api_online ? 'success' : 'warning'}
            />
            <MobileReadinessCard
              icon={BellRing}
              title="جسر الإشعارات"
              value={data.notification_bridge_ready ? 'مهيأ' : 'قيد الإعداد'}
              hint="مزامنة الدفع والرسائل الفورية مع هوية الطالب."
              tone={data.notification_bridge_ready ? 'success' : 'warning'}
            />
            <MobileReadinessCard
              icon={Smartphone}
              title="دعم العمل دون اتصال"
              value="قريبًا"
              hint={data.offline_placeholder_ar}
              tone="neutral"
            />
          </div>

          <section className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm" dir="rtl">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-customBlue" />
                <h2 className="text-sm font-black text-deepBlue">نقاط النهاية الجاهزة</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {data.endpoints.map((ep) => (
                  <li key={ep.path} className="rounded-xl bg-[#F6F8FB] px-3 py-3 ring-1 ring-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-xs font-black text-deepBlue" dir="ltr">
                        {ep.path}
                      </p>
                      <span
                        className={[
                          'rounded-lg px-2 py-1 text-[11px] font-black ring-1 ring-inset',
                          ep.ready ? 'bg-emerald-50 text-emerald-900 ring-emerald-100' : 'bg-amber-50 text-amber-950 ring-amber-100',
                        ].join(' ')}
                      >
                        {ep.ready ? 'جاهز' : 'قيد العمل'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-600">{ep.description_ar}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm" dir="rtl">
              <div className="flex items-center gap-2">
                <LayoutDashboard size={18} className="text-customOrange" />
                <h2 className="text-sm font-black text-deepBlue">معاينة لوحة الطالب</h2>
              </div>
              <ul className="mt-4 list-disc space-y-2 pr-5 text-sm font-medium text-slate-600">
                {data.dashboard_preview_ar.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              <div className="mt-6">
                <p className="text-xs font-black text-slate-400">خارطة الطريق</p>
                <div className="mt-3 space-y-2">
                  {data.roadmap.map((item) => (
                    <label key={item.id} className="flex items-center gap-3 rounded-xl bg-[#F6F8FB] px-3 py-2 ring-1 ring-slate-100">
                      <input type="checkbox" checked={item.done} readOnly className="accent-customBlue" />
                      <span className="text-sm font-bold text-deepBlue">{item.label_ar}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
