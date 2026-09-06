import { Inbox } from 'lucide-react'
import type { MarketingContentStatus, MarketingItem } from '@/types/operations'
import { MARKETING_STATUS_AR } from '@/data/operationsLabels'
import KanbanColumn from './KanbanColumn'

const ORDER: MarketingContentStatus[] = [
  'idea',
  'writing',
  'design',
  'review',
  'approval',
  'scheduled',
  'published',
  'archived',
]

export default function MarketingKanban({
  items,
  onSelect,
}: {
  items: MarketingItem[]
  onSelect?: (item: MarketingItem) => void
}) {
  const groups = ORDER.reduce<Record<MarketingContentStatus, MarketingItem[]>>((acc, st) => {
    acc[st] = items.filter((i) => i.status === st)
    return acc
  }, {} as Record<MarketingContentStatus, MarketingItem[]>)

  return (
    <div className="flex w-full max-w-full gap-4 overflow-x-auto overscroll-x-contain pb-4" dir="rtl">
      {ORDER.map((st) => (
        <KanbanColumn key={st} title={MARKETING_STATUS_AR[st]} count={groups[st].length}>
          {groups[st].length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-deepBlue/10 py-8">
              <Inbox size={18} strokeWidth={1.75} className="text-deepBlue/25" aria-hidden />
              <p className="text-[11px] font-bold text-slate-400">لا بطاقات</p>
            </div>
          ) : (
            groups[st].map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => onSelect?.(it)}
                className="w-full rounded-xl border border-deepBlue/[0.06] bg-white p-3 text-right shadow-sm transition hover:border-customBlue/30"
              >
                <p className="text-xs font-black text-deepBlue">{it.title}</p>
                <p className="mt-1 text-[10px] font-bold text-slate-500">{it.platform ?? '—'}</p>
                <p className="mt-1 text-[10px] text-customOrange">نشر: {it.publish_at ?? '—'}</p>
              </button>
            ))
          )}
        </KanbanColumn>
      ))}
    </div>
  )
}
