import type { TicketTab, TicketTabCounts } from '@/types/ticketOps'
import { cn } from '@/lib/utils'
import { TAB_LABELS, TICKET_TABS } from '@/utils/ticketFilters'

/**
 * «مفتوحة / جميع التذاكر / تم حلها / تحتاج إجراءً منك»: the queue's tabs, above the filter bar, in the same pill style as the
 * quick filters. They are plain toggle buttons (`aria-pressed`) in a labelled group: no tab panel exists to point at, so
 * the ARIA tab pattern would promise keyboard behaviour that is not there.
 * The server applies the tab before paging and answers with the count of every tab under the SAME search and
 * filters, so each badge equals what its tab would list. `counts` is null until the first answer (no badge, never a fake 0).
 */
export function TicketTabs({ value, counts, onChange }: { value: TicketTab; counts: TicketTabCounts | null; onChange: (tab: TicketTab) => void }) {
  return (
    <div role="group" aria-label="تبويبات التذاكر" data-testid="ticket-tabs" className="flex flex-wrap items-center gap-2">
      {TICKET_TABS.map((tab) => {
        const on = value === tab

        return (
          <button
            key={tab}
            type="button"
            aria-pressed={on}
            data-tab={tab}
            onClick={() => {
              if (!on) onChange(tab)
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40',
              on ? 'border-customBlue bg-customBlue text-white' : 'border-deepBlue/10 bg-white text-deepBlue/70 hover:border-customBlue/40',
            )}
          >
            {TAB_LABELS[tab]}
            {counts ?
              <span data-testid={`tab-count-${tab}`} className={cn('grid min-w-5 place-items-center rounded-full px-1.5 text-[10px] tabular-nums', on ? 'bg-white/25 text-white' : 'bg-deepBlue/[0.07] text-deepBlue/70')}>
                {counts[tab].toLocaleString('en-US')}
              </span>
            : null}
          </button>
        )
      })}
    </div>
  )
}
