import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Award,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Mic,
} from 'lucide-react'
import type { ClassAssignmentStudent, ClassGroup } from '@/api/placementApi'
import { CEFR_MAP } from './InstructorStudentDrawer'

function waitingLabel(student: ClassAssignmentStudent): string | null {
  if (student.is_assigned) return null
  const pct = student.percentage
  if (pct != null && pct >= 85) return 'أولوية عالية'
  if (student.final_level || student.written_level) return 'جاهز للتعيين'
  return 'بانتظار التقييم'
}

export function StudentQueueCard({
  student: s,
  groups,
  assigning,
  onAssign,
  priority = false,
}: {
  student: ClassAssignmentStudent
  groups: ClassGroup[]
  assigning: number | null
  onAssign: (groupId: number) => void
  priority?: boolean
}) {
  const [showAssign, setShowAssign] = useState(false)
  const cefrInfo = s.final_level
    ? (CEFR_MAP[s.final_level] ?? null)
    : s.written_level
      ? (CEFR_MAP[s.written_level] ?? null)
      : null

  const recommended = groups.filter(
    (g) => g.level_code === (s.final_level ?? s.written_level) && g.enrolled < g.capacity,
  )
  const waitBadge = waitingLabel(s)

  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-[16px] border p-3.5 transition-all duration-200 ${
        s.is_assigned
          ? 'border-emerald-200/80 bg-emerald-50/50'
          : priority
            ? 'border-[#F28C00]/40 bg-white shadow-[0_4px_16px_-8px_rgba(242,140,0,0.35)]'
            : 'border-[#0C2A4B]/[0.06] bg-white hover:border-[#0077B6]/25 hover:shadow-sm'
      }`}
    >
      {priority && !s.is_assigned && (
        <span className="absolute right-0 top-3 bottom-3 w-0.5 rounded-full bg-[#F28C00]" aria-hidden />
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-bl from-[#0C2A4B] to-[#0077B6] text-[13px] font-bold text-white shadow-sm">
          {s.avatar_url ? (
            <img src={s.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            s.student_name.charAt(0)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold text-[#0C2A4B]">{s.student_name}</p>
          <p className="truncate text-[10px] font-medium text-slate-400" dir="ltr">
            {s.student_email}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {cefrInfo && (
            <span className={`rounded-lg px-2 py-0.5 text-[9px] font-bold ${cefrInfo.bg} ${cefrInfo.text}`}>
              {cefrInfo.cefr}
            </span>
          )}
          {waitBadge && !s.is_assigned && (
            <span className="flex items-center gap-0.5 rounded-lg bg-[#F28C00]/10 px-2 py-0.5 text-[9px] font-bold text-[#F28C00]">
              <Clock className="h-2.5 w-2.5" />
              {waitBadge}
            </span>
          )}
          {s.is_assigned && (
            <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
              معيَّن
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {s.written_score != null && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-100">
            <ClipboardCheck className="h-3 w-3" />
            {s.written_score}/{s.total_questions ?? 70}
          </span>
        )}
        {s.oral_score != null && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700 ring-1 ring-violet-100">
            <Mic className="h-3 w-3" />
            {s.oral_score}/100
          </span>
        )}
        {s.final_level && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-800 ring-1 ring-amber-100">
            <Award className="h-3 w-3" />
            {s.final_level}
          </span>
        )}
      </div>

      {!s.is_assigned && groups.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAssign((v) => !v)}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#0077B6]/20 bg-[#0077B6]/[0.06] py-2 text-[10px] font-bold text-[#0077B6] transition hover:bg-[#0077B6]/10"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          تعيين إلى صف
        </button>
      )}

      <AnimatePresence>
        {showAssign && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5 border-t border-[#0C2A4B]/[0.05] pt-2">
              {recommended.length > 0 && (
                <p className="text-[9px] font-bold text-slate-400">مجموعات مقترحة</p>
              )}
              {(recommended.length > 0 ? recommended : groups).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  disabled={assigning === g.id || g.enrolled >= g.capacity}
                  onClick={() => {
                    onAssign(g.id)
                    setShowAssign(false)
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-[#0C2A4B]/10 bg-[#F8FAFC] px-3 py-2 text-[10px] font-semibold text-[#0C2A4B] transition hover:border-[#0077B6]/30 hover:bg-white disabled:opacity-50"
                >
                  <span className="font-bold">{g.name}</span>
                  <span className={g.enrolled >= g.capacity ? 'text-red-400' : 'text-slate-400'}>
                    {g.enrolled}/{g.capacity}
                    {g.level_code ? ` · ${g.level_code}` : ''}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
