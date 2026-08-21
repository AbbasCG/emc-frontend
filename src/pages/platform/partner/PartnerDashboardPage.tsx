import { motion } from 'framer-motion'
import { CalendarDays, LineChart, Users2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchPartnerDashboard } from '@/api/partnerPortalApi'
import PartnerMetricCard from '@/components/platform/PartnerMetricCard'
import PartnerReportCard from '@/components/platform/PartnerReportCard'
import UploadPanel from '@/components/platform/UploadPanel'
import type { PartnerDashboardData } from '@/types/platform'

export default function PartnerDashboardPage() {
  const [data, setData] = useState<PartnerDashboardData | null>(null)
  useEffect(() => {
    let c = false
    ;(async () => {
      const d = await fetchPartnerDashboard()
      if (!c) setData(d)
    })()
    return () => {
      c = true
    }
  }, [])

  if (!data) return <div className="h-48 animate-pulse rounded-2xl bg-white/10" />

  const statusLabel = data.partnership_status === 'active'
    ? 'نشطة'
    : data.partnership_status === 'inactive'
      ? 'غير نشطة'
      : data.partnership_status === 'archived'
        ? 'مؤرشفة'
        : data.partnership_status || 'غير محددة'

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">حالة الشراكة</p>
        <h2 className="mt-2 text-2xl font-black text-deepBlue">{data.partner?.name ?? 'بوابة الشريك'}</h2>
        <p className="mt-2 text-sm font-bold text-slate-500">{statusLabel}{data.your_role ? ` · ${data.your_role}` : ''}</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <PartnerMetricCard label="برامج مشتركة" value={data.joint_programs_count} icon={LineChart} accent="from-customOrange/25 to-white" />
        <PartnerMetricCard label="المشاركون" value={data.participants_total} icon={Users2} accent="from-white/40 to-white/10" />
        <PartnerMetricCard
          label="مؤشر الأثر"
          value={data.impact_score == null ? 'غير متاح' : `${data.impact_score}%`}
          hint={data.impact_score == null ? 'يظهر بعد اعتماد منهجية القياس' : undefined}
          icon={CalendarDays}
          accent="from-sky-400/30 to-white/10"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-black text-deepBlue">الاجتماعات القادمة</h3>
          <ul className="mt-4 space-y-3">
            {data.upcoming_meetings.length === 0 && (
              <li className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                لا اجتماعات قادمة حالياً
              </li>
            )}
            {data.upcoming_meetings.map((m) => (
              <li key={m.id} className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-deepBlue ring-1 ring-slate-100">
                <span className="block font-black">{m.title}</span>
                <span className="mt-1 block text-[11px] text-slate-500">{m.at}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-black text-deepBlue">تقارير حديثة</h3>
          <div className="mt-4 space-y-2">
            {data.recent_reports.length === 0 && (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                لا تقارير حديثة بعد
              </p>
            )}
            {data.recent_reports.map((r) => (
              <PartnerReportCard key={r.id} title={r.title} at={r.at} />
            ))}
          </div>
        </section>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <UploadPanel />
      </div>
    </div>
  )
}
