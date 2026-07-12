import { motion, useReducedMotion } from 'framer-motion'
import { Receipt, RotateCcw } from 'lucide-react'

export default function TransactionsEmptyState({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean
  onReset: () => void
}) {
  const reduce = useReducedMotion()
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center" dir="rtl">
      <motion.div
        animate={reduce ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F6F8FB] text-[#64748B] ring-1 ring-[#E2E8F0]"
      >
        <Receipt className="h-7 w-7" aria-hidden />
      </motion.div>
      <h2 className="mt-4 text-base font-black text-[#0F172A]">لا توجد معاملات مالية</h2>
      <p className="mt-2 max-w-md text-[13px] font-semibold text-[#64748B]">
        {hasFilters
          ? 'لا توجد نتائج مطابقة لمعايير التصفية الحالية. جرّب توسيع الفترة أو إعادة تعيين الفلاتر.'
          : 'لم تُسجَّل أي معاملات مالية في الفترة المحددة بعد.'}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-2.5 text-[12px] font-black text-[#22334A] transition hover:border-[#2691C2]/40"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          إعادة تعيين الفلاتر
        </button>
      )}
    </div>
  )
}
