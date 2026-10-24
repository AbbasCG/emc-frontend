import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZES } from '@/utils/ticketFilters'

/** Server-side paging. The page is never past the last page; the page size is one of the allowed sizes. */
export function TicketPagination({
  page,
  lastPage,
  total,
  perPage,
  loading,
  onPage,
  onPerPage,
}: {
  page: number
  lastPage: number
  total: number
  perPage: number
  loading: boolean
  onPage: (p: number) => void
  onPerPage: (n: number) => void
}) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(total, page * perPage)
  const btn = 'inline-flex items-center gap-1 rounded-xl border border-deepBlue/10 bg-white px-3.5 py-2 text-[12px] font-black text-deepBlue transition hover:border-customBlue/40 disabled:cursor-not-allowed disabled:opacity-45'

  return (
    <nav aria-label="التنقل بين الصفحات" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[12px] font-bold text-deepBlue/60" data-testid="page-range">
        {total === 0 ? 'لا نتائج' : `${from.toLocaleString('en-US')}–${to.toLocaleString('en-US')} من ${total.toLocaleString('en-US')}`}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1 || loading} className={btn}>
          <ChevronRight size={14} aria-hidden="true" /> السابق
        </button>
        <span className="min-w-24 text-center text-[12px] font-black text-deepBlue/70">صفحة {page} من {lastPage}</span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= lastPage || loading} className={btn}>
          التالي <ChevronLeft size={14} aria-hidden="true" />
        </button>
      </div>
      <label className="flex items-center gap-2 text-[12px] font-bold text-deepBlue/60">
        عدد الصفوف
        <select value={perPage} onChange={(e) => onPerPage(Number(e.target.value))} className="rounded-lg border border-deepBlue/10 bg-white px-2 py-1.5 text-[12px] font-black text-deepBlue" aria-label="عدد الصفوف في الصفحة">
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
    </nav>
  )
}
