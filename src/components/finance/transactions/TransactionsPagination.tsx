import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZE } from './constants'

export default function TransactionsPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (p: number) => void
}) {
  if (totalItems <= PAGE_SIZE) return null

  return (
    <div
      dir="rtl"
      className="flex flex-col gap-3 border-t border-[#E2E8F0] bg-[#F6F8FB]/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-[11px] font-bold text-[#64748B]">
        عرض {Math.min((page - 1) * PAGE_SIZE + 1, totalItems).toLocaleString('ar')}–
        {Math.min(page * PAGE_SIZE, totalItems).toLocaleString('ar')} من {totalItems.toLocaleString('ar')}
      </p>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="الصفحة السابقة"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        <span className="min-w-[4.5rem] text-center text-[12px] font-black text-[#22334A]">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="الصفحة التالية"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
