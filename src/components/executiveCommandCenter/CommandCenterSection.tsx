import type { CommandCenterSection as Section } from '@/api/executiveCommandCenterApi'
import { cn } from '@/lib/utils'
import { CommandCenterItemCard } from './CommandCenterItemCard'
import { SECTION_META } from './commandCenterUi'

/** One of the four feed cards. `visibleItems` is the already-searched subset to show. */
export function CommandCenterSection({
  section,
  visibleItems,
  searching,
  className,
}: {
  section: Section
  visibleItems: Section['items']
  searching: boolean
  className?: string
}) {
  const meta = SECTION_META[section.key]
  const Icon = meta.icon
  const hidden = Math.max(0, section.total - section.items.length)

  return (
    <section
      aria-label={section.title}
      data-testid={`section-${section.key}`}
      className={cn('rounded-3xl border border-deepBlue/[0.07] bg-slate-50/60 p-4 sm:p-5', className)}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-black text-deepBlue">
          <Icon size={17} className={meta.tone} aria-hidden="true" /> {section.title}
        </h3>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-black text-deepBlue/70 ring-1 ring-deepBlue/10">{section.total}</span>
      </header>

      {visibleItems.length === 0 ?
        <p className="rounded-2xl border border-dashed border-deepBlue/15 bg-white/70 p-5 text-center text-xs font-bold text-deepBlue/55">
          {searching ? 'لا توجد نتائج مطابقة للبحث.' : meta.empty}
        </p>
      : <ul className="space-y-2.5">
          {visibleItems.map((item) => (
            <CommandCenterItemCard key={item.id} item={item} upcoming={section.key === 'upcoming'} />
          ))}
        </ul>}

      {!searching && hidden > 0 ?
        <p className="mt-3 text-center text-[11px] font-bold text-deepBlue/50">يُعرض {section.items.length} من {section.total}. ضيّق النتائج بالمصدر لرؤية الباقي.</p>
      : null}
    </section>
  )
}
