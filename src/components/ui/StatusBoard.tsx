import { useId, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

/**
 * The layout every status board in the dashboard shares (tasks kanban, the agile board, «مهامي ومسؤولياتي», the
 * ticket board). It exists so none of them clip their columns or scroll the page sideways:
 *
 *  - Wide (above 768px): the columns are a CSS grid that WRAPS onto more rows to fit the width, each column at
 *    least `minColumn` wide. No horizontal scrolling, nothing cut off.
 *  - Narrow (768px and below): ONE column at a time, chosen with a segmented control (tabs) that lists every
 *    status with its count, so every state stays reachable without a clipped strip.
 *
 * Columns with no items still render (every state stays reachable, and an empty state is information).
 */

export interface StatusBoardColumn {
  key: string
  label: string
  count: number
  children: ReactNode
  /** Shown instead of the cards when the column is empty. */
  emptyText?: string
  /** Extra props for the column element on wide screens (drag-and-drop handlers, a highlight). */
  columnProps?: HTMLAttributes<HTMLElement>
  className?: string
}

export const NARROW_BOARD_QUERY = '(max-width: 768px)'

export default function StatusBoard({
  columns,
  ariaLabel,
  minColumn = '15.5rem',
  testId = 'status-board',
  emptyText = 'لا عناصر هنا',
}: {
  columns: StatusBoardColumn[]
  ariaLabel: string
  minColumn?: string
  testId?: string
  emptyText?: string
}) {
  const narrow = useMediaQuery(NARROW_BOARD_QUERY, false)
  const uid = useId()
  const [picked, setPicked] = useState<string | null>(null)
  const firstWithItems = columns.find((c) => c.count > 0)
  // The tab shown before the user chooses one is the first that had something in it, and it STAYS: accepting the
  // last card of that tab must not throw the user onto another column.
  const [sticky, setSticky] = useState<string | null>(null)
  if (sticky === null && firstWithItems) setSticky(firstWithItems.key)
  const active = columns.find((c) => c.key === (picked ?? sticky)) ?? firstWithItems ?? columns[0]

  const body = (c: StatusBoardColumn) =>
    c.count === 0 ?
      <p className="rounded-xl border border-dashed border-deepBlue/15 px-3 py-6 text-center text-xs font-bold text-deepBlue/40">{c.emptyText ?? emptyText}</p>
    : c.children

  if (narrow) {
    const move = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      // RTL: the first tab is on the right, so ArrowLeft moves to the NEXT one.
      const target =
        e.key === 'Home' ? 0
        : e.key === 'End' ? columns.length - 1
        : e.key === 'ArrowLeft' ? (index + 1) % columns.length
        : e.key === 'ArrowRight' ? (index - 1 + columns.length) % columns.length
        : -1
      if (target < 0) return
      e.preventDefault()
      const next = columns[target]
      setPicked(next.key)
      document.getElementById(`${uid}-tab-${next.key}`)?.focus()
    }

    return (
      <div dir="rtl" data-testid={testId} data-layout="tabs" className="min-w-0 space-y-3">
        <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap gap-1.5 rounded-2xl bg-deepBlue/[0.05] p-1.5">
          {columns.map((c, i) => {
            const on = c.key === active?.key

            return (
              <button
                key={c.key}
                id={`${uid}-tab-${c.key}`}
                type="button"
                role="tab"
                aria-selected={on}
                // Only the selected tab has a panel in the DOM, so only it may point at one.
                aria-controls={on ? `${uid}-panel` : undefined}
                tabIndex={on ? 0 : -1}
                onClick={() => setPicked(c.key)}
                onKeyDown={(e) => move(e, i)}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-black transition',
                  on ? 'bg-white text-customBlue shadow-sm ring-1 ring-customBlue/20' : 'text-deepBlue/65 hover:bg-white/60',
                )}
              >
                <span>{c.label}</span>
                <span className={cn('grid min-w-5 place-items-center rounded-full px-1.5 text-[10px] ring-1', on ? 'bg-customBlue/10 ring-customBlue/20' : 'bg-white ring-deepBlue/10')} data-testid="tab-count">
                  {c.count}
                </span>
              </button>
            )
          })}
        </div>
        {active ?
          <section id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${active.key}`} data-status={active.key} className={cn('min-w-0 space-y-2.5', active.className)}>
            {body(active)}
          </section>
        : null}
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      role="group"
      aria-label={ariaLabel}
      data-testid={testId}
      data-layout="grid"
      className="grid min-w-0 gap-4"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumn}), 1fr))` }}
    >
      {columns.map((c) => (
        <section
          key={c.key}
          aria-label={`${c.label}: ${c.count}`}
          data-status={c.key}
          {...c.columnProps}
          className={cn('flex min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-slate-50/60', c.columnProps?.className, c.className)}
        >
          <header className="flex items-center justify-between gap-2 border-b border-slate-200/70 p-3">
            <h3 className="min-w-0 truncate text-xs font-black text-deepBlue">{c.label}</h3>
            <span className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-black text-slate-500 shadow-sm ring-1 ring-slate-200/60" data-testid="column-count">
              {c.count}
            </span>
          </header>
          <div className="max-h-[72vh] min-h-24 flex-1 space-y-2.5 overflow-y-auto p-3">{body(c)}</div>
        </section>
      ))}
    </div>
  )
}
