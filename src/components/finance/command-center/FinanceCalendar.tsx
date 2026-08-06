import { motion } from 'framer-motion'
import { Calendar, Clock } from 'lucide-react'
import FinanceDate from '@/components/finance/FinanceDate'
import { formatFinanceCurrencyInteger } from '@/utils/financeFormatters'
import { SectionShell } from './shared'
import type { FinanceCalendarItem } from './types'

const TYPE_LABEL: Record<FinanceCalendarItem['type'], string> = {
  invoice: 'فاتورة',
  payment: 'دفع',
  salary: 'رواتب',
  subscription: 'اشتراك',
  deadline: 'موعد نهائي',
}

const TYPE_COLOR: Record<FinanceCalendarItem['type'], string> = {
  invoice: 'bg-violet-100 text-violet-700',
  payment: 'bg-emerald-100 text-emerald-700',
  salary: 'bg-amber-100 text-amber-700',
  subscription: 'bg-sky-100 text-sky-700',
  deadline: 'bg-rose-100 text-rose-700',
}


export default function FinanceCalendar({ items }: { items: FinanceCalendarItem[] }) {
  return (
    <SectionShell
      eyebrow="التقويم"
      title="التقويم المالي"
      subtitle="فواتير ومدفوعات ومواعيد قادمة"
    >
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-3 transition hover:border-brand-200 hover:bg-white"
            >
              <div className="flex items-center gap-2 text-left">
                {item.amount !== undefined && (
                  <span className="font-latin text-[12px] font-black tabular-nums text-deepBlue" dir="ltr">
                    {formatFinanceCurrencyInteger(item.amount)}
                  </span>
                )}
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${TYPE_COLOR[item.type]}`}>
                  {TYPE_LABEL[item.type]}
                </span>
              </div>
              <div className="min-w-0 text-right">
                <p className="truncate text-[13px] font-black text-deepBlue">{item.title}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  <Clock size={10} />
                  <FinanceDate value={item.date} />
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Calendar size={14} />
              </div>
            </motion.li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Calendar size={32} className="text-slate-300" />
          <p className="text-sm font-black text-slate-400">لا توجد مواعيد مالية قادمة</p>
          <p className="text-[11px] font-semibold text-slate-400">ستظهر الفواتير والمدفوعات المجدولة هنا</p>
        </div>
      )}
    </SectionShell>
  )
}
