import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Calendar,
  ClipboardCheck,
  ExternalLink,
  FolderOpen,
  MoreHorizontal,
  User,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react'
import { Link } from 'react-router'
import type { ClassAssignmentStudent, ClassGroup } from '@/api/placementApi'
import { CEFR_MAP } from './instructorStudentFormats'
import { StudentsPreview } from './classes/StudentsPreview'
import { STATUS_AR, STATUS_BADGE, STATUS_DOT, WEEKDAYS_AR } from './classes/constants'
import { formatDate } from '@/utils/dateTime'

const CARD_ACTIONS = [
  { tab: 'students', label: 'الطلاب', icon: Users },
  { tab: 'sessions', label: 'الجلسات', icon: Calendar },
  { tab: 'attendance', label: 'الحضور', icon: UserCheck },
  { tab: 'assignments', label: 'الواجبات', icon: ClipboardCheck },
  { tab: 'materials', label: 'المواد', icon: FolderOpen },
  { tab: 'students', label: 'تحليلات', icon: BarChart3 },
] as const

type Props = {
  group: ClassGroup
  students: ClassAssignmentStudent[]
  instructorName?: string | null
  index: number
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onRemoveStudent: (userId: number, name: string) => void
}

function ClassCardInner({
  group: g,
  students,
  instructorName,
  index,
  onOpen,
  onEdit,
  onDelete,
  onRemoveStudent,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cefrInfo = g.level_code ? (CEFR_MAP[g.level_code] ?? null) : null
  const assignedStudents = students.filter((s) => s.is_assigned)
  const pct = g.capacity > 0 ? Math.round((g.enrolled / g.capacity) * 100) : 0
  const isFull = g.enrolled >= g.capacity
  const seatsLeft = Math.max(0, g.capacity - g.enrolled)
  const isDraft = g.status === 'draft'

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.28) }}
      whileHover={{ y: -3 }}
      className={`group flex flex-col overflow-hidden rounded-[16px] border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-[#0077B6]/25 hover:shadow-[0_16px_40px_-16px_rgba(0,119,182,0.28)] ${
        isDraft ? 'border-dashed border-slate-300' : 'border-[#0C2A4B]/[0.06]'
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col p-4 text-right"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {cefrInfo && (
                <span
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${cefrInfo.bg} ${cefrInfo.text}`}
                >
                  {cefrInfo.cefr}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_BADGE[g.status] ?? STATUS_BADGE.draft}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[g.status] ?? 'bg-slate-400'}`} />
                {STATUS_AR[g.status] ?? g.status}
              </span>
            </div>
            <h3 className="mt-2 line-clamp-2 text-[14px] font-bold leading-snug text-[#0C2A4B]">
              {g.name}
            </h3>
            {g.course_title && (
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">{g.course_title}</p>
            )}
          </div>

          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg p-1.5 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-[#F8FAFC] hover:text-[#0C2A4B]"
              aria-label="المزيد"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-[#0C2A4B]/10 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onEdit()
                    }}
                    className="block w-full px-3 py-2.5 text-right text-[11px] font-bold text-[#0C2A4B]/70 hover:bg-[#F8FAFC]"
                  >
                    تعديل الصف
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete()
                    }}
                    className="block w-full px-3 py-2.5 text-right text-[11px] font-bold text-red-600 hover:bg-red-50"
                  >
                    حذف الصف
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {instructorName && (
          <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
            <User className="h-3 w-3 shrink-0 text-[#0077B6]" />
            {instructorName}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500">
          {g.schedules.length > 0 ? (
            <>
              {g.schedules.slice(0, 2).map((s, i) => (
                <span key={s.id ?? i} className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#0077B6]/70" />
                  {WEEKDAYS_AR[s.day_of_week] ?? s.day_of_week}
                  <span dir="ltr"> · {s.start_time}–{s.end_time}</span>
                </span>
              ))}
              {g.schedules.length > 2 && (
                <span className="rounded-md bg-[#0077B6]/[0.08] px-1.5 py-0.5 font-bold text-[#0077B6]">
                  +{g.schedules.length - 2} مواعيد
                </span>
              )}
            </>
          ) : g.schedule_day ? (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[#0077B6]/70" />
              {WEEKDAYS_AR[g.schedule_day] ?? g.schedule_day}
              {g.schedule_time ? <span dir="ltr"> · {g.schedule_time}</span> : null}
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Video className="h-3 w-3 text-[#0077B6]/70" />
            {g.location_type === 'online' ? 'أونلاين' : g.location_type === 'in_person' ? 'حضوري' : 'هجين'}
          </span>
          {g.start_date && <span>{formatDate(g.start_date)}</span>}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold">
            <span className="text-[#0C2A4B]/60">السعة</span>
            <span className={isFull ? 'text-red-500' : 'text-[#0077B6]'}>
              {g.enrolled}/{g.capacity}
              {!isFull && ` · ${seatsLeft} متاح`}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className={`h-full rounded-full ${isFull ? 'bg-[#F28C00]' : 'bg-[#0077B6]'}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pct, 100)}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
        </div>

        {assignedStudents.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-[#0C2A4B]/[0.05] pt-3">
            <StudentsPreview students={assignedStudents} max={4} />
            <span className="text-[10px] font-bold text-slate-400">{assignedStudents.length} طالب</span>
          </div>
        )}
      </button>

      <div
        className="flex flex-wrap border-t border-[#0C2A4B]/[0.05] bg-[#F8FAFC]/50"
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          to={`/dashboard/instructor/classes/${g.id}/students`}
          className="flex min-w-[25%] flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-bold text-[#0C2A4B]/70 transition hover:bg-white hover:text-[#0077B6]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          فتح
        </Link>
        {CARD_ACTIONS.map(({ tab, label, icon: Icon }) => (
          <Link
            key={label}
            to={`/dashboard/instructor/classes/${g.id}/${tab}`}
            className="flex min-w-[25%] flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-bold text-[#0C2A4B]/60 transition hover:bg-white hover:text-[#0077B6]"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        ))}
      </div>

      {assignedStudents.slice(0, 2).map((s) => (
        <div
          key={s.student_id}
          className="hidden border-t border-[#0C2A4B]/[0.04] px-4 py-2 sm:flex sm:items-center sm:justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate text-[10px] font-semibold text-slate-500">{s.student_name}</span>
          <button
            type="button"
            onClick={() => onRemoveStudent(s.student_id, s.student_name)}
            className="rounded p-0.5 text-slate-300 hover:text-red-500"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </motion.article>
  )
}

export const ClassCard = memo(ClassCardInner)
