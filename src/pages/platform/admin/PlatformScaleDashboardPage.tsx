import { motion } from 'framer-motion'
import {
  Activity,
  BookOpen,
  Database,
  Globe2,
  HardDrive,
  Layers,
  Upload,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { fetchPlatformScale } from '@/api/platformScaleApi'
import type { PlatformScaleData } from '@/types/platform'
import {
  formatEnglishCount,
  formatEnglishNumber,
  formatEnglishPercent,
} from '@/utils/formatEnglishNumber'

type ScaleView = {
  total_users: number
  active_courses: number
  monthly_active_learners: number
  instructors: number
  storage_used_gb: number | null
  storage_total_gb: number | null
  storage_used_percent: number | null
  database_size_gb: number | null
  uploads_count: number | null
  queue_pending: number | null
  regions: string[]
}

function norm(raw: PlatformScaleData): ScaleView {
  return {
    total_users:             raw.total_users ?? raw.users ?? 0,
    active_courses:          raw.active_courses ?? raw.courses ?? 0,
    monthly_active_learners: raw.monthly_active_learners ?? raw.registrations ?? 0,
    instructors:             raw.instructors ?? 0,
    storage_used_gb:         raw.storage_used_gb ?? null,
    storage_total_gb:        raw.storage_total_gb ?? null,
    storage_used_percent:    raw.storage_used_percent ?? null,
    database_size_gb:        raw.database_size_gb ?? null,
    uploads_count:           raw.uploads_count ?? null,
    queue_pending:           raw.queue_pending ?? null,
    regions:                 raw.regions ?? [],
  }
}

function formatStorageLabel(data: ScaleView): string {
  if (data.storage_used_gb == null) return '—'
  if (data.storage_total_gb != null) {
    return `${formatEnglishNumber(data.storage_used_gb)} / ${formatEnglishNumber(data.storage_total_gb)} GB`
  }
  return `${formatEnglishNumber(data.storage_used_gb)} GB`
}

export default function PlatformScaleDashboardPage() {
  const [data, setData] = useState<ScaleView | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const raw = await fetchPlatformScale()
      setData(norm(raw))
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
      <div className="space-y-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`infra-${i}`} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  const platformCards = [
    { label: 'إجمالي المستخدمين', value: formatEnglishCount(data.total_users), icon: Users },
    { label: 'دورات نشطة', value: formatEnglishCount(data.active_courses), icon: BookOpen },
    { label: 'المسجّلون', value: formatEnglishCount(data.monthly_active_learners), icon: Globe2 },
    { label: 'المدربون', value: formatEnglishCount(data.instructors), icon: Activity },
  ]

  const infraCards = [
    {
      label: 'قاعدة البيانات',
      value: data.database_size_gb != null ? `${formatEnglishNumber(data.database_size_gb)} GB` : '—',
      icon: Database,
    },
    {
      label: 'الملفات المرفوعة',
      value: data.uploads_count != null ? formatEnglishCount(data.uploads_count) : '—',
      icon: Upload,
    },
    {
      label: 'مهام الانتظار',
      value: data.queue_pending != null ? formatEnglishCount(data.queue_pending) : '—',
      icon: Layers,
    },
  ]

  const storagePercent = data.storage_used_percent ?? 0

  return (
    <div className="mx-auto max-w-6xl space-y-8" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-accent-700">Scale</p>
        <h1 className="mt-2 text-3xl font-black text-deepBlue">لوحة نمو المنصة</h1>
        <p className="mt-2 text-sm font-medium text-deepBlue/50">
          إحصاءات تشغيلية شاملة لمنصة EMC
        </p>
      </motion.div>

      <section className="space-y-4">
        <h2 className="text-sm font-black text-deepBlue">مؤشرات المنصة</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {platformCards.map((c, i) => (
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
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black text-deepBlue">البنية التحتية</h2>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">التخزين (GB)</p>
              <p className="mt-3 text-3xl font-black text-deepBlue">{formatStorageLabel(data)}</p>
              {data.storage_used_percent != null && (
                <p className="mt-1 text-sm font-bold text-deepBlue/50">
                  {formatEnglishPercent(data.storage_used_percent)} مستخدم
                </p>
              )}
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-customBlue to-deepBlue text-white shadow-lg">
              <HardDrive size={22} />
            </span>
          </div>

          {data.storage_used_percent != null && (
            <div className="mt-5">
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, storagePercent)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-l from-customOrange to-customBlue"
                />
              </div>
            </div>
          )}
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {infraCards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
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
      </section>

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
