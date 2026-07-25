import { motion } from 'framer-motion'
import { Calendar, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import type { OpsMeeting } from '@/types/operations'
import { MEETING_TYPE_AR } from '@/data/operationsLabels'

export default function MeetingCard({ m }: { m: OpsMeeting }) {
  const cls =
    m.status === 'completed'
      ? 'bg-slate-50 text-slate-600'
      : m.status === 'live'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-sky-50 text-customBlue'

  return (
    <motion.article
      layout
      className="rounded-2xl border border-deepBlue/[0.06] bg-white p-5 shadow-sm ring-1 ring-deepBlue/[0.04]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-1 text-[10px] font-black ring-1 ring-black/5 ${cls}`}>
          {m.status === 'scheduled'
            ? 'مجدول'
            : m.status === 'live'
              ? 'مباشر'
              : m.status === 'completed'
                ? 'منتهي'
                : 'ملغى'}
        </span>
        <span className="text-[11px] font-black text-customOrange">{MEETING_TYPE_AR[m.type]}</span>
      </div>
      <h3 className="mt-3 text-right text-base font-black text-deepBlue">{m.title}</h3>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-3 text-[11px] font-bold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Calendar size={13} />
          {m.starts_at ?? '—'}
        </span>
        <span>{m.department_name ?? '—'}</span>
        <span>منظم: {m.organizer_name ?? '—'}</span>
      </div>
      <Link
        to={`/dashboard/admin/meetings/${m.id}`}
        className="mt-4 flex items-center justify-end gap-1 text-xs font-black text-customBlue hover:text-customOrange"
      >
        التفاصيل
        <ChevronLeft size={14} />
      </Link>
    </motion.article>
  )
}
