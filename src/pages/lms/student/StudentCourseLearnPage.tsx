import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios, { type AxiosError } from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FolderOpen,
  GraduationCap,
  Layers,
  Loader2,
  RefreshCw,
  Save,
  StickyNote,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react'
import { getApiErrorMessage } from '@/api/apiErrors'
import {
  fetchCourseNotes,
  fetchStudentCourseLearn,
  mapCourseLearnAssignmentToStudentAssignment,
  mapCourseLearnMaterialToLmsMaterial,
  mapLearnSessionToLms,
  saveCourseNotes,
} from '@/api/courseLearnApi'
import { STUDENT_SCOPE_REFRESH_EVENT, notifyStudentScopeRefresh } from '@/api/studentApi'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { AssignmentCard, AssignmentSubmitModal, LmsEmptyState, MaterialCard, SessionCard } from '@/components/lms'
import type { StudentAssignment } from '@/types/lms'
import type { StudentCourseLearnPayload } from '@/types/courseLearn'
import type { LmsModule } from '@/types/platform'
import type { LmsSession } from '@/types/lms'
import logo from '@/assets/logo.png'
import { resolveCoursePkFromLikelyMisKey, studentLearnHref } from '@/utils/studentLearnNavigation'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { formatDateTime } from '@/utils/dateTime'
import { formatSessionSchedule, getSessionJoinState } from '@/utils/lmsSession'

const NOTES_KEY = (courseId: number) => `emc-student-learn-notes:${courseId}`

type LearnTab = 'modules' | 'sessions' | 'materials' | 'assignments' | 'notes' | 'progress'

function tsFromSession(s: LmsSession): number {
  const raw = s.starts_at ?? s.date
  if (raw && String(raw).trim() !== '') {
    const t = Date.parse(String(raw))
    return Number.isNaN(t) ? 0 : t
  }
  return 0
}

function statusArabic(status: string | undefined): string {
  const s = String(status ?? '').toLowerCase()
  if (s.includes('complete')) return 'مكتملة'
  if (s.includes('registered') || s.includes('approved') || s.includes('active') || s.includes('enrolled')) return 'مسجّل'
  if (s.includes('pending')) return 'قيد المراجعة'
  if (s.includes('cancel')) return 'ملغاة'
  if (s.includes('drop')) return 'منسحب'
  return 'مسجّل'
}

function deriveProgressPct(learn: StudentCourseLearnPayload): number {
  if (typeof learn.progress_percent === 'number' && Number.isFinite(learn.progress_percent)) {
    return Math.min(100, Math.max(0, Math.round(learn.progress_percent)))
  }
  const mods = learn.modules
  if (!mods.length) return 0
  const withBackendPct = mods.filter((m) => typeof m.progress_percentage === 'number')
  if (withBackendPct.length > 0) {
    const avg =
      withBackendPct.reduce((sum, m) => sum + (m.progress_percentage ?? 0), 0) / withBackendPct.length
    return Math.min(100, Math.round(avg))
  }
  let lessons = 0, done = 0
  for (const m of mods) {
    lessons += Math.max(m.lessons_count ?? 0, 0)
    done += Math.max(m.completed_lessons_count ?? m.completed_lessons ?? 0, 0)
  }
  if (lessons <= 0) return 0
  return Math.min(100, Math.round((done / lessons) * 100))
}

