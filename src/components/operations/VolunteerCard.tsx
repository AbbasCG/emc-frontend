import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { OpsVolunteer } from '@/types/operations'
import { VOLUNTEER_STATUS_AR } from '@/data/operationsLabels'

export default function VolunteerCard({ v }: { v: OpsVolunteer }) {
  return (
    <motion.article
      layout
      className="rounded-2xl border border-deepBlue/[0.06] bg-white p-5 shadow-sm ring-1 ring-deepBlue/[0.04]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-black text-customBlue ring-1 ring-sky-100">
          {VOLUNTEER_STATUS_AR[v.status]}
        </span>
        <h3 className="text-base font-black text-deepBlue">{v.name}</h3>
      </div>
      <p className="mt-2 text-[11px] font-bold text-slate-500">{v.department_name ?? 'بدون إدارة'}</p>
      {v.skills && (
        <div className="mt-3 flex flex-wrap justify-end gap-1">
          {v.skills.map((s) => (
            <span key={s} className="rounded-md bg-deepBlue/[0.04] px-2 py-0.5 text-[10px] font-black text-deepBlue/70">
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 text-[11px] font-bold text-slate-400">
        التفرغ: {v.availability ?? '—'} · الساعات: {v.hours_logged ?? 0}
      </div>
      <Link
        to={`/dashboard/admin/volunteers/${v.id}`}
        className="mt-4 flex items-center justify-end gap-1 text-xs font-black text-customOrange hover:underline"
      >
        الملف
        <ChevronLeft size={14} />
      </Link>
    </motion.article>
  )
}
