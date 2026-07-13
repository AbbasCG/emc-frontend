import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, HandCoins, Plus, RefreshCw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import FinanceDate from '@/components/finance/FinanceDate'
import { formatFinanceCount } from '@/utils/financeFormatters'
import { financeSectionBase } from '@/utils/financeNav'
import { FinanceSubnav } from '@/components/intelligence'


export default function ManualPaymentsHeader({
  totalCount,
  onRefresh,
  onCreate,
  refreshing,
  lastSync,
}: {
  totalCount: number
  onRefresh: () => void
  onCreate: () => void
  refreshing: boolean
  lastSync: Date | null
}) {
  const { pathname } = useLocation()
  const base = financeSectionBase(pathname)
  const reduce = useReducedMotion()
  const syncAt = lastSync

  return (
    <header dir="rtl">
      <FinanceSubnav />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        className="mt-8"
      >
        <nav aria-label="مسار التنقل" className="mb-3 flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#64748B]">
          <Link to={base} className="transition hover:text-[#2691C2]">
            لوحة المالية
          </Link>
          <ChevronLeft className="h-3.5 w-3.5 rotate-180 text-[#94A3B8]" aria-hidden />
          <span className="font-black text-[#22334A]">المدفوعات اليدوية</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <HandCoins className="h-6 w-6 text-[#2691C2]" aria-hidden />
              <h1 className="text-2xl font-black text-[#0F172A] sm:text-[1.65rem]">المدفوعات اليدوية</h1>
            </div>
            <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-relaxed text-[#64748B]">
              إضافة ومراجعة وتتبع المدفوعات التي تم تسجيلها يدوياً
            </p>
            <p className="mt-2 text-[11px] font-bold text-[#94A3B8]">
              إجمالي النتائج: {formatFinanceCount(totalCount)}
              {syncAt ? <> · آخر تحديث: <FinanceDate value={syncAt} showTime /></> : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="تحديث البيانات"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-4 text-[12px] font-black text-[#22334A] transition hover:border-[#2691C2]/35 hover:bg-[#F6F8FB] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 text-[#2691C2] ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              {refreshing ? 'جاري التحديث…' : 'تحديث'}
            </button>
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#EC943C] px-5 text-[12px] font-black text-white shadow-sm transition hover:bg-[#d97f28]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              إضافة دفعة يدوية
            </button>
          </div>
        </div>
      </motion.div>
    </header>
  )
}
