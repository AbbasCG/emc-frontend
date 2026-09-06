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
      className="space-y-3 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_8px_30px_-12px_rgba(12,42,75,0.12)] backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange != null ?
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#0C2A4B]/35" />
            <input
              type="text"
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-xl border border-[#0C2A4B]/10 bg-[#f8fafc] pe-9 ps-3 text-[13px] font-semibold text-[#0C2A4B] outline-none ring-[#0077B6]/30 focus:ring-2"
            />
          </div>
        : null}
        {primary}
        {activeFilterCount > 0 ?
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#0C2A4B]/10 bg-white px-3 py-2 text-[12px] font-black text-[#0C2A4B]/55 transition hover:border-[#0077B6]/30 hover:text-[#0077B6]"
          >
            <X size={12} /> مسح ({fmtNum(activeFilterCount)})
          </button>
        : null}
        <span className="mr-auto text-[12px] font-bold text-[#0C2A4B]/45">
          {fmtNum(resultCount)} نتيجة{totalCount != null ? ` من ${fmtNum(totalCount)}` : ''}
        </span>
      </div>
      {secondary ?
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#0C2A4B]/6 pt-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#0C2A4B]/35">
            <Filter size={11} /> فلاتر
          </span>
          {secondary}
        </div>
      : null}
    </motion.div>
  )
}
