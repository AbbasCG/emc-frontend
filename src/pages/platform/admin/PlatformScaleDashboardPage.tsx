import { motion } from 'framer-motion'
import { Activity, Cloud, Database, Globe2, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchPlatformScale } from '@/api/platformScaleApi'
import type { PlatformScaleData } from '@/types/platform'

export default function PlatformScaleDashboardPage() {
  const [data, setData] = useState<PlatformScaleData | null>(null)
  useEffect(() => {
    let c = false
    ;(async () => {
      const d = await fetchPlatformScale()
      if (!c) setData(d)
    })()
    return () => {
      c = true
    }
  }, [])

  if (!data) {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
  }

  const cards = [
    { label: 'إجمالي المستخدمين', value: data.total_users.toLocaleString('ar-SA'), icon: Users },
    { label: 'دورات نشطة', value: data.active_courses, icon: Activity },
    { label: 'متعلمون نشطون شهرياً', value: data.monthly_active_learners.toLocaleString('ar-SA'), icon: Globe2 },
    { label: 'طلبات API (٢٤ ساعة)', value: data.api_requests_24h.toLocaleString('ar-SA'), icon: Cloud },
    { label: 'التخزين (غيغابايت)', value: data.storage_used_gb.toLocaleString('ar-SA'), icon: Database },
    { label: 'التوفر %', value: data.uptime_percent.toFixed(2), icon: ShieldCheck },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">Scale</p>
        <h1 className="mt-2 text-3xl font-black text-deepBlue">لوحة نمو المنصة</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500">
          قراءات تشغيلية تستلهم لوحات Stripe — جاهزة للربط مع مراقبة حقيقية وRegional footprint.
        </p>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{c.label}</p>
                <p className="mt-3 text-3xl font-black text-deepBlue">{c.value}</p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-customBlue to-deepBlue text-white shadow-lg">
                <c.icon size={22} />
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10 rounded-2xl border border-slate-100 bg-gradient-to-bl from-[#F6F8FB] to-white p-8 shadow-inner"
      >
        <h2 className="text-sm font-black text-deepBlue">مناطق وتواجد</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.regions.map((r) => (
            <span key={r} className="rounded-full bg-white px-4 py-2 text-xs font-black text-deepBlue shadow-sm ring-1 ring-slate-100">
              {r}
            </span>
          ))}
        </div>
      </motion.section>
    </div>
  )
}
