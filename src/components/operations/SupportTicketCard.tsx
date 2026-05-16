import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { SupportTicket } from '@/types/operations'
import { SUPPORT_STATUS_AR } from '@/data/operationsLabels'

export default function SupportTicketCard({ t }: { t: SupportTicket }) {
  const location = useLocation()
  const detailBase = location.pathname.startsWith('/dashboard/support')
    ? '/dashboard/support'
    : '/dashboard/admin/support-tickets'

  return (
    <motion.article layout className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-deepBlue/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-deepBlue/[0.06] px-2 py-1 text-[10px] font-black text-deepBlue">
          {SUPPORT_STATUS_AR[t.status]}
        </span>
        <span className="text-[10px] font-bold text-slate-400">{t.updated_at ?? ''}</span>
      </div>
      <h3 className="mt-3 text-right text-sm font-black text-deepBlue">{t.subject}</h3>
      <div className="mt-2 flex flex-wrap justify-end gap-2 text-[11px] font-bold text-slate-500">
        <span>{t.type ?? 'عام'}</span>
        <span>{t.priority ?? '—'}</span>
        <span>{t.requester_name ?? '—'}</span>
      </div>
      <Link
        to={`${detailBase}/${t.id}`}
        className="mt-4 flex items-center justify-end gap-1 text-xs font-black text-customBlue"
      >
        فتح التذكرة
        <ChevronLeft size={14} />
      </Link>
    </motion.article>
  )
}
