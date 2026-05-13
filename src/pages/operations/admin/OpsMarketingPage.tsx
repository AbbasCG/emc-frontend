import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import MarketingKanban from '@/components/operations/MarketingKanban'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { MARKETING_STATUS_AR } from '@/data/operationsLabels'
import type { MarketingContentStatus, MarketingItem } from '@/types/operations'
import { fetchMarketingItems, updateMarketingItem } from '@/api/marketingApi'
import { seedMarketing } from '@/data/operationsSeed'

export default function OpsMarketingPage() {
  const [items, setItems] = useState<MarketingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState<string>('all')
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [selected, setSelected] = useState<MarketingItem | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await fetchMarketingItems()
        if (!cancelled) setItems(d)
      } catch {
        if (!cancelled) setItems(seedMarketing())
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const platforms = useMemo(() => {
    const s = new Set<string>()
    items.forEach((i) => {
      if (i.platform) s.add(i.platform)
    })
    return Array.from(s)
  }, [items])

  const filtered = useMemo(() => {
    if (platform === 'all') return items
    return items.filter((i) => i.platform === platform)
  }, [items, platform])

  async function bumpStatus(next: MarketingContentStatus) {
    if (!selected) return
    setItems((list) => list.map((x) => (x.id === selected.id ? { ...x, status: next } : x)))
    setSelected({ ...selected, status: next })
    try {
      await updateMarketingItem(selected.id, { status: next })
    } catch {
      /* ignore */
    }
  }

  if (loading) return <OpsPageSkeleton />

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.35rem] bg-white p-6 shadow-lg ring-1 ring-deepBlue/[0.06]">
        <div className="text-right">
          <h1 className="text-xl font-black text-deepBlue">مخطط المحتوى التسويقي</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">كانبان إبداعي مع مرشحات المنصّة</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setView('kanban')}
            className={`rounded-xl px-4 py-2 text-xs font-black ${view === 'kanban' ? 'bg-deepBlue text-white' : 'bg-white ring-1 ring-deepBlue/[0.08]'}`}
          >
            كانبان
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`rounded-xl px-4 py-2 text-xs font-black ${view === 'list' ? 'bg-deepBlue text-white' : 'bg-white ring-1 ring-deepBlue/[0.08]'}`}
          >
            قائمة
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl bg-deepBlue/[0.03] p-4 ring-1 ring-deepBlue/[0.06]">
        <label className="text-xs font-black text-deepBlue">
          المنصة
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="mr-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold"
          >
            <option value="all">الكل</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === 'kanban' ? (
        <MarketingKanban items={filtered} onSelect={setSelected} />
      ) : (
        <motion.ul layout className="space-y-3">
          {filtered.map((it) => (
            <li
              key={it.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 ring-1 ring-deepBlue/[0.06]"
            >
              <button
                type="button"
                onClick={() => setSelected(it)}
                className="text-right text-xs font-black text-customBlue hover:underline"
              >
                تفاصيل
              </button>
              <div className="text-right">
                <p className="text-sm font-black text-deepBlue">{it.title}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  {it.platform} · {MARKETING_STATUS_AR[it.status]} · {it.publish_at}
                </p>
              </div>
            </li>
          ))}
        </motion.ul>
      )}

      {selected && (
        <motion.aside
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-customBlue/20 bg-sky-50/60 p-6 text-right ring-1 ring-customBlue/10"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[11px] font-black text-slate-500 hover:text-deepBlue"
            >
              إغلاق
            </button>
            <div>
              <h3 className="text-lg font-black text-deepBlue">{selected.title}</h3>
              <p className="mt-2 text-xs font-bold text-slate-600">
                {selected.owner_name} · {selected.related_program ?? 'بدون برنامج'}
              </p>
            </div>
          </div>
          <label className="mt-4 grid gap-2 text-xs font-black text-deepBlue">
            تحريك الحالة
            <select
              value={selected.status}
              onChange={(e) => bumpStatus(e.target.value as MarketingContentStatus)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold"
            >
              {(Object.keys(MARKETING_STATUS_AR) as MarketingContentStatus[]).map((k) => (
                <option key={k} value={k}>
                  {MARKETING_STATUS_AR[k]}
                </option>
              ))}
            </select>
          </label>
        </motion.aside>
      )}
    </div>
  )
}
