import { motion } from 'framer-motion'
import type { FinancialTransaction } from '@/types/intelligence'
import TransactionStatusBadge from './TransactionStatusBadge'
import FinanceDate from '@/components/finance/FinanceDate'
import { formatTxAmount, shortTxId } from './formatters'

export default function MobileTransactionCard({
  row,
  onView,
}: {
  row: FinancialTransaction
  onView: (row: FinancialTransaction) => void
}) {
  const when = row.occurred_at || row.created_at
  return (
    <motion.button
      type="button"
      layout
      onClick={() => onView(row)}
      className="w-full rounded-[18px] border border-[#E2E8F0] bg-white p-4 text-right shadow-sm transition hover:border-[#0077B6]/25 hover:shadow-md md:hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-black text-[#64748B]" dir="ltr">{shortTxId(row.id)}</p>
          <p className="mt-1 text-[13px] font-black text-[#0F172A]">{row.user?.name || '—'}</p>
          <p className="text-[11px] font-semibold text-[#94A3B8]" dir="ltr">{row.user?.email || ''}</p>
        </div>
        <TransactionStatusBadge status={row.status} type={row.type} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#F1F5F9] pt-3">
        <span className="font-mono text-[15px] font-black tabular-nums whitespace-nowrap text-[#0F172A]" dir="ltr">
          {formatTxAmount(row.amount, row.currency)}
        </span>
        <FinanceDate value={when} showTime />
      </div>
    </motion.button>
  )
}
