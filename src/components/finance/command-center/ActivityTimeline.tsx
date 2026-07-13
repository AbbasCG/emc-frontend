import { motion } from 'framer-motion'
import {
  ArrowLeftRight,
  CreditCard,
  FileText,
  RefreshCw,
  User,
  Webhook,
} from 'lucide-react'
import FinanceDate from '@/components/finance/FinanceDate'
import { formatFinanceCurrencyInteger } from '@/utils/financeFormatters'
import PaymentStatusBadge from '@/components/intelligence/PaymentStatusBadge'
import { providerLabelAr } from './chartConfig'
import { SectionShell } from './shared'
import type { FinanceActivityItem } from './types'
import type { PaymentStatus } from '@/types/intelligence'

const TYPE_ICON: Record<FinanceActivityItem['type'], React.ElementType> = {
  payment: CreditCard,
  invoice: FileText,
  refund: RefreshCw,
  manual: User,
  transfer: ArrowLeftRight,
  expense: CreditCard,
  webhook: Webhook,
}

export default function ActivityTimeline({ items }: { items: FinanceActivityItem[] }) {
  return (
    <SectionShell
      eyebrow="النشاط"
      title="آخر العمليات المالية"
      subtitle="مدفوعات، فواتير، استردادات، وتحويلات"
    >
      {items.length > 0 ? (
        <ul className="relative space-y-0">
          <div
            aria-hidden
            className="absolute right-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-brand-200 via-slate-200 to-transparent"
          />
          {items.map((item, i) => {
            const Icon = TYPE_ICON[item.type]
            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="relative flex gap-4 py-3 pr-0"
              >
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-2 ring-slate-100">
                  <Icon size={16} className="text-brand-600" />
                </div>
                <div className="min-w-0 flex-1 border-b border-slate-50 pb-3 text-right">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="text-left">
                      {item.amount !== null && (
                        <p className="font-latin text-sm font-black tabular-nums whitespace-nowrap text-deepBlue" dir="ltr">
                          {formatFinanceCurrencyInteger(item.amount)}
                        </p>
                      )}
                      <p className="text-[10px] font-semibold text-slate-400 whitespace-nowrap tabular-nums" dir="ltr">
                        <FinanceDate value={item.timestamp} showTime />
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-deepBlue">{item.title}</p>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{item.subtitle}</p>
                      <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2">
                        {item.provider && (
                          <span className="text-[10px] font-bold text-slate-400">
                            {providerLabelAr(item.provider)}
                          </span>
                        )}
                        {item.course && (
                          <span className="max-w-[140px] truncate text-[10px] font-bold text-brand-600">
                            {item.course}
                          </span>
                        )}
                        <PaymentStatusBadge status={item.status as PaymentStatus} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </ul>
      ) : (
        <div className="py-10 text-center">
          <p className="text-sm font-black text-slate-400">لا يوجد نشاط مالي حديث</p>
        </div>
      )}
    </SectionShell>
  )
}
