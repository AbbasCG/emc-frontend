import { Copy } from 'lucide-react'
import { fetchPossibleDuplicates } from '@/services/ticketOpsService'
import { useAbortableResource } from '@/hooks/useAbortableResource'
import { StatusPill } from './TicketBadges'

/**
 * Recent tickets in the same department and category whose titles share most of their words. A hint
 * to look at, nothing more: no ticket is merged, linked or closed from here. Renders nothing when
 * there is nothing to suggest (and nothing while loading), so it never adds noise.
 */
export function TicketDuplicateHints({ ticketId, onOpen }: { ticketId: number; onOpen: (id: number) => void }) {
  const { data } = useAbortableResource((signal) => fetchPossibleDuplicates(ticketId, { signal }), `dup:${ticketId}`)
  if (!data || data.length === 0) return null

  return (
    <section aria-label="تذاكر مشابهة محتملة" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5" data-testid="duplicate-hints">
      <h4 className="flex items-center gap-1.5 text-[12px] font-black text-amber-900"><Copy size={13} aria-hidden="true" /> قد تكون مكررة</h4>
      <ul className="space-y-1.5">
        {data.map((d) => (
          <li key={d.id} className="rounded-xl bg-white px-3 py-2 ring-1 ring-amber-100">
            <button type="button" onClick={() => onOpen(d.id)} className="block w-full text-start" aria-label={`فتح التذكرة ${d.ticketNumber}`}>
              <span className="block font-mono text-[11px] font-black text-customBlue">{d.ticketNumber}</span>
              <span className="block truncate text-[12px] font-black text-deepBlue">{d.title}</span>
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <StatusPill status={d.status} />
              <span className="text-[11px] font-semibold text-deepBlue/50">تطابق {d.wordOverlapPercent}% في كلمات العنوان: {d.sharedWords.join('، ')}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] font-semibold text-amber-900/70">{data[0].basis} لا يُدمج شيء تلقائيًا.</p>
    </section>
  )
}
