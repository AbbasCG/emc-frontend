import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type CourseDetailTabId =
  | 'overview'
  | 'curriculum'
  | 'requirements'
  | 'instructor'
  | 'schedule'
  | 'reviews'
  | 'faq'

type TabDef = {
  id: CourseDetailTabId
  label: string
  hidden?: boolean
}

type Props = {
  tabs: TabDef[]
  panels: Record<CourseDetailTabId, ReactNode>
  defaultTab?: CourseDetailTabId
}

export default function CourseDetailTabs({ tabs, panels, defaultTab = 'overview' }: Props) {
  const visible = useMemo(() => tabs.filter((t) => !t.hidden), [tabs])
  const [active, setActive] = useState<CourseDetailTabId>(defaultTab)

  const current = visible.some((t) => t.id === active) ? active : visible[0]?.id ?? 'overview'

  const focusTab = useCallback(
    (id: CourseDetailTabId) => {
      setActive(id)
      requestAnimationFrame(() => {
        document.getElementById(`course-tab-btn-${id}`)?.focus()
      })
    },
    [],
  )

  const onTabKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (e.key === 'Home') {
        e.preventDefault()
        focusTab(visible[0].id)
        return
      }
      if (e.key === 'End') {
        e.preventDefault()
        focusTab(visible[visible.length - 1].id)
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const next = visible[(index + 1) % visible.length]
        focusTab(next.id)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const prev = visible[(index - 1 + visible.length) % visible.length]
        focusTab(prev.id)
      }
    },
    [focusTab, visible],
  )

  useEffect(() => {
    if (!visible.some((t) => t.id === active) && visible[0]) {
      setActive(visible[0].id)
    }
  }, [active, visible])

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/80 shadow-[0_20px_50px_-24px_rgba(34,51,74,0.15)] backdrop-blur-xl">
      <div className="sticky top-[calc(4.25rem+0.5rem)] z-10 border-b border-[#22334A]/6 bg-white/90 backdrop-blur-xl">
        <div
          role="tablist"
          aria-label="أقسام الدورة"
          aria-orientation="horizontal"
          className="flex gap-1 overflow-x-auto p-2 scrollbar-hide"
        >
          {visible.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={current === tab.id}
              aria-controls={`course-tab-${tab.id}`}
              id={`course-tab-btn-${tab.id}`}
              tabIndex={current === tab.id ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => onTabKeyDown(e, index)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-black transition-all duration-200',
                current === tab.id ?
                  'bg-gradient-to-l from-[#2691C2] to-[#1e7aa8] text-white shadow-[0_6px_18px_-6px_rgba(38,145,194,0.55)]'
                : 'text-[#22334A]/65 hover:bg-[#2691C2]/5 hover:text-[#22334A]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <div
          id={`course-tab-${current}`}
          role="tabpanel"
          aria-labelledby={`course-tab-btn-${current}`}
          tabIndex={0}
        >
          {panels[current]}
        </div>
      </div>
    </section>
  )
}
