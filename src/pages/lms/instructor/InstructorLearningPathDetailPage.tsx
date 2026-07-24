import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  ClipboardList,
  ExternalLink,
  FolderOpen,
  GraduationCap,
  MapPin,
  Users,
  Video,
} from 'lucide-react'
import {
  fetchInstructorLearningPath,
  fetchInstructorPathSessions,
  fetchInstructorPathStudents,
  type InstructorPathSession,
  type LearningPath,
} from '@/api/learningPathsApi'
import { InstructorHero } from '@/components/instructor'
import { DASHBOARD_STICKY_BELOW_HEADER } from '@/layouts/dashboardLayoutConstants'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n)

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('ar', {
    numberingSystem: 'latn',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

function formatSessionTime(s: InstructorPathSession): string {
  const date = s.session_date ? fmtDate(s.session_date) : null
  const start = s.start_time ? s.start_time.slice(0, 5) : null
  const end   = s.end_time   ? s.end_time.slice(0, 5)   : null
  const parts: string[] = []
  if (date)  parts.push(date)
  if (start) parts.push(end ? `${start} – ${end}` : start)
  return parts.join(' · ') || '—'
}

const SESSION_STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'مجدولة',  cls: 'bg-blue-50   text-blue-700   border-blue-200'   },
  live:      { label: 'مباشر',   cls: 'bg-rose-50   text-rose-700   border-rose-100'   },
  completed: { label: 'منتهية',  cls: 'bg-slate-50  text-slate-600  border-slate-200'  },
  cancelled: { label: 'ملغاة',   cls: 'bg-amber-50  text-amber-700  border-amber-200'  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PathStudent = {
  enrollment_id: number
  user_id: number
  name: string | null
  email: string | null
  status: string
  enrolled_at: string
  completed_at: string | null
}

type Tab = 'courses' | 'students' | 'sessions'

// ─── Component ────────────────────────────────────────────────────────────────

export default function InstructorLearningPathDetailPage() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()

  const [path,       setPath]       = useState<LearningPath | null>(null)
  const [students,   setStudents]   = useState<PathStudent[]>([])
  const [sessions,   setSessions]   = useState<InstructorPathSession[]>([])
  const [tab,        setTab]        = useState<Tab>('courses')
  const [loading,    setLoading]    = useState(true)
  const [forbidden,  setForbidden]  = useState(false)
  const [accessMessage, setAccessMessage] = useState<string | null>(null)

  /** Imperative refresh from the hero button — outside any effect, so it may flip to the
   *  loading state synchronously. */
  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setForbidden(false)
    setAccessMessage(null)
    const pathId = Number(id)
    const result = await fetchInstructorLearningPath(pathId)
    if (result.forbidden) {
      setPath(null)
      setForbidden(true)
      setAccessMessage(result.message ?? null)
      setLoading(false)
      return
    }
    if (!result.path) {
      navigate('/dashboard/instructor/learning-paths', { replace: true })
      return
    }
    setPath(result.path)
    setSessions(await fetchInstructorPathSessions(pathId))
    setLoading(false)
  }, [id, navigate])

  // Re-arm the loading state during render when the route param changes (react.dev
  // "adjusting state when a prop changes"); mount is covered by the initial values.
  const [seenId, setSeenId] = useState(id)
  if (seenId !== id) {
    setSeenId(id)
    if (id) {
      setLoading(true)
      setForbidden(false)
      setAccessMessage(null)
    }
  }

  useEffect(() => {
    if (!id) return
    const pathId = Number(id)
    let alive = true
    void (async () => {
      const result = await fetchInstructorLearningPath(pathId)
      if (!alive) return
      if (result.forbidden) {
        setPath(null)
        setForbidden(true)
        setAccessMessage(result.message ?? null)
        setLoading(false)
        return
      }
      if (!result.path) {
        navigate('/dashboard/instructor/learning-paths', { replace: true })
        return
      }
      setPath(result.path)
      const pathSessions = await fetchInstructorPathSessions(pathId)
      if (!alive) return
      setSessions(pathSessions)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [id, navigate])

  useEffect(() => {
    if (tab !== 'students' || !id) return
    let alive = true
    void (async () => {
      const rows = await fetchInstructorPathStudents(Number(id))
      if (alive) setStudents(rows)
    })()
    return () => { alive = false }
  }, [tab, id])

  if (loading) {
    return (
      <div className="animate-pulse space-y-5 pb-16" dir="rtl">
        <div className="h-32 rounded-3xl bg-slate-200" />
        <div className="h-10 rounded-2xl bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((n) => <div key={n} className="h-28 rounded-2xl bg-slate-100" />)}
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-10 text-center shadow-sm" dir="rtl">
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
        <h1 className="mt-4 text-xl font-black text-[#0C2A4B]">
          {accessMessage ?? 'لا تملك صلاحية عرض هذا المسار.'}
        </h1>
        <Link
          to="/dashboard/instructor/learning-paths"
          className="mt-6 inline-block rounded-2xl bg-[#0C2A4B] px-6 py-2.5 text-[12px] font-black text-white"
        >
          العودة إلى مساراتي
        </Link>
      </div>
    )
  }

  if (!path) return null

  const durationLabel = path.duration
    ? `${path.duration} ${path.duration_unit === 'weeks' ? 'أسبوع' : path.duration_unit === 'months' ? 'شهر' : 'يوم'}`
    : null

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'courses',    label: 'الدورات',  badge: path.courses?.length ?? 0 },
    { id: 'students',   label: 'الطلاب',   badge: path.students_count },
    { id: 'sessions',   label: 'الجلسات',  badge: sessions.length },
  ]

  return (
    <div className="space-y-5 pb-20 text-right" dir="rtl">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <InstructorHero
        title={path.title}
        subtitle={path.short_description ?? undefined}
        eyebrow="إدارة المسار"
        backTo="/dashboard/instructor/learning-paths"
        backLabel="مساراتي التعليمية"
        onRefresh={load}
        refreshing={loading}
        pills={[
          { label: 'دورات',  value: fmt(path.courses_count)  },
          { label: 'طلاب',   value: fmt(path.students_count) },
          ...(durationLabel ? [{ label: 'المدة', value: durationLabel }] : []),
        ]}
      >
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${
            path.status === 'published' ? 'border-emerald-300 bg-emerald-500/20 text-emerald-200'
            : path.status === 'archived' ? 'border-amber-300 bg-amber-500/15 text-amber-200'
            : 'border-white/20 bg-white/10 text-white/70'
          }`}>
            {path.status === 'published' ? 'منشور' : path.status === 'archived' ? 'مؤرشف' : 'مسودة'}
          </span>
          {path.certificate_name && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-black text-amber-200">
              <Award className="h-3 w-3" />
              {path.certificate_name}
            </span>
          )}
        </div>
      </InstructorHero>

      {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
      <div className={`sticky ${DASHBOARD_STICKY_BELOW_HEADER} z-10 -mx-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 px-1 py-1 shadow-sm backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
        <div className="flex min-w-max gap-1">
          {TABS.map(({ id: tid, label, badge }) => {
            const isActive = tab === tid
            return (
              <button
                key={tid}
                type="button"
                onClick={() => setTab(tid)}
                className={`relative inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-black transition-all ${
                  isActive
                    ? 'bg-[#0C2A4B] text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-[#0C2A4B]'
                }`}
              >
                {label}
                {badge != null && badge > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none tabular-nums ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {fmt(badge)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >

          {/* ── الدورات ─────────────────────────────────────────────────── */}
          {tab === 'courses' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-[#0C2A4B]">
                الدورات ضمن المسار
                <span className="mr-2 text-[13px] font-semibold text-[#0C2A4B]/50">
                  ({fmt(path.courses?.length ?? 0)} دورة · للعرض فقط)
                </span>
              </h2>

              {(path.courses?.length ?? 0) === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white py-12 text-center">
                  <GraduationCap className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                  <p className="font-black text-[#0C2A4B]">لا توجد دورات مرتبطة بهذا المسار</p>
                  <p className="mt-1 text-[12px] text-slate-400">يتم إدارة منهج المسار من قبل الإدارة</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(path.courses ?? []).map((course, i) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-[#0C2A4B]/[0.03]"
                    >
                      {/* Thumbnail */}
                      {course.image_url ? (
                        <img
                          src={course.image_url}
                          alt={course.title}
                          className="h-16 w-20 shrink-0 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0C2A4B]/10 to-[#0077B6]/10">
                          <BookOpen className="h-5 w-5 text-[#0077B6]/50" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p className="line-clamp-2 font-black leading-snug text-[#0C2A4B]">{course.title}</p>

                        {/* Per-course stats */}
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                          {course.sessions_count !== undefined && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-[#0077B6]" />
                              {fmt(course.sessions_count)} جلسة
                            </span>
                          )}
                          {course.materials_count !== undefined && (
                            <span className="inline-flex items-center gap-1">
                              <FolderOpen className="h-3 w-3 text-[#F28C00]" />
                              {fmt(course.materials_count)} مادة
                            </span>
                          )}
                          {course.assignments_count !== undefined && (
                            <span className="inline-flex items-center gap-1">
                              <ClipboardList className="h-3 w-3 text-emerald-600" />
                              {fmt(course.assignments_count)} واجب
                            </span>
                          )}
                        </div>

                        {/* CTA */}
                        <Link
                          to={`/dashboard/instructor/courses/${course.id}/content`}
                          className="mt-auto inline-flex items-center gap-1.5 self-start rounded-xl bg-[#0C2A4B] px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-[#0077B6]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          إدارة محتوى الدورة
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── الطلاب ──────────────────────────────────────────────────── */}
          {tab === 'students' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-[#0C2A4B]">
                الطلاب المسجّلون
                <span className="mr-2 text-[13px] font-semibold text-[#0C2A4B]/50">
                  ({fmt(students.length)})
                </span>
              </h2>

              {students.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white py-14 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                  <p className="font-black text-[#0C2A4B]">لا طلاب مسجّلين بعد</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-right text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-black uppercase text-slate-400">
                      <tr>
                        <th className="px-5 py-3">الطالب</th>
                        <th className="hidden px-4 py-3 sm:table-cell">البريد الإلكتروني</th>
                        <th className="px-4 py-3">الحالة</th>
                        <th className="hidden px-4 py-3 sm:table-cell">تاريخ التسجيل</th>
                        <th className="hidden px-4 py-3 sm:table-cell">الإنجاز</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {students.map((s) => (
                        <tr key={s.enrollment_id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0C2A4B]/10 text-[12px] font-black text-[#0C2A4B]">
                                {(s.name ?? '?').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-[#0C2A4B]">{s.name ?? '—'}</span>
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 text-[12px] text-slate-500 sm:table-cell">
                            {s.email ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black ${
                              s.status === 'completed'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : s.status === 'dropped'
                                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                                  : 'border-[#0077B6]/20 bg-[#0077B6]/10 text-[#0077B6]'
                            }`}>
                              {s.status === 'completed' ? 'مكتمل' : s.status === 'dropped' ? 'انسحب' : 'جاري'}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-[12px] text-slate-400 sm:table-cell">
                            {fmtDate(s.enrolled_at)}
                          </td>
                          <td className="hidden px-4 py-3 text-[12px] text-slate-400 sm:table-cell">
                            {s.completed_at ? fmtDate(s.completed_at) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── الجلسات ─────────────────────────────────────────────────── */}
          {tab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black text-[#0C2A4B]">
                  جلسات دورات المسار
                  <span className="mr-2 text-[13px] font-semibold text-[#0C2A4B]/50">
                    ({fmt(sessions.length)})
                  </span>
                </h2>
                <Link
                  to="/dashboard/instructor/sessions"
                  className="text-[12px] font-black text-[#0077B6] hover:underline"
                >
                  عرض كل جلساتي
                </Link>
              </div>

              {sessions.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white py-14 text-center">
                  <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                  <p className="font-black text-[#0C2A4B]">لا جلسات مرتبطة بدورات هذا المسار</p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    أضف جلسات عبر صفحة محتوى كل دورة
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s, i) => {
                    const st = SESSION_STATUS[s.status] ?? { label: s.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' }
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex flex-wrap items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0C2A4B]/8 text-[#0C2A4B]">
                          <Calendar className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-[#0C2A4B]">
                              {s.title ?? `جلسة #${fmt(s.id)}`}
                            </p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${st.cls}`}>
                              {st.label}
                            </span>
                          </div>

                          {s.course_title && (
                            <p className="text-[12px] font-semibold text-[#0077B6]">
                              <BookOpen className="mb-0.5 ml-1 inline h-3 w-3" />
                              {s.course_title}
                            </p>
                          )}

                          <p className="text-[12px] text-slate-500">{formatSessionTime(s)}</p>

                          {s.location && (
                            <p className="flex items-center gap-1 text-[11px] text-slate-400">
                              <MapPin className="h-3 w-3" /> {s.location}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {s.meeting_url && (
                            <a
                              href={s.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0C2A4B] px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-[#0077B6]"
                            >
                              <Video className="h-3.5 w-3.5" />
                              رابط الجلسة
                            </a>
                          )}
                          {s.course_id && (
                            <Link
                              to={`/dashboard/instructor/courses/${s.course_id}/content`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-black text-[#0C2A4B] transition hover:border-[#0077B6]/40 hover:text-[#0077B6]"
                            >
                              <ExternalLink className="h-3 w-3" />
                              إدارة الدورة
                            </Link>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Assignments quick-link (always visible at bottom) ────────────── */}
      <div className="rounded-2xl border border-[#F28C00]/15 bg-orange-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-[#F28C00]" />
            <div>
              <p className="font-black text-[#0C2A4B]">الواجبات والتسليمات</p>
              <p className="text-[12px] font-semibold text-[#0C2A4B]/55">
                راجع تسليمات الطلاب في دورات هذا المسار
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/instructor/submissions"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#F28C00] px-4 py-2 text-[12px] font-black text-white shadow-sm transition hover:opacity-90"
          >
            <ClipboardList className="h-4 w-4" />
            التسليمات
          </Link>
        </div>
      </div>

    </div>
  )
}
