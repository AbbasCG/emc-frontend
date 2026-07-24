import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  BookOpen,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  ExternalLink,
  FolderOpen,
  Loader2,
  Monitor,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  fetchClassGroupDetail,
  fetchClassGroupSessions,
  fetchClassGroupStudents,
  type ClassAssignmentStudent,
  type ClassGroup,
  type ClassGroupDetail,
  type ClassGroupSessionRow,
} from '@/api/placementApi'
import { CEFR_MAP } from '@/components/instructor/InstructorStudentDrawer'
import { StudentsPreview } from '@/components/instructor/classes/StudentsPreview'
import { STATUS_AR, STATUS_BADGE, WEEKDAYS_AR } from '@/components/instructor/classes/constants'
import { formatDate, formatDateTime } from '@/utils/dateTime'

type DrawerTab = 'overview' | 'students' | 'sessions' | 'attendance' | 'assignments' | 'materials' | 'analytics'

const TABS: Array<{ id: DrawerTab; label: string; icon: typeof Users }> = [
  { id: 'overview', label: 'نظرة عامة', icon: Monitor },
  { id: 'students', label: 'الطلاب', icon: Users },
  { id: 'sessions', label: 'الجلسات', icon: Calendar },
  { id: 'attendance', label: 'الحضور', icon: UserCheck },
  { id: 'assignments', label: 'الواجبات', icon: ClipboardCheck },
  { id: 'materials', label: 'المواد', icon: FolderOpen },
  { id: 'analytics', label: 'تحليلات', icon: BarChart3 },
]

type Props = {
  group: ClassGroup | null
  onClose: () => void
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('') || '?'
}

