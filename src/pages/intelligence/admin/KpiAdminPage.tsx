import { useEffect, useState } from 'react'
import { ExportButton, IntelligencePageSkeleton, KpiBentoGrid } from '@/components/intelligence'
import { fetchKpiDashboard } from '@/api/kpiApi'
import type { KpiMetric, KpiTabSlug } from '@/types/intelligence'

const TABS: { slug: KpiTabSlug; label: string }[] = [
  { slug: 'overview', label: 'نظرة عامة' },
  { slug: 'education', label: 'التعليم' },
  { slug: 'finance', label: 'المالية' },
  { slug: 'departments', label: 'الإدارات' },
  { slug: 'marketing', label: 'التسويق' },
  { slug: 'partnerships', label: 'الشراكات' },
  { slug: 'hr', label: 'الموارد البشرية' },
]

export default function KpiAdminPage() {
  const [tab, setTab] = useState<KpiTabSlug>('overview')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<string[] | undefined>()
  const [metrics, setMetrics] = useState<KpiMetric[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    ;(async () => {
      try {
        const d = await fetchKpiDashboard(tab)
        if (!cancelled) {
          setMetrics(Array.isArray(d.metrics) ? d.metrics : [])
          setHighlights(Array.isArray(d.highlights) ? d.highlights : undefined)
        }
      } catch {
        if (!cancelled) {
          setMetrics([])
          setHighlights(undefined)
          setLoadError('تعذّر تحميل مؤشرات الأداء. تحقق من الاتصال وأعد المحاولة.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tab])

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.35rem] bg-gradient-to-bl from-white via-sky-50/40 to-white p-8 text-right shadow-lg ring-1 ring-deepBlue/[0.06]">
        <div>
          <h1 className="text-2xl font-black text-deepBlue">مؤشرات الأداء</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">لوحة ذكاء بنمط bento عبر الأقسام المؤسسية</p>
        </div>
        <ExportButton label="تصدير لوحة (PDF)" variant="solid" onClick={() => {}} />
      </header>

      <nav className="flex flex-wrap justify-end gap-2 rounded-2xl bg-deepBlue/[0.04] p-2 ring-1 ring-deepBlue/[0.06]">
        {TABS.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => setTab(t.slug)}
            className={[
              'rounded-xl px-4 py-2 text-xs font-black transition',
              tab === t.slug ? 'bg-deepBlue text-white shadow-md' : 'bg-white text-deepBlue ring-1 ring-deepBlue/[0.08]',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <IntelligencePageSkeleton />
      ) : loadError ? (
        <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
          <p className="font-black text-rose-800">{loadError}</p>
          <button type="button" onClick={() => setTab((t) => t)} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
        </div>
      ) : (
        <KpiBentoGrid metrics={metrics} highlights={highlights} />
      )}
    </div>
  )
}
