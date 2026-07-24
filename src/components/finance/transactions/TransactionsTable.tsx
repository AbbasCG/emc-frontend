import { useCallback, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BookOpen, Check, Copy, Eye, FileText, Landmark } from 'lucide-react'
import type { FinancialTransaction } from '@/types/intelligence'
import TransactionStatusBadge, { TransactionTypeBadge } from './TransactionStatusBadge'
import FinanceDate from '@/components/finance/FinanceDate'
import { formatTxAmount, shortTxId, txInitials } from './formatters'

function CopyIdButton({ id }: { id: number }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(String(id)).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }, [id])

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); copy() }}
      aria-label="نسخ رقم المعاملة"
      title={String(id)}
      className="rounded-lg p-1 text-[#94A3B8] transition hover:bg-[#F6F8FB] hover:text-[#0077B6]"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function SourceIcon({ type }: { type: string }) {
  const Icon = type === 'expense' ? Landmark : type === 'adjustment' ? FileText : BookOpen
  return <Icon className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" aria-hidden />
}

export default function TransactionsTable({
  rows,
  onView,
}: {
  rows: FinancialTransaction[]
  onView: (row: FinancialTransaction) => void
}) {
  const reduce = useReducedMotion()
  const avatarColors = ['bg-[#0077B6]', 'bg-[#0C2A4B]', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500']

  return (
    <div className="hidden overflow-x-auto md:block" dir="rtl">
      <table className="w-full min-w-[960px] border-collapse text-right text-sm">
        <thead className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-white text-[10px] font-black uppercase tracking-wide text-[#94A3B8]">
          <tr>
            <th className="px-4 py-3">المعاملة</th>
            <th className="px-4 py-3">المستخدم</th>
            <th className="px-4 py-3">البيان</th>
            <th className="px-4 py-3">المبلغ</th>
            <th className="px-4 py-3">النوع</th>
            <th className="px-4 py-3">الحالة</th>
            <th className="px-4 py-3">التاريخ</th>
            <th className="px-4 py-3">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
            const when = t.occurred_at || t.created_at
            const bg = avatarColors[t.id % avatarColors.length]
            return (
              <motion.tr
                key={t.id}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i * 0.02, 0.28) }}
                onClick={() => onView(t)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onView(t)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`عرض تفاصيل المعاملة ${t.id}`}
                className="cursor-pointer border-b border-[#F1F5F9] font-semibold transition-colors hover:bg-[#F6F8FB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0077B6]"
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-1.5" dir="ltr">
                    <span className="font-mono text-[12px] font-black tabular-nums text-[#64748B]" title={String(t.id)}>
                      {shortTxId(t.id)}
                    </span>
                    <CopyIdButton id={t.id} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-black text-white ${bg}`}>
                      {txInitials(t.user?.name)}
                    </span>
                    <div className="min-w-0 text-right">
                      <p className="truncate text-[12px] font-black text-[#0F172A]">{t.user?.name?.trim() || '—'}</p>
                      <p className="truncate text-[10px] font-semibold text-[#94A3B8]" dir="ltr">
                        {t.user?.email || '—'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="max-w-[220px] px-4 py-3">
                  <div className="flex items-start gap-2">
                    <SourceIcon type={t.type} />
                    <p className="line-clamp-2 text-[11px] font-semibold text-[#64748B]">
                      {t.description?.trim() || '—'}
                    </p>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`font-mono text-[13px] font-black tabular-nums whitespace-nowrap ${
                      t.type === 'revenue' ? 'text-[#0F172A]' : 'text-[#64748B]'
                    }`}
                    dir="ltr"
                  >
                    {formatTxAmount(t.amount, t.currency)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <TransactionTypeBadge type={t.type} />
                </td>
                <td className="px-4 py-3">
                  <TransactionStatusBadge status={t.status} type={t.type} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className="text-[11px] font-bold text-[#64748B] whitespace-nowrap tabular-nums"
                    dir="ltr"
                  >
                    <FinanceDate value={when} showTime />
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onView(t) }}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[10px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/5"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    تفاصيل
                  </button>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