export default function StudentCourseLearnPage() {
  const { courseId: courseIdParam } = useParams()
  const navigate = useNavigate()
  const courseId = Number(courseIdParam)
  const validId = Number.isFinite(courseId) && courseId > 0

  const [learn, setLearn] = useState<StudentCourseLearnPayload | null>(null)
  const [learnLoading, setLearnLoading] = useState(validId)
  const [refreshing, setRefreshing] = useState(false)
  const [learnError, setLearnError] = useState<string | null>(null)
  const [gateError, setGateError] = useState<'forbidden' | 'missing' | null>(null)
  const [activeAssignment, setActiveAssignment] = useState<StudentAssignment | null>(null)
  const [activeTab, setActiveTab] = useState<LearnTab>('modules')

  // Notes state — server-persisted, with localStorage as offline fallback
  const [notes, setNotes] = useState('')
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null)
  const [notesError, setNotesError] = useState<string | null>(null)
  const notesDirtyRef = useRef(false)
  const [openModules, setOpenModules] = useState<Set<number>>(new Set())
  const modulesInitializedRef = useRef(false)

  const { registrations, enrollmentsMerged, registeredCourseIds } = useStudentDashboardData()

  const redirectCoursePk = useMemo(
    () => (validId ? resolveCoursePkFromLikelyMisKey(courseId, registrations) : null),
    [validId, courseId, registrations],
  )

  useEffect(() => {
    if (redirectCoursePk == null) return
    navigate(studentLearnHref(redirectCoursePk), { replace: true })
  }, [redirectCoursePk, navigate])

  const clientKnowsRegistered = useMemo(() => {
    if (!validId) return false
    if (registeredCourseIds.has(courseId)) return true
    if (registrations.some((r) => r.course_id === courseId)) return true
    return enrollmentsMerged.some((e) => e.course.id === courseId)
  }, [validId, courseId, registeredCourseIds, registrations, enrollmentsMerged])

  const loadLearn = useCallback(async () => {
    if (!validId) return
    setLearnError(null)
    setGateError(null)
    setLearnLoading(true)
    try {
      const data = await fetchStudentCourseLearn(courseId)
      setLearn(data)
    } catch (e) {
      setLearn(null)
      const status = axios.isAxiosError(e) ? e.response?.status : undefined
      if (status === 403) setGateError('forbidden')
      else if (status === 404) setGateError('missing')
      else setLearnError(getApiErrorMessage(e as AxiosError) ?? 'تعذّر تحميل مساحة التعلّم.')
    } finally {
      setLearnLoading(false)
    }
  }, [courseId, validId])

  const softRefresh = useCallback(async () => {
    if (!validId) return
    setLearnError(null)
    setGateError(null)
    setRefreshing(true)
    try {
      const data = await fetchStudentCourseLearn(courseId)
      setLearn(data)
    } catch (e) {
      setLearn(null)
      const status = axios.isAxiosError(e) ? e.response?.status : undefined
      if (status === 403) setGateError('forbidden')
      else if (status === 404) setGateError('missing')
      else setLearnError(getApiErrorMessage(e as AxiosError) ?? 'تعذّر تحميل مساحة التعلّم.')
    } finally {
      setRefreshing(false)
    }
  }, [courseId, validId])

  useEffect(() => { void loadLearn() }, [loadLearn])

  useEffect(() => {
    const onRefresh = () => { void softRefresh() }
    window.addEventListener(STUDENT_SCOPE_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(STUDENT_SCOPE_REFRESH_EVENT, onRefresh)
  }, [softRefresh])

  // Load notes from server, fall back to localStorage
  useEffect(() => {
    if (!validId) return
    setNotesLoading(true)
    fetchCourseNotes(courseId)
      .then(({ content, updated_at }) => {
        setNotes(content)
        setNotesSavedAt(updated_at)
        notesDirtyRef.current = false
        try { window.localStorage.setItem(NOTES_KEY(courseId), content) } catch {}
      })
      .catch(() => {
        try { setNotes(window.localStorage.getItem(NOTES_KEY(courseId)) ?? '') } catch {}
      })
      .finally(() => setNotesLoading(false))
  }, [courseId, validId])

  // Keep localStorage in sync as fallback cache
  useEffect(() => {
    if (!validId || notesLoading) return
    try { window.localStorage.setItem(NOTES_KEY(courseId), notes) } catch {}
  }, [notes, courseId, validId, notesLoading])

  // Expand all modules on first data load
  useEffect(() => {
    if (modulesInitializedRef.current || !learn?.modules?.length) return
    modulesInitializedRef.current = true
    setOpenModules(new Set(learn.modules.map((m) => m.id)))
  }, [learn?.modules])

  const toggleModule = useCallback((id: number) => {
    setOpenModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSaveNotes = useCallback(async () => {
    if (!validId || notesSaving) return
    setNotesSaving(true)
    setNotesError(null)
    try {
      const { updated_at } = await saveCourseNotes(courseId, notes || '')
      setNotesSavedAt(updated_at)
      notesDirtyRef.current = false
    } catch {
      setNotesError('فشل الحفظ. تحقق من اتصالك وحاول مرة أخرى.')
    } finally {
      setNotesSaving(false)
    }
  }, [courseId, validId, notes, notesSaving])

  const ctx = learn
  const courseTitle = ctx?.course?.title?.trim() || 'محتوى الدورة'
  const instructor = ctx?.course?.instructor_name?.trim() || ''
  const slug = ctx?.course?.slug?.trim() ?? undefined
  const regLabel = ctx?.registration_status ?? undefined
  const courseDescription = ctx?.course?.description?.trim() || null
  const classGroup = ctx?.class_group ?? null
  const coverUrl = useMemo(() => resolvePublicAssetUrl(ctx?.course?.course_image ?? null), [ctx?.course?.course_image])

  const modulesLms = useMemo((): LmsModule[] => {
    if (!ctx?.modules?.length) return []
    return ctx.modules.map((m) => ({
      id: m.id,
      course_id: m.course_id ?? courseId,
      title: m.title,
      sort_order: m.sort_order,
      lessons_count: m.lessons_count,
      completed_lessons: m.completed_lessons_count ?? m.completed_lessons,
      assignments_count: m.assignments_count,
      submitted_assignments_count: m.submitted_assignments_count,
      progress_percentage: m.progress_percentage,
      is_completed: m.is_completed,
    }))
  }, [ctx?.modules, courseId])

  const sessionsMapped = useMemo(() => {
    const list = ctx?.sessions ?? []
    return list.map((s) => mapLearnSessionToLms(s, courseTitle)).sort((a, b) => tsFromSession(a) - tsFromSession(b))
  }, [ctx?.sessions, courseTitle])

  const upcomingSorted = useMemo(
    () => [...sessionsMapped].filter((s) => s.status !== 'completed').sort((a, b) => tsFromSession(a) - tsFromSession(b)),
    [sessionsMapped],
  )

  const materials = useMemo(() => {
    const raw = ctx?.materials ?? []
    return raw.map((m) => mapCourseLearnMaterialToLmsMaterial(m, { courseId, courseTitle }))
  }, [ctx?.materials, courseId, courseTitle])

  const assignments = useMemo(() => {
    const seen = new Set<number>()
    const raw = [...(ctx?.assignments ?? [])]
    for (const mod of ctx?.modules ?? []) {
      for (const a of mod.assignments ?? []) {
        if (!seen.has(a.id)) {
          raw.push(a)
          seen.add(a.id)
        }
      }
    }
    return raw
      .filter((a) => a.visible !== false)
      .map((a) => mapCourseLearnAssignmentToStudentAssignment(a, { courseId, courseTitle }))
      .filter((a): a is StudentAssignment => a != null)
  }, [ctx?.assignments, ctx?.modules, courseId, courseTitle])

  const progressPct = useMemo(() => (ctx ? deriveProgressPct(ctx) : 0), [ctx])
  const totalLessons = useMemo(() => modulesLms.reduce((s, m) => s + (m.lessons_count ?? 0), 0), [modulesLms])
  const doneLessons = useMemo(() => modulesLms.reduce((s, m) => s + (m.completed_lessons ?? 0), 0), [modulesLms])
  const doneAssignments = useMemo(
    () => assignments.filter((a) => ['submitted', 'graded'].includes(a.status)).length,
    [assignments],
  )
  const nextSession = upcomingSorted[0]

  const TABS = useMemo(() => [
    { id: 'modules' as LearnTab,     label: 'الوحدات',    icon: BookOpen,      badge: modulesLms.length > 0 ? modulesLms.length : null },
    { id: 'sessions' as LearnTab,    label: 'الجلسات',    icon: Calendar,      badge: sessionsMapped.length > 0 ? sessionsMapped.length : null },
    { id: 'materials' as LearnTab,   label: 'المواد',     icon: FolderOpen,    badge: materials.length > 0 ? materials.length : null },
    { id: 'assignments' as LearnTab, label: 'الواجبات',   icon: ClipboardList, badge: assignments.length > 0 ? assignments.length : null },
    { id: 'notes' as LearnTab,       label: 'ملاحظاتي',  icon: StickyNote,    badge: null },
    { id: 'progress' as LearnTab,    label: 'التقدم',     icon: TrendingUp,    badge: null },
  ], [modulesLms.length, sessionsMapped.length, materials.length, assignments.length])

  // ─── Guard states ─────────────────────────────────────────────────────────

  if (!validId) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-8 text-center text-[#22334A]" dir="rtl">
        <p className="font-black">معرّف الدورة غير صالح.</p>
        <Link to="/dashboard/student/courses" className="mt-4 inline-block font-bold text-[#2691C2] underline">
          العودة لدوراتي
        </Link>
      </div>
    )
  }

  if (learnLoading && !ctx && redirectCoursePk == null) {
    return (
      <div className="animate-pulse space-y-6" dir="rtl">
        <div className="h-52 rounded-3xl bg-slate-200/90" />
        <div className="h-12 rounded-2xl bg-slate-100" />
        <div className="h-80 rounded-3xl bg-slate-100" />
      </div>
    )
  }

  if (gateError !== null) {
    const title =
      gateError === 'missing' ? 'لم يُعثر على هذه الدورة'
      : 'لا يمكنك الوصول إلى محتوى هذه الدورة'

    return (
      <div className="rounded-3xl border border-[#22334A]/10 bg-white/90 p-10 text-center shadow-xl" dir="rtl">
        <BookOpen className="mx-auto h-12 w-12 text-[#2691C2]" aria-hidden />
        <h1 className="mt-4 text-xl font-black text-[#22334A]">{title}</h1>
        <p className="mx-auto mt-2 max-w-lg text-[13px] font-semibold text-[#22334A]/60">
          {gateError === 'forbidden'
            ? 'تأكّد من تسجيلك في هذه الدورة عبر مسارك التعليمي أو من صفحة دوراتي.'
            : clientKnowsRegistered
              ? 'يبدو أن الرابط لا يطابق الدورة المسجّلة. جرّب فتح الدورة من صفحة دوراتي.'
              : 'تحقّق من الرابط أو تواصل مع الإدارة.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => void loadLearn()} className="rounded-2xl border border-[#22334A]/15 px-6 py-2.5 text-[12px] font-black text-[#22334A]">
            إعادة المحاولة
          </button>
          <Link to="/dashboard/student/courses" className="rounded-2xl bg-[#22334A] px-6 py-2.5 text-[12px] font-black text-white">
            دوراتي
          </Link>
        </div>
      </div>
    )
  }

  if (learnError && !ctx) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50/85 p-10 text-center" dir="rtl">
        <p className="font-black text-[#22334A]">{learnError}</p>
        <button type="button" onClick={() => void loadLearn()} className="mt-6 rounded-2xl bg-[#22334A] px-6 py-2.5 text-[12px] font-black text-white">
          إعادة المحاولة
        </button>
      </div>
    )
  }

  if (!ctx) return null

  return (
    <div className="space-y-5 pb-20 text-right" dir="rtl">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-gradient-to-bl from-[#22334A] via-[#1f3049] to-[#2691c2] p-[1px] shadow-[0_32px_80px_-36px_rgba(34,51,74,0.75)]">
        <div className="relative overflow-hidden rounded-[calc(2rem-1px)] bg-gradient-to-tl from-[#22334A]/95 via-[#22334A]/80 to-[#2691C2]/40 px-6 py-9 sm:px-10">
          <div aria-hidden className="pointer-events-none absolute -left-28 top-0 h-64 w-64 rounded-full bg-[#EC943C]/35 blur-[100px]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 right-[-10%] h-72 w-72 rounded-full bg-white/12 blur-[90px]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

            {/* Left: course info */}
            <div className="flex flex-1 flex-col gap-4">
              {/* Back button + Breadcrumb */}
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard/student/courses"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/80 backdrop-blur transition hover:bg-white/20"
                >
                  <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                  دوراتي
                </Link>
                <span className="text-[11px] text-white/40">/</span>
                <span className="text-[11px] font-black text-white/65">مساحة التعلّم</span>
              </div>

              <div className="flex flex-wrap items-start gap-4">
                {/* Thumbnail */}
                <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/12 ring-1 ring-white/20">
                  {coverUrl
                    ? <img src={coverUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                    : <img src={logo} alt="" className="h-10 w-auto opacity-90" loading="lazy" draggable={false} />
                  }
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <h1 className="text-[1.6rem] font-black leading-snug text-white sm:text-[1.9rem]">{courseTitle}</h1>

                  {instructor ? (
                    <p className="text-[13px] font-bold text-white/75">المدرب: {instructor}</p>
                  ) : (
                    <p className="text-[12px] font-semibold text-white/45">لم يتم تعيين مدرب بعد</p>
                  )}

                  {courseDescription && (
                    <p className="max-w-xl text-[12px] font-semibold leading-relaxed text-white/60">
                      {courseDescription}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white backdrop-blur">
                      {statusArabic(regLabel)}
                    </span>
                    {classGroup && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EC943C]/40 bg-[#EC943C]/20 px-3 py-1 text-[11px] font-black text-white">
                        <Users className="h-3 w-3" />
                        {classGroup.name}{classGroup.level_code ? ` · ${classGroup.level_code}` : ''}
                      </span>
                    )}
                    {slug && (
                      <Link
                        to={`/courses/${slug}`}
                        className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-black text-white transition hover:bg-white/18"
                      >
                        صفحة الدورة <ExternalLink className="h-3 w-3 opacity-70" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: progress + next session */}
            <div className="grid w-full max-w-sm shrink-0 gap-3 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">التقدّم الكلّي</span>
                <span className="text-3xl font-black tabular-nums text-white">{progressPct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10 sm:col-span-2">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-l from-[#EC943C] to-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>

              {/* Next session mini */}
              <div className="rounded-2xl border border-white/15 bg-[#22334A]/30 p-3.5 text-white">
                <div className="mb-2 flex items-center justify-end gap-1.5 text-[10px] font-black uppercase text-white/55">
                  <Calendar className="h-3 w-3" />
                  الجلسة التالية
                </div>
                {nextSession ? (
                  <div className="space-y-1">
                    <p className="text-[12px] font-black leading-snug line-clamp-2">{nextSession.title ?? nextSession.course_name}</p>
                    <p className="text-[10px] font-bold text-white/70">{formatSessionSchedule(nextSession)}</p>
                    {(() => {
                      const join = getSessionJoinState(nextSession, Date.now(), 'انضم للجلسة')
                      if (join.kind === 'join') {
                        return (
                          <a
                            href={join.href}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-[11px] font-black text-[#22334A] hover:bg-orange-50"
                          >
                            <Video className="h-3.5 w-3.5 text-[#EC943C]" />
                            {join.label}
                          </a>
                        )
                      }
                      return (
                        <p className="mt-1.5 rounded-xl border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-bold text-white/80">
                          {join.label}
                        </p>
                      )
                    })()}
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-white/65">لا جلسات قادمة</p>
                )}
              </div>

              {/* Quick stats */}
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 text-white space-y-1.5">
                <p className="text-[10px] font-black uppercase text-white/55">ملخص المحتوى</p>
                {[
                  { label: 'المواد', val: materials.length },
                  { label: 'الواجبات', val: assignments.length },
                  { label: 'الجلسات', val: sessionsMapped.length },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-[12px] font-bold">
                    <span className="font-black tabular-nums">{val}</span>
                    <span className="text-white/75">{label}</span>
                  </div>
                ))}
              </div>

              {/* Refresh row */}
              <div className="sm:col-span-2 flex items-center justify-between gap-3">
                {learnError && (
                  <span className="text-[10px] font-bold text-amber-200">{learnError}</span>
                )}
                <button
                  type="button"
                  onClick={() => void softRefresh()}
                  disabled={refreshing || learnLoading}
                  className="mr-auto inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur hover:bg-white/18 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'تحديث…' : 'تحديث'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 -mx-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 px-1 py-1 shadow-sm backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1">
          {TABS.map(({ id, label, icon: Icon, badge }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`relative inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-black transition-all ${
                  isActive
                    ? 'bg-[#22334A] text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-[#22334A]'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
                {badge != null && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none tabular-nums ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {badge}
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
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >

          {/* ── المنهاج ─────────────────────────────────────────────────── */}
          {activeTab === 'modules' && (
            <div className="space-y-5">
              {/* Class group */}
              {classGroup && (
                <div className="rounded-2xl border border-[#EC943C]/20 bg-orange-50/60 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EC943C]/15 text-[#EC943C]">
                      <Users className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="text-[13px] font-black text-[#22334A]">فصلك الدراسي: {classGroup.name}</p>
                      {classGroup.level_code && (
                        <p className="text-[11px] font-semibold text-[#22334A]/60">{classGroup.level_code}</p>
                      )}
                    </div>
                    {classGroup.schedule_day && classGroup.schedule_time && (
                      <span className="mr-auto rounded-xl border border-[#22334A]/10 bg-white px-3 py-1 text-[11px] font-bold text-[#22334A]/70">
                        {classGroup.schedule_day} · {classGroup.schedule_time}
                      </span>
                    )}
                    {classGroup.meeting_link && (
                      <a
                        href={classGroup.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#22334A] px-4 py-2 text-[11px] font-black text-white transition hover:opacity-90"
                      >
                        <Video className="h-3.5 w-3.5" />
                        رابط الفصل
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <h2 className="text-xl font-black text-[#22334A]">الوحدات والمنهاج</h2>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#22334A]/50">
                      {ctx.modules.length > 0
                        ? `${ctx.modules.length} وحدة · ${totalLessons} درس`
                        : 'سيظهر المنهاج بعد إضافة الوحدات من الإدارة'}
                    </p>
                  </div>
                </div>

                {ctx.modules.length === 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#22334A]/[0.08] bg-white/70 p-6 text-center text-[13px] font-semibold text-[#22334A]/60">
                      لم تتم إضافة وحدات تعليمية لهذه الدورة بعد
                    </div>
                    {(() => {
                      const nullMaterials = (ctx.materials ?? []).filter((m) => m.module_id == null)
                      const nullSessions = (ctx.sessions ?? []).filter((s) => s.module_id == null)
                      const nullAssignments = (ctx.assignments ?? []).filter((a) => a.module_id == null && a.visible !== false)
                      const hasGeneral = nullMaterials.length > 0 || nullSessions.length > 0 || nullAssignments.length > 0
                      if (!hasGeneral) return null
                      return (
                        <div className="overflow-hidden rounded-2xl border border-amber-200/50 bg-amber-50/40 shadow-sm">
                          <div className="flex items-center gap-3 p-4">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[#EC943C]">
                              <Layers className="h-4 w-4" />
                            </span>
                            <div>
                              <h3 className="text-[14px] font-black text-[#22334A]">محتوى عام للدورة</h3>
                              <p className="text-[11px] font-medium text-[#22334A]/55">جلسات ومواد وواجبات على مستوى الدورة</p>
                            </div>
                          </div>
                          <div className="space-y-4 border-t border-amber-200/40 px-4 pb-4 pt-4">
                            {nullSessions.length > 0 && (
                              <div>
                                <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#22334A]/50">
                                  <Calendar className="h-3 w-3" /> الجلسات
                                </h4>
                                <div className="space-y-2">
                                  {nullSessions.map((s) => (
                                    <SessionCard key={s.id} session={mapLearnSessionToLms(s, courseTitle)} showRecording joinMeetingLabel="انضم للجلسة" />
                                  ))}
                                </div>
                              </div>
                            )}
                            {nullMaterials.length > 0 && (
                              <div>
                                <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#22334A]/50">
                                  <FolderOpen className="h-3 w-3" /> المواد
                                </h4>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {nullMaterials.map((m) => (
                                    <MaterialCard key={m.id} material={mapCourseLearnMaterialToLmsMaterial(m, { courseId, courseTitle })} />
                                  ))}
                                </div>
                              </div>
                            )}
                            {nullAssignments.length > 0 && (
                              <div>
                                <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#22334A]/50">
                                  <ClipboardList className="h-3 w-3" /> الواجبات
                                </h4>
                                <div className="space-y-2">
                                  {nullAssignments.map((a) => {
                                    const sa = mapCourseLearnAssignmentToStudentAssignment(a, { courseId, courseTitle })
                                    if (!sa) return null
                                    return (
                                      <AssignmentCard
                                        key={a.id}
                                        assignment={sa}
                                        onSubmit={
                                          ['pending', 'revision', 'late', 'needs_resubmission'].includes(String(sa.status))
                                            ? () => setActiveAssignment(sa)
                                            : undefined
                                        }
                                      />
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ctx.modules.map((mod, idx) => {
                      const isOpen = openModules.has(mod.id)
                      const pct =
                        typeof mod.progress_percentage === 'number'
                          ? Math.round(mod.progress_percentage)
                          : Math.round((Math.max(0, mod.completed_lessons_count ?? mod.completed_lessons ?? 0) / Math.max(mod.lessons_count, 1)) * 100)
                      const modLessons = mod.lessons ?? []
                      const modMaterials = mod.materials ?? []
                      const modSessions = mod.sessions ?? []
                      const modAssignments = mod.assignments ?? []
                      const hasChildren = modLessons.length > 0 || modMaterials.length > 0 || modSessions.length > 0 || modAssignments.length > 0
                      return (
                        <div key={mod.id} className="overflow-hidden rounded-2xl border border-[#22334A]/[0.08] bg-white/85 shadow-sm">
                          <button
                            type="button"
                            onClick={() => toggleModule(mod.id)}
                            className="flex w-full items-center gap-3 p-4 text-right transition hover:bg-slate-50/60"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-bl from-[#22334A] to-[#2691C2] text-[12px] font-black text-white tabular-nums">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h3 className="line-clamp-1 text-[14px] font-black leading-snug text-[#22334A]">{mod.title}</h3>
                                {mod.is_completed && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">✓ مكتملة</span>
                                )}
                              </div>
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                                  <div className="h-full rounded-full bg-gradient-to-l from-[#2691C2] to-[#EC943C] transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="shrink-0 text-[10px] font-black tabular-nums text-[#22334A]/60">{pct}%</span>
                              </div>
                              <p className="mt-0.5 text-[10px] font-semibold text-[#22334A]/45">
                                {mod.lessons_count} درس
                                {(mod.assignments_count ?? 0) > 0 ? ` · ${mod.assignments_count} واجب` : ''}
                                {modMaterials.length > 0 ? ` · ${modMaterials.length} مادة` : ''}
                              </p>
                            </div>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-[#22334A]/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isOpen && (
                            <div className="space-y-4 border-t border-[#22334A]/[0.06] px-4 pb-4 pt-4">
                              {!hasChildren ? (
                                <p className="py-4 text-center text-[12px] font-semibold text-[#22334A]/45">
                                  لا يوجد محتوى داخل هذه الوحدة بعد
                                </p>
                              ) : (
                                <>
                                  {modLessons.length > 0 && (
                                    <div>
                                      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#22334A]/50">
                                        <BookOpen className="h-3 w-3" /> الدروس
                                      </h4>
                                      <div className="space-y-1.5">
                                        {modLessons.map((l) => (
                                          <div key={l.id} className="flex items-center gap-3 rounded-xl border border-[#22334A]/[0.06] bg-slate-50/60 px-3 py-2.5">
                                            {l.video_url
                                              ? <Video className="h-3.5 w-3.5 shrink-0 text-[#2691C2]" />
                                              : <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#22334A]/30" />
                                            }
                                            <span className="flex-1 text-[12px] font-semibold text-[#22334A]">{l.title}</span>
                                            {l.duration_minutes != null && (
                                              <span className="text-[10px] font-bold tabular-nums text-[#22334A]/45">{l.duration_minutes} د</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {modSessions.length > 0 && (
                                    <div>
                                      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#22334A]/50">
                                        <Calendar className="h-3 w-3" /> الجلسات
                                      </h4>
                                      <div className="space-y-2">
                                        {modSessions.map((s) => (
                                          <SessionCard key={s.id} session={mapLearnSessionToLms(s, courseTitle)} showRecording joinMeetingLabel="انضم للجلسة" />
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {modMaterials.length > 0 && (
                                    <div>
                                      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#22334A]/50">
                                        <FolderOpen className="h-3 w-3" /> المواد
                                      </h4>
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        {modMaterials.map((m) => (
                                          <MaterialCard key={m.id} material={mapCourseLearnMaterialToLmsMaterial(m, { courseId, courseTitle })} />
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {modAssignments.length > 0 && (
                                    <div>
                                      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#22334A]/50">
                                        <ClipboardList className="h-3 w-3" /> الواجبات
                                      </h4>
                                      <div className="space-y-2">
                                        {modAssignments.map((a) => {
                                          const sa = mapCourseLearnAssignmentToStudentAssignment(a, { courseId, courseTitle })
                                          if (!sa) return null
                                          return (
                                            <AssignmentCard
                                              key={a.id}
                                              assignment={sa}
                                              onSubmit={
                                                ['pending', 'revision', 'late', 'needs_resubmission'].includes(String(sa.status))
                                                  ? () => setActiveAssignment(sa)
                                                  : undefined
                                              }
                                            />
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* General course content: top-level items not linked to any module */}
                    {(() => {
                      const nullMaterials = (ctx.materials ?? []).filter((m) => m.module_id == null)
                      const nullSessions = (ctx.sessions ?? []).filter((s) => s.module_id == null)
                      const nullAssignments = (ctx.assignments ?? []).filter((a) => a.module_id == null)
                      const hasGeneral = nullMaterials.length > 0 || nullSessions.length > 0 || nullAssignments.length > 0
                      if (!hasGeneral) return null
                      return (
                        <div className="overflow-hidden rounded-2xl border border-amber-200/50 bg-amber-50/40 shadow-sm">
                          <div className="flex items-center gap-3 p-4">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[#EC943C]">
                              <Layers className="h-4 w-4" />
                            </span>
                            <h3 className="text-[14px] font-black text-[#22334A]">محتوى عام للدورة</h3>
                          </div>
                          <div className="space-y-4 border-t border-amber-200/40 px-4 pb-4 pt-4">
                            {nullSessions.length > 0 && (
                              <div>
                                <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#22334A]/50">
                                  <Calendar className="h-3 w-3" /> الجلسات
                                </h4>
                                <div className="space-y-2">
                                  {nullSessions.map((s) => (
                                    <SessionCard key={s.id} session={mapLearnSessionToLms(s, courseTitle)} showRecording joinMeetingLabel="انضم للجلسة" />
                                  ))}
                                </div>
                              </div>
                            )}
                            {nullMaterials.length > 0 && (
                              <div>
                                <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#22334A]/50">
                                  <FolderOpen className="h-3 w-3" /> المواد
                                </h4>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {nullMaterials.map((m) => (
                                    <MaterialCard key={m.id} material={mapCourseLearnMaterialToLmsMaterial(m, { courseId, courseTitle })} />
                                  ))}
                                </div>
                              </div>
                            )}
                            {nullAssignments.length > 0 && (
                              <div>
                                <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#22334A]/50">
                                  <ClipboardList className="h-3 w-3" /> الواجبات
                                </h4>
                                <div className="space-y-2">
                                  {nullAssignments.map((a) => {
                                    const sa = mapCourseLearnAssignmentToStudentAssignment(a, { courseId, courseTitle })
                                    if (!sa) return null
                                    return (
                                      <AssignmentCard
                                        key={a.id}
                                        assignment={sa}
                                        onSubmit={
                                          ['pending', 'revision', 'late', 'needs_resubmission'].includes(String(sa.status))
                                            ? () => setActiveAssignment(sa)
                                            : undefined
                                        }
                                      />
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── الجلسات ─────────────────────────────────────────────────── */}
          {activeTab === 'sessions' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#22334A]/[0.06] bg-gradient-to-bl from-white/95 to-orange-50/20 p-6 shadow-sm ring-1 ring-[#22334A]/[0.04]">
                <div>
                  <h2 className="text-xl font-black text-[#22334A]">الجلسات المباشرة</h2>
                  <p className="mt-1 text-[13px] font-semibold text-[#22334A]/55">
                    {sessionsMapped.length > 0
                      ? `${upcomingSorted.length} قادمة · ${sessionsMapped.length - upcomingSorted.length} مكتملة`
                      : 'سيُضيف الفريق الجلسات وروابط الانضمام هنا'}
                  </p>
                </div>
                <Calendar className="h-6 w-6 text-[#EC943C]/70" />
              </div>

              {sessionsMapped.length === 0 ? (
                <div className="rounded-3xl border border-[#22334A]/[0.06] bg-white/80 p-6">
                  <LmsEmptyState
                    icon={Calendar}
                    title="لا جلسات حتى الآن"
                    description="عندما تُنشأ الجلسات من لوحة المحتوى، ستظهر هنا مع الموعد والروابط."
                  />
                </div>
              ) : (
                <div className="grid gap-4">
                  {sessionsMapped.map((s) => (
                    <SessionCard key={s.id} session={s} showRecording joinMeetingLabel="انضم للجلسة" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── المواد ──────────────────────────────────────────────────── */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black text-[#22334A]">المقررات والمواد</h2>
                {materials.length > 0 && (
                  <Link to="/dashboard/student/materials" className="text-[12px] font-black text-[#2691C2] hover:underline">
                    عرض كل المواد
                  </Link>
                )}
              </div>

              {materials.length === 0 ? (
                <div className="rounded-3xl bg-white/80 p-4 ring-1 ring-[#22334A]/[0.06]">
                  <LmsEmptyState
                    icon={FolderOpen}
                    title="لا مواد لهذه الدورة بعد"
                    description="بعد أن يرفع الفريق ملفاتاً أو روابط عبر لوحة المحتوى، ستظهر هنا مع أزرار التحميل."
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {materials.map((m) => (
                    <MaterialCard key={m.id} material={m} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── الواجبات ────────────────────────────────────────────────── */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black text-[#22334A]">الواجبات والتكليفات</h2>
                {assignments.length > 0 && (
                  <span className="text-[12px] font-bold text-[#22334A]/50">
                    {doneAssignments} / {assignments.length} مُسلَّمة
                  </span>
                )}
              </div>

              {assignments.length === 0 ? (
                <div className="rounded-3xl bg-white/80 ring-1 ring-[#22334A]/[0.06]">
                  <LmsEmptyState
                    icon={ClipboardList}
                    title="لا واجبات ظاهرة"
                    description="عند إضافة واجبات من لوحة المحتوى، ستُعرض هنا مع الموعد وحالة التسليم."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((a) => (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      onSubmit={
                        ['pending', 'revision', 'late', 'needs_resubmission'].includes(String(a.status))
                          ? () => setActiveAssignment(a)
                          : undefined
                      }
                    />
                  ))}
                  <Link
                    to="/dashboard/student/assignments"
                    className="inline-flex items-center gap-2 text-[12px] font-black text-[#2691C2] hover:underline"
                  >
                    فتح كل الواجبات
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ── ملاحظاتي ────────────────────────────────────────────────── */}
          {activeTab === 'notes' && (
            <div className="rounded-3xl border border-[#22334A]/[0.08] bg-white/85 p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-black text-[#22334A]">
                  <StickyNote className="h-5 w-5 text-[#EC943C]" />
                  ملاحظاتي الخاصة
                </h2>
                <div className="flex items-center gap-3">
                  {notesSavedAt && !notesError && !notesSaving && (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      محفوظة · {formatDateTime(notesSavedAt)}
                    </span>
                  )}
                  {notesError && (
                    <span className="text-[11px] font-bold text-rose-600">{notesError}</span>
                  )}
                  <button
                    type="button"
                    disabled={notesSaving || notesLoading}
                    onClick={() => void handleSaveNotes()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#22334A] px-4 py-2 text-[12px] font-black text-white transition hover:opacity-90 disabled:opacity-55"
                  >
                    {notesSaving
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Save className="h-3.5 w-3.5" />}
                    {notesSaving ? 'جارٍ الحفظ…' : 'حفظ الملاحظات'}
                  </button>
                </div>
              </div>

              {notesLoading ? (
                <div className="flex items-center justify-center py-10 text-[13px] font-semibold text-[#22334A]/50">
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جارٍ تحميل الملاحظات…
                </div>
              ) : (
                <>
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value)
                      notesDirtyRef.current = true
                    }}
                    dir="rtl"
                    rows={10}
                    placeholder="دوّن أفكارك، روابط مهمة أو ما تريد متابعته قبل الجلسة القادمة..."
                    className="w-full resize-y rounded-2xl border border-[#22334A]/12 bg-slate-50/60 px-4 py-3.5 text-[13px] font-semibold text-[#22334A] shadow-inner outline-none ring-1 ring-transparent transition focus:border-[#2691C2]/35 focus:ring-[#2691C2]/20"
                  />
                  <p className="mt-2 text-[11px] font-semibold text-[#22334A]/40">
                    ملاحظاتك خاصة ولا تظهر للمدرب أو الإدارة
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── التقدم ──────────────────────────────────────────────────── */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              {/* Stats cards */}
              <div>
                <h2 className="mb-4 text-xl font-black text-[#22334A]">تقدّمك في هذه الدورة</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      label: 'التقدّم الإجمالي',
                      Icon: Layers,
                      value: `${progressPct}%`,
                      sub: totalLessons > 0 ? `${doneLessons} / ${totalLessons} درس مكتمل` : 'لا دروس مسجّلة بعد',
                      color: 'text-[#2691C2]',
                    },
                    {
                      label: 'الواجبات',
                      Icon: ClipboardList,
                      value: `${doneAssignments} / ${assignments.length}`,
                      sub: assignments.length > 0 ? 'واجب تم تسليمه' : 'لا واجبات ظاهرة حتى الآن',
                      color: 'text-[#EC943C]',
                    },
                    {
                      label: 'الجلسات',
                      Icon: Calendar,
                      value: `${upcomingSorted.length}`,
                      sub: upcomingSorted.length > 0
                        ? 'جلسة قادمة أو نشطة'
                        : `${sessionsMapped.filter((s) => s.status === 'completed').length} جلسة مكتملة`,
                      color: 'text-emerald-600',
                    },
                  ].map(({ label, value, Icon, sub, color }) => (
                    <motion.div
                      key={label}
                      whileHover={{ y: -2 }}
                      className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm ring-1 ring-[#22334A]/[0.04]"
                    >
                      <Icon className={`mb-3 h-5 w-5 ${color}`} />
                      <p className="text-[11px] font-black uppercase tracking-wide text-[#22334A]/50">{label}</p>
                      <p className="mt-2 text-2xl font-black tabular-nums text-[#22334A]">{value}</p>
                      {sub && <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#22334A]/50">{sub}</p>}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Instructor */}
              {instructor && (
                <div>
                  <h2 className="mb-3 text-lg font-black text-[#22334A]">المدرب المسؤول</h2>
                  <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm ring-1 ring-[#22334A]/[0.04]">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-bl from-[#22334A] to-[#2691C2] text-lg font-black text-white">
                      {instructor.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-[#22334A]">{instructor}</p>
                      <p className="mt-0.5 text-[12px] font-semibold text-[#22334A]/50">مدرب الدورة</p>
                    </div>
                    <Link
                      to="/dashboard/student/sessions"
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#22334A]/12 px-4 py-2 text-[12px] font-black text-[#22334A] transition hover:border-[#EC943C]/30"
                    >
                      <Calendar className="h-4 w-4" />
                      جلساتي مع المدرب
                    </Link>
                  </div>
                </div>
              )}

              {/* Completion status */}
              <div className={`rounded-3xl border p-6 ${
                progressPct >= 100
                  ? 'border-emerald-200/80 bg-gradient-to-bl from-emerald-50 to-teal-50/40'
                  : progressPct > 0
                    ? 'border-[#2691C2]/15 bg-gradient-to-bl from-blue-50/50 to-white/80'
                    : 'border-[#22334A]/[0.08] bg-white/80'
              }`}>
                <div className="flex flex-wrap items-center gap-4">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    progressPct >= 100 ? 'bg-emerald-100 text-emerald-600'
                    : progressPct > 0 ? 'bg-[#2691C2]/10 text-[#2691C2]'
                    : 'bg-[#22334A]/[0.06] text-[#22334A]/40'
                  }`}>
                    {progressPct >= 100 ? <Award className="h-6 w-6" />
                    : progressPct > 0 ? <GraduationCap className="h-6 w-6" />
                    : <BookOpen className="h-6 w-6" />}
                  </span>
                  <div className="flex-1">
                    <h3 className={`font-black ${progressPct >= 100 ? 'text-emerald-700' : 'text-[#22334A]'}`}>
                      {progressPct >= 100 ? 'أكملت الدورة بنجاح!'
                      : progressPct > 0 ? `استمر في التعلّم — ${progressPct}% مكتمل`
                      : 'ابدأ رحلة التعلّم'}
                    </h3>
                    <p className="mt-0.5 text-[12px] font-semibold text-[#22334A]/50">
                      {progressPct >= 100 ? 'يمكنك طلب شهادة إتمام الدورة من الإدارة.'
                      : progressPct > 0 ? 'أكمل الدروس والواجبات للوصول إلى 100%.'
                      : 'ابدأ بمراجعة الوحدات والدروس المتاحة.'}
                    </p>
                  </div>
                  {progressPct >= 100 && (
                    <Link
                      to="/dashboard/student/certificates"
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-[12px] font-black text-white shadow-md shadow-emerald-200 transition hover:opacity-90"
                    >
                      <Award className="h-4 w-4" />
                      شهاداتي
                    </Link>
                  )}
                </div>

                {progressPct > 0 && progressPct < 100 && (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-[11px] font-black text-[#22334A]/50">
                      <span>{progressPct}%</span>
                      <span>100%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#22334A]/[0.06]">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-l from-[#2691C2] to-[#EC943C]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AssignmentSubmitModal
        assignment={activeAssignment}
        onClose={() => setActiveAssignment(null)}
        onSuccess={async () => {
          await loadLearn()
          notifyStudentScopeRefresh()
        }}
      />
    </div>
  )
}
