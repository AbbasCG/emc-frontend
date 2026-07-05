import { AnimatePresence, motion } from 'framer-motion'
import { Eye } from 'lucide-react'
import type { FinancialRequest, FinancialRequestStatus } from '@/api/financialRequestsApi'
import { STATUS_LABELS, STATUS_COLORS, TYPE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/api/financialRequestsApi'

interface Props {
  requests: FinancialRequest[]
  onSelect: (req: FinancialRequest) => void
}

export default function FinancialRequestsTable({ requests, onSelect }: Props) {
  if (requests.length === 0) {
    return (
      <div className="py-20 text-center text-deepBlue/40">
        <p className="text-lg font-bold">لا توجد طلبات</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100">
      <table className="min-w-full text-sm" dir="rtl">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400">العنوان</th>
            <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400">القسم</th>
            <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400">النوع</th>
            <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400">المبلغ</th>
            <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400">الأولوية</th>
            <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400">الحالة</th>
            <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400">تاريخ الإنشاء</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 bg-white">
          <AnimatePresence initial={false}>
            {requests.map((req, i) => (
              <motion.tr
                key={req.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => onSelect(req)}
              >
                <td className="px-4 py-3">
                  <p className="font-bold text-deepBlue line-clamp-1 max-w-[200px]">{req.title}</p>
                  {req.requester && <p className="text-[11px] text-deepBlue/40">{req.requester.name}</p>}
                </td>
                <td className="px-4 py-3 text-deepBlue/70">{req.department?.name ?? '—'}</td>
                <td className="px-4 py-3 text-deepBlue/70">{TYPE_LABELS[req.request_type as keyof typeof TYPE_LABELS]}</td>
                <td className="px-4 py-3 font-bold text-deepBlue">
                  {Number(req.amount).toLocaleString('en-US')} <span className="text-[11px] font-normal text-deepBlue/50">{req.currency}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${PRIORITY_COLORS[req.priority as keyof typeof PRIORITY_COLORS]}`}>
                    {PRIORITY_LABELS[req.priority as keyof typeof PRIORITY_LABELS]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_COLORS[req.status as FinancialRequestStatus]}`}>
                    {STATUS_LABELS[req.status as FinancialRequestStatus]}
                  </span>
                </td>
                <td className="px-4 py-3 text-[12px] text-deepBlue/50">
                  {new Date(req.created_at).toLocaleDateString('ar-SA')}
                </td>
                <td className="px-4 py-3">
                  <button className="flex size-8 items-center justify-center rounded-full hover:bg-blue-50 text-customBlue">
                    <Eye size={15} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}
