import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, CalendarCheck, ExternalLink, GraduationCap, Mail, UserCheck, Users, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchClassGroupStudents, type ClassAssignmentStudent, type ClassGroup } from '@/api/placementApi'
import { CEFR_MAP } from '@/components/instructor/InstructorStudentDrawer'
import { formatDate } from '@/utils/dateTime'

const WEEKDAYS_AR: Record<string, string> = {
  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت',
}

const STATUS_AR: Record<string, string> = {
  draft: 'مسودة', ready: 'جاهزة', active: 'نشطة', completed: 'مكتملة', archived: 'مؤرشفة',
}

type Props = {
  group: ClassGroup | null
  onClose: () => void
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('') || '?'
}

export function InstructorClassDrawer({ group, onClose }: Props) {
  const [students, setStudents] = useState<ClassAssignmentStudent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!group) { setStudents([]); return }
    let alive = true
    setLoading(true)
    fetchClassGroupStudents(group.id)
      .then((list) => { if (alive) setStudents(list) })
      .catch(() => { if (alive) setStudents([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [group?.id])

  const cefrInfo = group?.level_code ? (CEFR_MAP[group.level_code] ?? null) : null

  return (
    <AnimatePresence>
      {group && (
        <motion.div
          key="class-drawer-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-hidden"
          dir="rtl"
        >
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm" onClick={onClose} />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 42 }}
            className="absolute inset-y-0 left-0 flex w-full max-w-[520px] flex-col overflow-hidden bg-white shadow-[0_0_80px_-10px_rgba(15,23,42,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-100 bg-gradient-to-l from-[#22334A] to-[#2691C2] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60">تفاصيل الصف</p>
                  <h2 className="mt-1 text-xl font-black">{group.name}</h2>
                  {group.course_title ?
                    <p className="mt-1 truncate text-[12px] font-semibold text-white/75">{group.course_title}</p>
                  : null}
                </div>
                <button type="button" onClick={onClose} className="rounded-xl bg-white/15 p-2 hover:bg-white/25">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {cefrInfo && (
                  <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${cefrInfo.bg} ${cefrInfo.text}`}>
                    {cefrInfo.cefr} · {cefrInfo.arabic}
                  </span>
                )}
                <span className="rounded-xl bg-white/15 px-2.5 py-1 text-[10px] font-black">
                  {STATUS_AR[group.status] ?? group.status}
                </span>
                <span className="rounded-xl bg-white/15 px-2.5 py-1 text-[10px] font-black">
                  {group.enrolled}/{group.capacity} طالب
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Calendar, label: 'تاريخ البدء', value: group.start_date ? formatDate(group.start_date) : '—' },
                  { icon: CalendarCheck, label: 'الجدول', value: [group.schedule_day ? WEEKDAYS_AR[group.schedule_day] ?? group.schedule_day : null, group.schedule_time].filter(Boolean).join(' · ') || '—' },
                  { icon: GraduationCap, label: 'نوع الحصة', value: group.location_type === 'online' ? 'أونلاين' : group.location_type === 'in_person' ? 'حضوري' : 'هجين' },
                  { icon: Users, label: 'السعة', value: `${group.enrolled} من ${group.capacity}` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-deepBlue/45">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </div>
                    <p className="mt-1 text-[12px] font-black text-deepBlue">{value}</p>
                  </div>
                ))}
              </div>

              {group.meeting_link && (
                <a
                  href={group.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2691C2]/10 px-3 py-2 text-[11px] font-black text-[#2691C2]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  رابط الاجتماع
                </a>
              )}

              <div className="mt-6">
                <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-deepBlue/40">
                  الطلاب المعيّنون ({students.length})
                </p>
                {loading ?
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}
                  </div>
                : students.length === 0 ?
                  <p className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-[12px] font-semibold text-deepBlue/40">
                    لا يوجد طلاب معيّنون في هذا الصف بعد
                  </p>
                : (
                  <div className="space-y-2">
                    {students.map((s) => {
                      const lvl = s.final_level ?? s.written_level
                      const lvlInfo = lvl ? (CEFR_MAP[lvl] ?? null) : null
                      return (
                        <div key={s.student_id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-bl from-[#22334A] to-[#2691C2] text-[11px] font-black text-white">
                            {s.avatar_url ?
                              <img src={s.avatar_url} alt="" className="h-full w-full object-cover" />
                            : initials(s.student_name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-black text-deepBlue">{s.student_name}</p>
                            <p className="flex items-center gap-1 truncate text-[10px] font-semibold text-slate-500" dir="ltr">
                              <Mail className="h-3 w-3 shrink-0" />
                              {s.student_email || '—'}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {lvlInfo && (
                              <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black ${lvlInfo.bg} ${lvlInfo.text}`}>
                                {lvlInfo.cefr}
                              </span>
                            )}
                            {s.written_score != null && (
                              <span className="text-[9px] font-bold text-emerald-600">
                                {s.written_score}/{s.total_questions ?? 70}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4">
              <div className="grid grid-cols-3 gap-2">
                <Link
                  to="/dashboard/instructor/attendance"
                  className="flex flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-3 text-[10px] font-black text-deepBlue transition hover:border-[#2691C2]/30"
                >
                  <UserCheck className="h-4 w-4 text-[#2691C2]" />
                  الحضور
                </Link>
                <Link
                  to={`/dashboard/instructor/courses/${group.course_id}/students`}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-3 text-[10px] font-black text-deepBlue transition hover:border-[#2691C2]/30"
                >
                  <Users className="h-4 w-4 text-[#2691C2]" />
                  الطلاب
                </Link>
                <Link
                  to="/dashboard/instructor/sessions"
                  className="flex flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-3 text-[10px] font-black text-deepBlue transition hover:border-[#2691C2]/30"
                >
                  <CalendarCheck className="h-4 w-4 text-[#2691C2]" />
                  الجلسات
                </Link>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
