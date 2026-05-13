import { useEffect, useState } from 'react'
import { ExportButton, IntelligencePageSkeleton, KpiBentoGrid } from '@/components/intelligence'
import { fetchKpiDashboard } from '@/api/kpiApi'
import { seedKpiTab } from '@/data/intelligenceSeed'
import type { KpiTabSlug } from '@/types/intelligence'

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
  const [highlights, setHighlights] = useState<string[] | undefined>()
  const [metrics, setMetrics] = useState(seedKpiTab('overview').metrics)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const d = await fetchKpiDashboard(tab)
        if (!cancelled) {
          setMetrics(d.metrics)
          setHighlights(d.highlights)
        }
      } catch {
        const s = seedKpiTab(tab)
        if (!cancelled) {
          setMetrics(s.metrics)
          setHighlights(s.highlights)
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

      {loading ? <IntelligencePageSkeleton /> : <KpiBentoGrid metrics={metrics} highlights={highlights} />}
    </div>
  )
}
