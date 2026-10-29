import { ChevronLeft } from 'lucide-react'
import type { ReconciliationCase } from '@/api/paymentReconciliationsApi'
import FinanceDate from '@/components/finance/FinanceDate'
import { formatMoney } from '@/utils/financeFormatters'
import ReconciliationBadges from './ReconciliationBadges'
import { PROGRAM_TYPE_LABEL, REASON_LABEL } from './reconciliationLabels'

type Props = {
  rows: ReconciliationCase[]
  onOpen: (item: ReconciliationCase) => void
}

const amountOf = (c: ReconciliationCase) => (c.payment ? formatMoney(c.payment.amount, c.payment.currency) : '—')
const label = (c: ReconciliationCase) => `حالة تسوية ${c.id} — ${c.user?.name ?? ''} — ${c.program?.title ?? ''}`

/** A table from `xl` up (the sidebar leaves a laptop too little room for seven columns), cards below it: the same facts, the same one action (open the case). */
export default function ReconciliationList({ rows, onOpen }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[860px] text-right" data-testid="reconciliation-table">
          <caption className="sr-only">حالات تسوية المدفوعات</caption>
          <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">المستخدم</th>
              <th scope="col" className="px-4 py-3">البرنامج</th>
              <th scope="col" className="px-4 py-3">المبلغ والمرجع</th>
              <th scope="col" className="px-4 py-3">السبب</th>
              <th scope="col" className="px-4 py-3">تاريخ الإنشاء</th>
              <th scope="col" className="px-4 py-3">الحالة</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">إجراء</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-deepBlue/[0.05] text-xs font-bold text-deepBlue">
            {rows.map((c) => (
              <tr key={c.id} data-testid="case-row" className="align-top hover:bg-brand-50/40">
                <td className="px-4 py-3">
                  {c.user?.name ?? '—'}
                  <span className="block font-semibold text-slate-500" dir="ltr">{c.user?.email}</span>
                </td>
                <td className="px-4 py-3">
                  {c.program?.title ?? '—'}
                  {c.program && <span className="block font-semibold text-slate-500">{PROGRAM_TYPE_LABEL[c.program.type]}</span>}
                </td>
                <td className="px-4 py-3">
                  <span dir="ltr" className="font-black">{amountOf(c)}</span>
                  <span className="block font-mono text-[10px] font-semibold text-slate-500" dir="ltr">{c.invoice?.number ?? c.payment?.provider_reference ?? ''}</span>
                </td>
                <td className="px-4 py-3">{REASON_LABEL[c.reason] ?? c.reason}</td>
                <td className="px-4 py-3"><FinanceDate value={c.created_at} showTime /></td>
                <td className="px-4 py-3"><ReconciliationBadges item={c} /></td>
                <td className="px-4 py-3 text-end">
                  <button type="button" onClick={() => onOpen(c)} aria-label={`عرض ${label(c)}`} className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[11px] font-black text-customBlue ring-1 ring-customBlue/30 hover:bg-brand-50">
                    عرض
                    <ChevronLeft size={13} aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-deepBlue/[0.05] xl:hidden" data-testid="reconciliation-cards">
        {rows.map((c) => (
          <li key={c.id} className="space-y-2 p-4" data-testid="case-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-deepBlue">{c.user?.name ?? '—'}</p>
                <p className="break-words text-[11px] font-semibold text-slate-500" dir="ltr">{c.user?.email}</p>
              </div>
              <span dir="ltr" className="shrink-0 text-sm font-black text-deepBlue">{amountOf(c)}</span>
            </div>
            <p className="text-xs font-bold text-deepBlue">{c.program?.title ?? '—'}</p>
            <p className="text-[11px] font-semibold text-slate-500">{REASON_LABEL[c.reason] ?? c.reason}</p>
            <div className="flex items-center justify-between gap-3">
              <ReconciliationBadges item={c} />
              <button type="button" onClick={() => onOpen(c)} aria-label={`عرض ${label(c)}`} className="inline-flex h-11 min-w-[5.5rem] items-center justify-center gap-1 rounded-xl px-4 text-xs font-black text-customBlue ring-1 ring-customBlue/30">
                عرض
                <ChevronLeft size={13} aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
