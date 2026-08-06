import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PER_PAGE_OPTIONS } from './constants'
import { formatEnglishCount } from '@/utils/formatEnglishNumber'

type Props = {
  page: number
  lastPage: number
  perPage: number
  total: number
  from: number | null
  to: number | null
  onPageChange: (page: number) => void
  onPerPageChange: (n: number) => void
}

export default function AuditLogsPagination({
  page, lastPage, perPage, total, from, to, onPageChange, onPerPageChange,
}: Props) {
  const safePage = Math.min(Math.max(1, page), Math.max(1, lastPage))
  const rangeFrom = from ?? (total === 0 ? 0 : (safePage - 1) * perPage + 1)
  const rangeTo = to ?? Math.min(safePage * perPage, total)

  const pageButtons = Array.from({ length: lastPage }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === lastPage || Math.abs(p - safePage) <= 1)
    .reduce<(number | '…')[]>((acc, p, i, arr) => {
      if (i > 0 && (arr[i - 1] as number) !== p - 1) acc.push('…')
      acc.push(p)
      return acc
    }, [])

  if (total === 0) return null

  return (
    <div
      dir="rtl"
      className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white/95 px-5 py-4 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center gap-2.5 text-[12px] text-slate-500">
        <span className="font-semibold text-slate-600">عرض</span>
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-[#22334A] outline-none focus:border-[#2691C2]/50 focus:ring-2 focus:ring-[#2691C2]/12"
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="rounded-full bg-[#22334A]/5 px-3 py-1 font-black text-[#22334A]">
          {formatEnglishCount(rangeFrom)}–{formatEnglishCount(rangeTo)} من {formatEnglishCount(total)} سجل
        </span>
        <span className="text-muted-400">الصفحة {formatEnglishCount(safePage)} من {formatEnglishCount(lastPage)}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <button type="button" disabled={safePage <= 1} onClick={() => onPageChange(1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-[#2691C2]/40 hover:text-[#2691C2] disabled:cursor-not-allowed disabled:opacity-30" aria-label="الأولى">
          <ChevronsRight className="h-4 w-4" />
        </button>
        <button type="button" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-[#2691C2]/40 hover:text-[#2691C2] disabled:cursor-not-allowed disabled:opacity-30" aria-label="السابقة">
          <ChevronRight className="h-4 w-4" />
        </button>
        {pageButtons.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="w-6 text-center text-[12px] text-slate-300">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p as number)}
              className={cn(
                'flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl border px-2 text-[12px] font-black tabular-nums transition',
                safePage === p
                  ? 'border-[#2691C2] bg-[#2691C2] text-white shadow-md shadow-[#2691C2]/25'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#2691C2]/40 hover:text-[#2691C2]',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" disabled={safePage >= lastPage} onClick={() => onPageChange(safePage + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-[#2691C2]/40 hover:text-[#2691C2] disabled:cursor-not-allowed disabled:opacity-30" aria-label="التالية">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" disabled={safePage >= lastPage} onClick={() => onPageChange(lastPage)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-[#2691C2]/40 hover:text-[#2691C2] disabled:cursor-not-allowed disabled:opacity-30" aria-label="الأخيرة">
          <ChevronsLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
