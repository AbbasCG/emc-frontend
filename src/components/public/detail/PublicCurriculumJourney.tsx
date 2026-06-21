import PublicDetailSection from '@/components/public/detail/PublicDetailSection'
import type { CurriculumGroup } from '@/components/public/detail/PublicCurriculumSection'

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

export default function PublicCurriculumJourney({
  title = 'رحلة التعلم',
  groups,
}: {
  title?: string
  groups: CurriculumGroup[]
}) {
  const nonEmpty = groups
    .map((g) => ({ ...g, items: uniqItems(g.items) }))
    .filter((g) => g.items.length > 0)

  if (nonEmpty.length === 0) return null

  return (
    <PublicDetailSection id="curriculum" title={title}>
      <div className="space-y-8">
        {nonEmpty.map((group) => (
          <div key={group.id}>
            <h3 className="mb-4 text-sm font-black text-customBlue">{group.title}</h3>
            <ol className="relative space-y-0 border-s-2 border-[#0077B6]/20 ps-6">
              {group.items.map((item, step) => (
                <li key={`${group.id}-${item}`} className="relative pb-6 last:pb-0">
                  <span
                    className="absolute -start-[1.65rem] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-customBlue text-xs font-black text-white shadow-md shadow-customBlue/25"
                    aria-hidden
                  >
                    {step + 1}
                  </span>
                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-right shadow-sm ring-1 ring-slate-100/80">
                    <p className="text-sm font-bold leading-7 text-deepBlue">{item}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </PublicDetailSection>
  )
}
