import type { ReactNode } from 'react'
import { Filter, Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { fmtNum } from '@/components/lms/lmsFormatters'

type Props = {
  search?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  activeFilterCount: number
  resultCount: number
  totalCount?: number
  onReset: () => void
  primary?: ReactNode
  secondary?: ReactNode
}

export function LmsFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'بحث…',
  activeFilterCount,
  resultCount,
  totalCount,
  onReset,
  primary,
  secondary,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_8px_30px_-12px_rgba(34,51,74,0.12)] backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange != null ?
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#22334A]/35" />
            <input
              type="text"
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-xl border border-[#22334A]/10 bg-[#f8fafc] pe-9 ps-3 text-[13px] font-semibold text-[#22334A] outline-none ring-[#2691C2]/30 focus:ring-2"
            />
          </div>
        : null}
        {primary}
        {activeFilterCount > 0 ?
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#22334A]/10 bg-white px-3 py-2 text-[12px] font-black text-[#22334A]/55 transition hover:border-[#2691C2]/30 hover:text-[#2691C2]"
          >
            <X size={12} /> مسح ({fmtNum(activeFilterCount)})
          </button>
        : null}
        <span className="mr-auto text-[12px] font-bold text-[#22334A]/45">
          {fmtNum(resultCount)} نتيجة{totalCount != null ? ` من ${fmtNum(totalCount)}` : ''}
        </span>
      </div>
      {secondary ?
        <div className="flex flex-wrap items-center gap-2 border-t border-[#22334A]/6 pt-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#22334A]/35">
            <Filter size={11} /> فلاتر
          </span>
          {secondary}
        </div>
      : null}
    </motion.div>
  )
}

export function lmsSelectClass() {
  return 'h-10 rounded-xl border border-[#22334A]/10 bg-[#f8fafc] px-3 text-[13px] font-bold text-[#22334A] outline-none focus:ring-2 focus:ring-[#2691C2]/25'
}

export function countActiveFilters(values: unknown[]): number {
  return values.filter((v) => v !== '' && v != null && v !== false).length
}
