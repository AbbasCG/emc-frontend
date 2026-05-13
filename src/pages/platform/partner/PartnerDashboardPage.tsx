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

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[11px] font-black uppercase tracking-widest text-customOrange">Status</p>
        <h2 className="mt-2 text-2xl font-black text-white">{data.partnership_status}</h2>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <PartnerMetricCard label="برامج مشتركة" value={data.joint_programs_count} icon={LineChart} accent="from-customOrange/25 to-white" />
        <PartnerMetricCard label="المشاركون" value={data.participants_total} icon={Users2} accent="from-white/40 to-white/10" />
        <PartnerMetricCard label="مؤشر الأثر" value={`${data.impact_score}%`} icon={CalendarDays} accent="from-sky-400/30 to-white/10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-sm font-black text-white">الاجتماعات القادمة</h3>
          <ul className="mt-4 space-y-3">
            {data.upcoming_meetings.map((m) => (
              <li key={m.id} className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/10">
                <span className="block font-black">{m.title}</span>
                <span className="mt-1 block text-[11px] text-white/60">{m.at}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-sm font-black text-white">تقارير حديثة</h3>
          <div className="mt-4 space-y-2">
            {data.recent_reports.map((r) => (
              <PartnerReportCard key={r.id} title={r.title} at={r.at} />
            ))}
          </div>
        </section>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-xl shadow-black/25 ring-1 ring-white/30">
        <UploadPanel />
      </div>
    </div>
  )
}
