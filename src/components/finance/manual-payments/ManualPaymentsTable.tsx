import { useCallback, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Banknote, Check, Copy, Eye, Landmark } from 'lucide-react'
import type { ManualPayment } from '@/types/intelligence'
import { PAYMENT_METHOD_AR, paymentReference } from './constants'
import ManualPaymentStatusBadge, { EntityTypeBadge } from './ManualPaymentStatusBadge'
import FinanceDate from '@/components/finance/FinanceDate'
import { creatorName, formatPaymentAmount, shortPaymentRef, txInitials } from './formatters'

function CopyRefButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }, [text])

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); copy() }}
      aria-label="نسخ المرجع"
      title={text}
      className="rounded-lg p-1 text-[#94A3B8] transition hover:bg-[#F6F8FB] hover:text-[#2691C2]"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export default function ManualPaymentsTable({
  rows,
  onView,
}: {
  rows: ManualPayment[]
  onView: (row: ManualPayment) => void
}) {
  const reduce = useReducedMotion()
  const avatarColors = ['bg-[#2691C2]', 'bg-[#22334A]', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500']

  return (
    <div className="hidden overflow-x-auto md:block" dir="rtl">
      <table className="w-full min-w-[1100px] border-collapse text-right text-sm">
        <thead className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-white text-[10px] font-black uppercase tracking-wide text-[#94A3B8]">
          <tr>
            <th className="px-4 py-3">المرجع</th>
            <th className="px-4 py-3">المستخدم</th>
            <th className="px-4 py-3">العنصر المرتبط</th>
            <th className="px-4 py-3">المبلغ</th>
            <th className="px-4 py-3">طريقة الدفع</th>
            <th className="px-4 py-3">حساب المالية</th>
            <th className="px-4 py-3">الحالة</th>
            <th className="px-4 py-3">تاريخ الدفع</th>
            <th className="px-4 py-3">أُنشئت بواسطة</th>
            <th className="px-4 py-3">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const when = p.payment_date
            const created = p.created_at
            const ref = paymentReference(p)
            const bg = avatarColors[p.id % avatarColors.length]
            const methodLabel = p.payment_method ? (PAYMENT_METHOD_AR[p.payment_method] ?? p.payment_method) : '—'
            const registrar = creatorName(p)

            return (
              <motion.tr
                key={p.id}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i * 0.02, 0.28) }}
                onClick={() => onView(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onView(p)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`عرض تفاصيل الدفعة ${ref}`}
                className="cursor-pointer border-b border-[#F1F5F9] font-semibold transition-colors hover:bg-[#F6F8FB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2691C2]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[12px] font-black text-[#0F172A]" dir="ltr" title={ref}>
                      {shortPaymentRef(p)}
                    </span>
                    <CopyRefButton text={ref} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[10px] font-black text-white ${bg}`}>
                      {txInitials(p.student?.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-black text-[#0F172A]">{p.student?.name ?? '—'}</p>
                      <p className="truncate text-[11px] text-[#64748B]" dir="ltr">{p.student?.email ?? ''}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.purchasable ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <EntityTypeBadge type={p.purchasable.type} />
                      <span className="truncate text-[12px] text-[#0F172A]" title={p.purchasable.title}>{p.purchasable.title}</span>
                    </div>
                  ) : (
                    <span className="text-[#94A3B8]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-[13px] font-black tabular-nums text-[#0F172A]" dir="ltr">
                    {formatPaymentAmount(p)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[#64748B]">
                    <Banknote className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {methodLabel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[#64748B]">
                    <Landmark className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {p.account?.name ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ManualPaymentStatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3">
                  <FinanceDate value={when} />
                </td>
                <td className="px-4 py-3">
                  {registrar ? (
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#22334A]/10 text-[9px] font-black text-[#22334A]">
                        {txInitials(registrar)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-black text-[#0F172A]">{registrar}</p>
                        <FinanceDate value={created} showTime />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[12px] text-[#94A3B8]">—</p>
                      <FinanceDate value={created} showTime />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onView(p) }}
                    aria-label="عرض التفاصيل"
                    className="rounded-xl border border-[#E2E8F0] p-2 text-[#64748B] hover:bg-white hover:text-[#2691C2]"
                  >
                    <Eye className="h-4 w-4" />
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

export function MobileManualPaymentCard({
  payment: p,
  onView,
}: {
  payment: ManualPayment
  onView: (row: ManualPayment) => void
}) {
  const ref = paymentReference(p)
  const when = p.payment_date
  const methodLabel = p.payment_method ? (PAYMENT_METHOD_AR[p.payment_method] ?? p.payment_method) : '—'

  return (
    <article
      className="rounded-[16px] border border-[#E2E8F0] bg-white p-4 shadow-sm transition hover:border-[#2691C2]/30"
      dir="rtl"
    >
      <button type="button" onClick={() => onView(p)} className="w-full text-right">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-[12px] font-black text-[#0F172A]" dir="ltr">{ref}</p>
            <p className="mt-1 text-[13px] font-black text-[#0F172A]">{p.student?.name ?? '—'}</p>
            {p.purchasable && (
              <div className="mt-1 flex items-center gap-1.5">
                <EntityTypeBadge type={p.purchasable.type} />
                <span className="truncate text-[11px] text-[#64748B]">{p.purchasable.title}</span>
              </div>
            )}
          </div>
          <ManualPaymentStatusBadge status={p.status} />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[#F1F5F9] pt-3">
          <span className="font-mono text-[14px] font-black text-[#0F172A]" dir="ltr">{formatPaymentAmount(p)}</span>
          <div className="text-left">
            <p className="text-[10px] text-[#64748B]">{methodLabel}</p>
            <FinanceDate value={when} />
          </div>
        </div>
      </button>
    </article>
  )
}
