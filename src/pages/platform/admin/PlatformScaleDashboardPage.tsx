import { motion } from 'framer-motion'
import { Activity, BookOpen, Database, Globe2, ShieldCheck, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'

type RawScale = {
  // new shape
  total_users?: number
  active_courses?: number
  monthly_active_learners?: number
  api_requests_24h?: number
  storage_used_gb?: number
  uptime_percent?: number
  regions?: string[]
  // legacy shape from platform/scale route
  users?: number
  courses?: number
  instructors?: number
  registrations?: number
}

function norm(raw: RawScale) {
  return {
    total_users:              raw.total_users ?? raw.users ?? 0,
    active_courses:           raw.active_courses ?? raw.courses ?? 0,
    monthly_active_learners:  raw.monthly_active_learners ?? raw.registrations ?? 0,
    api_requests_24h:         raw.api_requests_24h ?? 0,
    storage_used_gb:          raw.storage_used_gb ?? 0,
    uptime_percent:           raw.uptime_percent ?? 100,
    regions:                  raw.regions ?? [],
    instructors:              raw.instructors ?? 0,
  }
}

export default function PlatformScaleDashboardPage() {
  const [data, setData] = useState<ReturnType<typeof norm> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await apiClient.get<unknown>('/platform/scale')
      const raw = unwrapData<RawScale>(res.data)
      setData(norm(raw ?? {}))
    } catch {
      setError('تعذّر تحميل بيانات المنصة.')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (error) {
    return (
      <div dir="rtl" className="rounded-2xl border border-rose-100 bg-rose-50 p-10 text-center">
        <p className="font-black text-rose-700">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white"
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    )
  }

  const ar = new Intl.NumberFormat('ar-SA')

  const cards = [
    { label: 'إجمالي المستخدمين',        value: ar.format(data.total_users),              icon: Users       },
    { label: 'دورات نشطة',               value: ar.format(data.active_courses),           icon: BookOpen    },
    { label: 'المسجّلون',                 value: ar.format(data.monthly_active_learners),  icon: Globe2      },
    { label: 'المدربون',                  value: ar.format(data.instructors),              icon: Activity    },
    { label: 'التخزين (غيغابايت)',        value: data.storage_used_gb > 0 ? ar.format(data.storage_used_gb) : '—', icon: Database },
    { label: 'التوفر %',                  value: data.uptime_percent > 0 ? `${data.uptime_percent.toFixed(1)}%` : '—', icon: ShieldCheck },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-accent-700">Scale</p>
        <h1 className="mt-2 text-3xl font-black text-deepBlue">لوحة نمو المنصة</h1>
        <p className="mt-2 text-sm font-medium text-deepBlue/50">
          إحصاءات تشغيلية شاملة لمنصة EMC
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

      {data.regions.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-100 bg-gradient-to-bl from-[#F6F8FB] to-white p-8 shadow-inner"
        >
          <h2 className="text-sm font-black text-deepBlue">المناطق والتواجد</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.regions.map((r) => (
              <span key={r} className="rounded-full bg-white px-4 py-2 text-xs font-black text-deepBlue shadow-sm ring-1 ring-slate-100">
                {r}
              </span>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  )
}
