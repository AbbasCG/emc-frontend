import { HandCoins, Plus, RotateCcw } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

export default function ManualPaymentsEmptyState({
  hasFilters,
  onReset,
  onCreate,
}: {
  hasFilters: boolean
  onReset: () => void
  onCreate?: () => void
}) {
  const reduce = useReducedMotion()

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center" dir="rtl">
        <p className="text-[15px] font-black text-[#0F172A]">لا توجد نتائج مطابقة للفلاتر الحالية</p>
        <p className="mt-2 max-w-md text-[13px] font-semibold text-[#64748B]">جرّب تعديل معايير البحث أو إعادة تعيين الفلاتر.</p>
        <button
          type="button"
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-2.5 text-[12px] font-black text-[#22334A]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          إعادة تعيين الفلاتر
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center px-6 py-16 text-center"
      dir="rtl"
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="grid h-14 w-14 place-items-center rounded-2xl bg-[#2691C2]/10 text-[#2691C2]"
      >
        <HandCoins className="h-7 w-7" aria-hidden />
      </motion.div>
      <p className="mt-5 text-[15px] font-black text-[#0F172A]">لا توجد مدفوعات يدوية</p>
      <p className="mt-2 max-w-md text-[13px] font-semibold text-[#64748B]">لم يتم تسجيل أي مدفوعات يدوية حتى الآن.</p>
      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#EC943C] px-5 py-2.5 text-[12px] font-black text-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          إضافة دفعة يدوية
        </button>
      )}
    </motion.div>
  )
}
