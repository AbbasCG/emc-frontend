import { useMemo, useState } from 'react'
import { ChevronDown, CheckCircle2 } from 'lucide-react'
import PublicDetailSection from '@/components/public/detail/PublicDetailSection'
import { cn } from '@/lib/utils'

export type CurriculumGroup = {
  id: string
  title: string
  items: string[]
}

const PREVIEW = 4

function uniqItems(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const line = raw.trim()
    if (!line || seen.has(line)) continue
    seen.add(line)
    out.push(line)
  }
  return out
}

function GroupBlock({ group }: { group: CurriculumGroup }) {
  const items = useMemo(() => uniqItems(group.items), [group.items])
  const [open, setOpen] = useState(true)
  const [showAll, setShowAll] = useState(false)

  if (items.length === 0) return null

  const visible = showAll ? items : items.slice(0, PREVIEW)
  const hidden = items.length - PREVIEW

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-right transition hover:bg-white/80 sm:px-5"
      >
        <span className="text-sm font-black text-deepBlue">{group.title}</span>
        <span className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
          {String(items.length)} عنصر
          <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} aria-hidden />
        </span>
      </button>
      {open ?
        <div className="border-t border-slate-100 px-3 pb-3 pt-2 sm:px-4">
          <ul className="space-y-2">
            {visible.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold leading-7 text-slate-700 ring-1 ring-slate-100"
              >
                <CheckCircle2 size={16} className="mt-1 shrink-0 text-customBlue" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {hidden > 0 && !showAll ?
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 w-full rounded-xl border border-dashed border-[#0077B6]/30 bg-[#0077B6]/5 py-2.5 text-xs font-black text-[#1a6b96] transition hover:bg-[#0077B6]/10"
            >
              عرض المزيد ({String(hidden)})
            </button>
          : null}
        </div>
      : null}
    </div>
  )
}

export default function PublicCurriculumSection({
  title = 'المنهاج والمحتوى',
  groups,
}: {
  title?: string
  groups: CurriculumGroup[]
}) {
  const nonEmpty = groups.filter((g) => uniqItems(g.items).length > 0)
  if (nonEmpty.length === 0) return null

  return (
    <PublicDetailSection title={title} compact>
      <div className="space-y-3">
        {nonEmpty.map((group) => (
          <GroupBlock key={group.id} group={group} />
        ))}
      </div>
    </PublicDetailSection>
  )
}
