import { motion } from 'framer-motion'
import { Building2, ChevronLeft, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { WorkspaceDepartment } from '@/types/operations'
import DepartmentHealthBadge from './DepartmentHealthBadge'

export default function DepartmentCard({
  d,
  listPathPrefix = '/dashboard/admin/departments',
}: {
  d: WorkspaceDepartment
  /** List section path without trailing id (e.g. `/dashboard/department` for dept managers). */
  listPathPrefix?: string
}) {
  return (
    <motion.article
      layout
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-white/90 bg-white p-5 shadow-[0_18px_46px_-22px_rgba(34,51,74,0.35)] ring-1 ring-deepBlue/[0.05]"
    >
      <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-customBlue/[0.06] blur-3xl transition-opacity group-hover:opacity-100" />
      <div className="relative flex flex-col gap-4 text-right">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-deepBlue/[0.04] px-2 py-1">
            <Building2 size={18} className="text-customBlue" />
            <DepartmentHealthBadge health={d.status} />
          </div>
          {d.health_score != null && (
            <span className="text-2xl font-black text-deepBlue">{d.health_score}</span>
          )}
        </div>
        <div>
          <h3 className="text-lg font-black text-deepBlue">{d.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-500">
            {d.description ?? '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 text-[11px] font-bold text-slate-500">
          <span>القائد: {d.leader_name ?? '—'}</span>
          <span className="inline-flex items-center gap-1">
            <Users size={13} className="text-customOrange" />
            {d.members_count} أعضاء
          </span>
          <span>{d.open_tasks} مهام مفتوحة</span>
          <span>{d.meetings_week ?? 0} اجتماعات أسبوعياً</span>
        </div>
        <Link
          to={`${listPathPrefix}/${d.id}`}
          className="inline-flex items-center justify-end gap-1 text-xs font-black text-customBlue hover:text-customOrange"
        >
          لوحة الإدارة
          <ChevronLeft size={14} />
        </Link>
      </div>
    </motion.article>
  )
}
