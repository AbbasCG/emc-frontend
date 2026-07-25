import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, Download, RefreshCw } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { financeSectionBase } from '@/utils/financeNav'
import { FinanceSubnav } from '@/components/intelligence'

import FinanceDate from '@/components/finance/FinanceDate'

export default function TransactionsHeader({
  onExport,
  onRefresh,
  refreshing,
  lastSync,
  exportDisabled,
}: {
  onExport: () => void
  onRefresh: () => void
  refreshing: boolean
  lastSync: Date | null
  exportDisabled: boolean
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
          <Link to={base} className="transition hover:text-[#0077B6]">
            لوحة المالية
          </Link>
          <ChevronLeft className="h-3.5 w-3.5 rotate-180 text-[#94A3B8]" aria-hidden />
          <span className="font-black text-[#0C2A4B]">المعاملات المالية</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="text-right">
            <h1 className="text-2xl font-black text-[#0F172A] sm:text-[1.65rem]">المعاملات المالية</h1>
            <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-relaxed text-[#64748B]">
              إدارة ومتابعة جميع الحركات المالية والمدفوعات داخل المنصة
            </p>
            {syncAt && (
              <p className="mt-2 text-[11px] font-bold text-[#94A3B8]">
                آخر تحديث: <FinanceDate value={syncAt} showTime />
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onExport}
              disabled={exportDisabled}
              aria-label="تصدير المعاملات"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-4 text-[12px] font-black text-[#0C2A4B] transition hover:border-[#0077B6]/35 hover:bg-[#F6F8FB] disabled:opacity-45"
            >
              <Download className="h-4 w-4 text-[#0077B6]" aria-hidden />
              تصدير
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="تحديث البيانات"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#0C2A4B] px-4 text-[12px] font-black text-white transition hover:bg-[#1a2940] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              {refreshing ? 'جاري التحديث…' : 'تحديث'}
            </button>
          </div>
        </div>
      </motion.div>
    </header>
  )
}