function OverviewTab({ detail, group }: { detail: ClassGroupDetail | null; group: ClassGroup }) {
  const pct = group.capacity > 0 ? Math.round((group.enrolled / group.capacity) * 100) : 0
  const cefr = group.level_code ? (CEFR_MAP[group.level_code] ?? null) : null

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white p-4">
          <p className="text-[10px] font-semibold text-slate-400">حالة الصف</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_BADGE[group.status] ?? ''}`}>
              {STATUS_AR[group.status] ?? group.status}
            </span>
          </div>
          {cefr && (
            <p className="mt-2 text-[12px] font-bold text-[#0C2A4B]">
              {cefr.cefr} · {cefr.arabic}
            </p>
          )}
        </div>
        <div className="rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white p-4">
          <p className="text-[10px] font-semibold text-slate-400">استيعاب الصف</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[#0C2A4B]">{pct}%</p>
          <p className="text-[11px] font-medium text-slate-500">
            {group.enrolled} مسجّل · الحد {group.capacity}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#0077B6]" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
      </div>

      {(group.schedules.length > 0 || group.schedule_day) && (
        <div className="rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12px] font-bold text-[#0C2A4B]">الجدول الأسبوعي</p>
          </div>
          <div className="space-y-2">
            {(group.schedules.length > 0
              ? group.schedules
              : group.schedule_day
                ? [{ day_of_week: group.schedule_day, start_time: group.schedule_time ?? '', end_time: '' }]
                : []
            ).map((s, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0077B6]/10 text-[12px] font-bold text-[#0077B6]">
                  {(WEEKDAYS_AR[s.day_of_week] ?? s.day_of_week).charAt(0)}
                </span>
                <div>
                  <p className="text-[12px] font-bold text-[#0C2A4B]">
                    {WEEKDAYS_AR[s.day_of_week] ?? s.day_of_week}
                  </p>
                  {s.start_time && (
                    <p className="text-[11px] font-medium text-slate-500" dir="ltr">
                      {s.start_time}{s.end_time ? `–${s.end_time}` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail && (
        <div className="overflow-hidden rounded-[16px] bg-gradient-to-l from-[#0C2A4B] to-[#0077B6] p-5 text-white shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">ملخص الصف</p>
          <p className="mt-2 text-[15px] font-bold">{detail.course?.title ?? group.course_title ?? '—'}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <p className="text-white/60">الجلسات</p>
              <p className="font-bold">{detail.counts.sessions}</p>
            </div>
            <div>
              <p className="text-white/60">الواجبات</p>
              <p className="font-bold">{detail.counts.assignments}</p>
            </div>
            <div>
              <p className="text-white/60">المواد</p>
              <p className="font-bold">{detail.counts.materials}</p>
            </div>
            <div>
              <p className="text-white/60">سجلات الحضور</p>
              <p className="font-bold">{detail.counts.attendance_records}</p>
            </div>
          </div>
          {group.meeting_link && (
            <a
              href={group.meeting_link}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-[#0C2A4B] transition hover:bg-white/95"
            >
              <ExternalLink className="h-4 w-4" />
              دخول القاعة
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function StudentsTabContent({
  students,
  loading,
}: {
  students: ClassAssignmentStudent[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-[16px] bg-slate-100" />
        ))}
      </div>
    )
  }
  if (!students.length) {
    return (
      <p className="rounded-[16px] border border-dashed border-slate-200 py-10 text-center text-[12px] font-semibold text-slate-400">
        لا يوجد طلاب معيّنون
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {students.slice(0, 8).map((s) => {
        const lvl = s.final_level ?? s.written_level
        const info = lvl ? (CEFR_MAP[lvl] ?? null) : null
        return (
          <div
            key={s.student_id}
            className="flex items-center gap-3 rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white p-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-bl from-[#0C2A4B] to-[#0077B6] text-[10px] font-bold text-white">
              {s.avatar_url ? (
                <img src={s.avatar_url} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                initials(s.student_name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold text-[#0C2A4B]">{s.student_name}</p>
              <p className="truncate text-[10px] text-slate-400">
                {s.student_email}
              </p>
            </div>
            {info && (
              <span className={`rounded-lg px-2 py-0.5 text-[9px] font-bold ${info.bg} ${info.text}`}>
                {info.cefr}
              </span>
            )}
          </div>
        )
      })}
      {students.length > 8 && (
        <p className="text-center text-[10px] font-bold text-slate-400">+{students.length - 8} طالب آخر</p>
      )}
    </div>
  )
}

function SessionsTabContent({ sessions, loading }: { sessions: ClassGroupSessionRow[]; loading: boolean }) {
  if (loading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#0077B6]" />
  if (!sessions.length) {
    return (
      <p className="py-8 text-center text-[12px] font-semibold text-slate-400">لا توجد جلسات مجدولة</p>
    )
  }
  return (
    <div className="space-y-2">
      {sessions.slice(0, 6).map((s) => (
        <div key={s.id} className="rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white p-3">
          <p className="text-[12px] font-bold text-[#0C2A4B]">{s.title}</p>
          <p className="mt-1 text-[10px] text-slate-400">
            {s.starts_at ? formatDateTime(s.starts_at) : s.session_date ? formatDate(s.session_date) : '—'}
          </p>
        </div>
      ))}
    </div>
  )
}

function ClassPreviewDrawerInner({ group, onClose }: Props) {
  const [tab, setTab] = useState<DrawerTab>('overview')
  const [detail, setDetail] = useState<ClassGroupDetail | null>(null)
  const [students, setStudents] = useState<ClassAssignmentStudent[]>([])
  const [sessions, setSessions] = useState<ClassGroupSessionRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!group) return
    setTab('overview')
    let alive = true
    setLoading(true)
    Promise.all([
      fetchClassGroupDetail(group.id),
      fetchClassGroupStudents(group.id),
      fetchClassGroupSessions(group.id),
    ])
      .then(([d, st, ses]) => {
        if (!alive) return
        setDetail(d)
        setStudents(st)
        setSessions(ses)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [group?.id])

  useEffect(() => {
    if (!group) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [group, onClose])

  if (!group) return null

  const cefrInfo = group.level_code ? (CEFR_MAP[group.level_code] ?? null) : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-hidden"
      dir="rtl"
    >
      <div className="absolute inset-0 bg-[#0F172A]/55 backdrop-blur-[3px]" onClick={onClose} />

      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 38 }}
        className="absolute inset-y-0 left-0 flex w-full max-w-[520px] flex-col overflow-hidden bg-[#F8FAFC] shadow-[0_0_80px_-10px_rgba(15,23,42,0.5)] sm:max-w-[560px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 shrink-0 bg-gradient-to-l from-[#0077B6] via-[#0C2A4B] to-[#F28C00]" />

        <header className="shrink-0 border-b border-[#0C2A4B]/[0.06] bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#0C2A4B] text-white">
              <Monitor className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {cefrInfo && (
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${cefrInfo.bg} ${cefrInfo.text}`}>
                    {cefrInfo.cefr}
                  </span>
                )}
                <span className="rounded-lg bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200/80">
                  #{group.id}
                </span>
              </div>
              <h2 className="mt-1 text-[17px] font-bold leading-tight text-[#0C2A4B]">{group.name}</h2>
              {group.course_title && (
                <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{group.course_title}</p>
              )}
              {group.start_date && (
                <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-slate-400">
                  <CalendarCheck className="h-3 w-3" />
                  {formatDate(group.start_date)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#0C2A4B]/10 bg-[#F8FAFC] text-slate-500 hover:text-[#0C2A4B]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-bold transition ${
                  tab === id
                    ? 'border-[#0077B6] text-[#0077B6]'
                    : 'border-transparent text-slate-400 hover:text-[#0C2A4B]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
          {tab === 'overview' && <OverviewTab detail={detail} group={group} />}
          {tab === 'students' && <StudentsTabContent students={students} loading={loading} />}
          {tab === 'sessions' && <SessionsTabContent sessions={sessions} loading={loading} />}
          {tab === 'attendance' && (
            <p className="py-6 text-center text-[12px] font-semibold text-slate-400">
              <Link
                to={`/dashboard/instructor/classes/${group.id}/attendance`}
                className="font-bold text-[#0077B6] hover:underline"
              >
                فتح سجل الحضور الكامل
              </Link>
            </p>
          )}
          {tab === 'assignments' && (
            <div className="text-center">
              <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-[12px] font-semibold text-slate-500">
                {detail?.counts.assignments ?? 0} واجب
              </p>
              <Link
                to={`/dashboard/instructor/classes/${group.id}/assignments`}
                className="mt-3 inline-flex rounded-xl bg-[#0C2A4B] px-4 py-2 text-[11px] font-bold text-white"
              >
                إدارة الواجبات
              </Link>
            </div>
          )}
          {tab === 'materials' && (
            <div className="text-center">
              <FolderOpen className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-[12px] font-semibold text-slate-500">
                {detail?.counts.materials ?? 0} مادة
              </p>
              <Link
                to={`/dashboard/instructor/classes/${group.id}/materials`}
                className="mt-3 inline-flex rounded-xl bg-[#0C2A4B] px-4 py-2 text-[11px] font-bold text-white"
              >
                إدارة المواد
              </Link>
            </div>
          )}
          {tab === 'analytics' && detail && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'الطلاب', value: detail.counts.students },
                { label: 'الجلسات', value: detail.counts.sessions },
                { label: 'الحضور', value: detail.counts.attendance_records },
                { label: 'الواجبات', value: detail.counts.assignments },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white p-4 text-center"
                >
                  <p className="text-[20px] font-bold tabular-nums text-[#0C2A4B]">{value}</p>
                  <p className="text-[10px] font-semibold text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-[#0C2A4B]/[0.06] bg-white px-5 py-4">
          <div className="mb-3">
            <StudentsPreview students={students} max={5} size="md" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/dashboard/instructor/classes/${group.id}/students`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0C2A4B] px-4 py-2.5 text-[12px] font-bold text-white transition hover:bg-[#0077B6]"
            >
              فتح مساحة الصف
            </Link>
            {group.meeting_link && (
              <a
                href={group.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0C2A4B]/15 px-4 py-2.5 text-[12px] font-bold text-[#0C2A4B]"
              >
                بدء الجلسة
              </a>
            )}
          </div>
        </footer>
      </motion.aside>
    </motion.div>
  )
}

const LazyDrawer = lazy(async () => ({ default: ClassPreviewDrawerInner }))

export function ClassPreviewDrawer(props: Props) {
  if (!props.group) return null
  return (
    <AnimatePresence>
      {props.group && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          }
        >
          <LazyDrawer {...props} />
        </Suspense>
      )}
    </AnimatePresence>
  )
}

/** @deprecated use ClassPreviewDrawer */
export function InstructorClassDrawer(props: Props) {
  return <ClassPreviewDrawer {...props} />
}
