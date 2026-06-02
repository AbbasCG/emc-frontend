import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import axios, { type AxiosError } from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronLeft,
  ClipboardList,
  ExternalLink,
  FolderOpen,
  Layers,
  LayoutList,
  RefreshCw,
  Sparkles,
  StickyNote,
  Video,
} from 'lucide-react'
import { getApiErrorMessage } from '@/api/apiErrors'
import {
  fetchStudentCourseLearn,
  mapCourseLearnAssignmentToStudentAssignment,
  mapCourseLearnMaterialToLmsMaterial,
  mapLearnSessionToLms,
} from '@/api/courseLearnApi'
import { STUDENT_SCOPE_REFRESH_EVENT } from '@/api/studentApi'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { AssignmentCard, LmsEmptyState, MaterialCard, SessionCard } from '@/components/lms'
import type { StudentCourseLearnPayload } from '@/types/courseLearn'
import type { LmsModule } from '@/types/platform'
import type { LmsSession } from '@/types/lms'
import logo from '@/assets/logo.png'
import { resolveCoursePkFromLikelyMisKey, studentLearnHref } from '@/utils/studentLearnNavigation'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'

const NOTES_KEY = (courseId: number) => `emc-student-learn-notes:${courseId}`

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
  if (s.includes('pending')) return 'معلّقة'
  if (s.includes('active') || s.includes('enrolled') || s.includes('approved')) return 'نشطة'
  return s ? status ?? '—' : '—'
}

function deriveProgressPct(learn: StudentCourseLearnPayload): number {
  if (typeof learn.progress_percent === 'number' && Number.isFinite(learn.progress_percent)) {
    return Math.min(100, Math.max(0, Math.round(learn.progress_percent)))
  }
  const mods = learn.modules
  if (!mods.length) return 0
  let lessons = 0
  let done = 0
  for (const m of mods) {
    lessons += Math.max(m.lessons_count ?? 0, 0)
    done += Math.max(m.completed_lessons ?? 0, 0)
  }
  if (lessons <= 0) return 0
  return Math.min(100, Math.round((done / lessons) * 100))
}

function ScrollNav({
  ids,
  moduleAnchors,
}: {
  ids: { id: string; label: string }[]
  moduleAnchors?: { id: string; label: string }[]
}) {
  const go = useCallback((e: ReactMouseEvent, id: string) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <>
      <nav
        aria-label="أقسام مساحة التعلّم"
        className="hidden lg:flex flex-col gap-1 rounded-3xl border border-white/35 bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl sticky top-24"
      >
        <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-deepBlue/45">التنقل</p>
        {ids.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={(ev) => go(ev, id)}
            className="rounded-2xl px-4 py-2.5 text-right text-[13px] font-black text-deepBlue/85 transition hover:bg-white/85 hover:text-customBlue"
          >
            {label}
          </button>
        ))}
        {moduleAnchors && moduleAnchors.length > 0 ?
          <>
            <p className="mb-1 mt-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-deepBlue/38">الوحدات</p>
            <div className="max-h-[14rem] space-y-0.5 overflow-y-auto pr-0.5">
              {moduleAnchors.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={(ev) => go(ev, id)}
                  className="w-full rounded-xl px-3 py-1.5 text-right text-[11px] font-bold text-deepBlue/70 transition hover:bg-white/80 hover:text-customBlue"
                >
                  <span className="line-clamp-2">{label}</span>
                </button>
              ))}
            </div>
          </>
        : null}
        <Link
          to="/dashboard/student/courses"
          className="mt-4 flex items-center justify-end gap-2 rounded-2xl border border-deepBlue/10 bg-deepBlue/[0.04] px-4 py-2.5 text-[12px] font-black text-deepBlue transition hover:border-customOrange/35"
        >
          العودة لدوراتي
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      </nav>
      <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[...ids, ...(moduleAnchors ?? [])].map(({ id, label }) => (
          <button
            key={`m-${id}`}
            type="button"
            onClick={(ev) => go(ev, id)}
            className="shrink-0 rounded-full border border-deepBlue/10 bg-white/80 px-4 py-2 text-[11px] font-black text-deepBlue shadow-sm backdrop-blur"
          >
            <span className="line-clamp-1">{label}</span>
          </button>
        ))}
      </div>
    </>
  )
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
  /** HTTP gate: 403 = not authorized, 404 = course not found — drives copy + escalation when UI shows registration. */
  const [gateError, setGateError] = useState<'forbidden' | 'missing' | null>(null)

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

  useEffect(() => {
    void loadLearn()
  }, [loadLearn])

  useEffect(() => {
    function onStudentScopeRefresh() {
      void softRefresh()
    }
    window.addEventListener(STUDENT_SCOPE_REFRESH_EVENT, onStudentScopeRefresh)
    return () => window.removeEventListener(STUDENT_SCOPE_REFRESH_EVENT, onStudentScopeRefresh)
  }, [softRefresh])

  const [notes, setNotes] = useState('')
  useEffect(() => {
    if (!validId) return
    try {
      setNotes(() => window.localStorage.getItem(NOTES_KEY(courseId)) ?? '')
    } catch {
      setNotes('')
    }
  }, [courseId, validId])

  useEffect(() => {
    if (!validId) return
    try {
      window.localStorage.setItem(NOTES_KEY(courseId), notes)
    } catch {
      /* ignore */
    }
  }, [notes, courseId, validId])

  const ctx = learn
  const courseTitle = ctx?.course?.title?.trim() || 'محتوى الدورة'
  const instructor = ctx?.course?.instructor_name?.trim() || ''
  const slug = ctx?.course?.slug?.trim() ?? undefined
  const regLabel = ctx?.registration_status ?? undefined

  const coverUrl = useMemo(() => resolvePublicAssetUrl(ctx?.course?.course_image ?? null), [ctx?.course?.course_image])

  const modulesLms = useMemo((): LmsModule[] => {
    if (!ctx?.modules?.length) return []
    return ctx.modules.map((m) => ({
      id: m.id,
      course_id: m.course_id ?? courseId,
      title: m.title,
      sort_order: m.sort_order,
      lessons_count: m.lessons_count,
      completed_lessons: m.completed_lessons,
    }))
  }, [ctx?.modules, courseId])

  const moduleAnchors = useMemo(() => modulesLms.map((m) => ({ id: `learn-module-${m.id}`, label: m.title })), [modulesLms])

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
    const raw = (ctx?.assignments ?? []).filter((a) => a.visible !== false)
    return raw.map((a) => mapCourseLearnAssignmentToStudentAssignment(a, { courseId, courseTitle }))
  }, [ctx?.assignments, courseId, courseTitle])

  const progressPct = useMemo(() => (ctx ? deriveProgressPct(ctx) : 0), [ctx])

  const nextSession = upcomingSorted[0]

  const navIds = useMemo(
    () => [
      { id: 'learn-hero', label: 'نظرة عامة' },
      { id: 'learn-modules', label: 'الوحدات' },
      { id: 'learn-sessions', label: 'الجلسات' },
      { id: 'learn-materials', label: 'المواد' },
      { id: 'learn-assignments', label: 'الواجبات' },
      { id: 'learn-progress', label: 'التقدّم' },
      { id: 'learn-workshops', label: 'ورش' },
      { id: 'learn-notes', label: 'ملاحظاتي' },
    ],
    [],
  )

  if (!validId) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-8 text-center text-deepBlue">
        <p className="font-black">معرّف الدورة غير صالح.</p>
        <Link to="/dashboard/student/courses" className="mt-4 inline-block font-bold text-customBlue underline">
          العودة لدوراتي
        </Link>
      </div>
    )
  }

  if (learnLoading && !ctx && redirectCoursePk == null) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-56 rounded-3xl bg-slate-200/90" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
          <div className="h-80 rounded-3xl bg-slate-100" />
          <div className="h-[28rem] rounded-3xl bg-slate-100" />
        </div>
      </div>
    )
  }

  if (gateError !== null) {
    const escalation = gateError === 'forbidden' && clientKnowsRegistered
    const title =
      gateError === 'missing' ? 'لم يُعثر على هذه الدورة'
      : escalation ? 'مساحة التعلّم غير متاحة رغم وجود تسجيل لك'
      : 'لا يمكن عرض هذه المساحة'
    const body =
      gateError === 'missing' ?
        clientKnowsRegistered ?
          <p className="mx-auto mt-2 max-w-lg text-[13px] font-semibold text-deepBlue/60">
            يبدو أن الرابط لا يطابق الصف الذي يعرضه الخادم. جرّب فتح الدورة من قائمة{' '}
            <Link className="font-black text-customBlue underline" to="/dashboard/student/courses">
              دوراتي
            </Link>
            .
          </p>
        : <p className="mx-auto mt-2 max-w-md text-[13px] font-semibold text-deepBlue/60">
            لا توجد دورة بهذا المعرف على الخادم.
          </p>
      : escalation ?
        <p className="mx-auto mt-2 max-w-lg text-[13px] font-semibold text-deepBlue/60">
          لوحة الطالب تعرض هذه الدورة ضمن تسجيلاتك، لكن واجهة التعلّم رفضت الطلب (<span className="font-mono">403</span>).
          عادةً يرتبط ذلك بعدم ربط سجلّ التسجيل بحسابك (<span className="font-mono">user_id</span> فارغ) أو بشرط مختلف على الخادم. اطلب
          من المطوّر مطابقة التسجيل عبر المعرف أو البريد كما في سياسة التحقق الموحّدة.
        </p>
      : <p className="mx-auto mt-2 max-w-md text-[13px] font-semibold text-deepBlue/60">
          هذه الدورة غير مفعّلة لحسابك الحالي. إذا كنت مسجّلاً للتو، انتظر قليلاً ثم حدّث الصفحة.
        </p>

    return (
      <div className="rounded-3xl border border-deepBlue/10 bg-white/90 p-10 text-center shadow-xl ring-1 ring-deepBlue/[0.04]">
        <BookOpen className="mx-auto h-12 w-12 text-customBlue" aria-hidden />
        <h1 className="mt-4 text-xl font-black text-deepBlue">{title}</h1>
        {body}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void loadLearn()}
            className="rounded-2xl border border-deepBlue/15 px-6 py-2.5 text-[12px] font-black text-deepBlue"
          >
            إعادة المحاولة
          </button>
          <Link
            to="/dashboard/student/courses"
            className="rounded-2xl bg-deepBlue px-6 py-2.5 text-[12px] font-black text-white"
          >
            دوراتي
          </Link>
          <Link
            to="/dashboard/student/available-courses"
            className="rounded-2xl border border-customOrange/40 px-6 py-2.5 text-[12px] font-black text-deepBlue"
          >
            دورات متاحة
          </Link>
        </div>
      </div>
    )
  }

  if (learnError && !ctx) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50/85 p-10 text-center text-deepBlue">
        <p className="font-black text-deepBlue">{learnError}</p>
        <button
          type="button"
          onClick={() => void loadLearn()}
          className="mt-6 rounded-2xl bg-deepBlue px-6 py-2.5 text-[12px] font-black text-white"
        >
          إعادة المحاولة
        </button>
        <Link to="/dashboard/student/courses" className="mt-4 block text-[12px] font-bold text-customBlue underline">
          العودة لدوراتي
        </Link>
      </div>
    )
  }

  if (!ctx) {
    return null
  }

  return (
    <div className="space-y-8 pb-20 text-right rtl" dir="rtl">
      {/* Hero */}
      <section
        id="learn-hero"
        className="relative overflow-hidden scroll-mt-28 rounded-[2rem] border border-white/20 bg-gradient-to-bl from-deepBlue via-[#1f3049] to-[#2691c2] p-[1px] shadow-[0_32px_80px_-36px_rgba(34,51,74,0.75)]"
      >
        <div className="relative overflow-hidden rounded-[calc(2rem-1px)] bg-gradient-to-tl from-deepBlue/95 via-deepBlue/80 to-customBlue/40 px-6 py-10 sm:px-10">
          <div aria-hidden className="pointer-events-none absolute -left-28 top-0 h-64 w-64 rounded-full bg-customOrange/35 blur-[100px]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 right-[-10%] h-72 w-72 rounded-full bg-white/12 blur-[90px]" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-black text-white/70">
                <Link to="/dashboard/student/courses" className="hover:text-white">
                  دوراتي
                </Link>
                <span className="opacity-45">/</span>
                <span className="text-white">مساحة التعلّم</span>
              </div>

              <div className="flex flex-wrap items-start gap-5">
                <div className="flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/12 ring-1 ring-white/20">
                  {coverUrl ?
                    <img src={coverUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                  : <img src={logo} alt="" className="h-12 w-auto opacity-92" width={160} height={48} loading="lazy" draggable={false} />}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <h1 className="text-[1.65rem] font-black leading-snug text-white sm:text-[2rem]">{courseTitle}</h1>
                  <p className="text-[13px] font-bold text-white/78">
                    المدرب:{' '}
                    {instructor || <span className="opacity-85">لم يتم تعيين مدرب بعد</span>}
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white backdrop-blur">
                      التسجيل: {statusArabic(regLabel)}
                    </span>
                    {slug ?
                      <Link
                        to={`/courses/${slug}`}
                        className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-white/10 px-3 py-1 text-[11px] font-black text-white transition hover:bg-white/18"
                      >
                        صفحة الدورة العامّة
                        <ExternalLink className="h-3 w-3 opacity-75" aria-hidden />
                      </Link>
                    : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid w-full max-w-md shrink-0 gap-4 rounded-3xl border border-white/22 bg-white/10 p-6 backdrop-blur-xl sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center justify-between gap-4">
                <span className="text-[11px] font-black uppercase tracking-widest text-white/65">التقدّم</span>
                <span className="text-3xl font-black tracking-tight text-white tabular-nums">{progressPct}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10 sm:col-span-2">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-l from-customOrange to-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>
              <div className="rounded-2xl border border-white/15 bg-deepBlue/25 p-4 text-white">
                <div className="flex items-center justify-end gap-2 text-[10px] font-black uppercase text-white/65">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  الجلسة التالية
                </div>
                {nextSession ?
                  <div className="mt-2 space-y-1">
                    <p className="text-[13px] font-black leading-snug">{nextSession.title ?? nextSession.course_name}</p>
                    <p className="text-[11px] font-bold text-white/75" dir="ltr">
                      {nextSession.starts_at ?? nextSession.date ?? '—'}
                      {nextSession.time ? ` · ${nextSession.time}` : ''}
                    </p>
                    {nextSession.meeting_link && nextSession.status !== 'completed' ?
                      <a
                        href={nextSession.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[12px] font-black text-deepBlue hover:bg-orange-50"
                      >
                        <Video className="h-4 w-4 text-customOrange" aria-hidden />
                        انضم للجلسة
                      </a>
                    : (
                      <p className="mt-2 rounded-xl border border-sky-200/35 bg-white/10 px-2 py-1.5 text-[10px] font-bold leading-relaxed">
                        سيتم إشعارك عند تحديد الموعد أو عند توفر الرابط من الخادم
                      </p>
                    )}
                  </div>
                : (
                  <p className="mt-2 text-[12px] font-bold text-white/75">
                    لا جلسات قادمة في الجدول — سيظهر هنا كل ما يضيفه الفريق على الخادم.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/12 p-4 text-[12px] font-bold leading-relaxed text-white/92">
                <p className="text-[10px] font-black uppercase text-white/60">من الخادم</p>
                <p className="mt-2">
                  المواد: <span className="font-black text-white">{materials.length}</span> · الواجبات المرئية:{' '}
                  <span className="font-black text-white">{assignments.length}</span> · الجلسات:{' '}
                  <span className="font-black text-white">{sessionsMapped.length}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-8 flex flex-wrap justify-end gap-3">
            {learnError ?
              <span className="rounded-2xl border border-amber-200/55 bg-white/15 px-3 py-2 text-[11px] font-bold text-amber-100">
                {learnError}
              </span>
            : null}
            <button
              type="button"
              onClick={() => void softRefresh()}
              disabled={refreshing || learnLoading}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-2.5 text-[12px] font-black text-white backdrop-blur hover:bg-white/18 disabled:opacity-55"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              {refreshing ? 'جارٍ التحديث…' : 'تحديث من الخادم'}
            </button>
            <Link
              to={`/dashboard/courses/${courseId}/modules`}
              className="inline-flex items-center gap-2 rounded-2xl bg-customOrange px-5 py-2.5 text-[12px] font-black text-white shadow-lg shadow-orange-900/35 hover:brightness-105"
            >
              <Layers className="h-4 w-4" aria-hidden />
              الوحدات والدروس (المخطّط التفصيلي)
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,268px)_1fr] lg:items-start">
        <ScrollNav ids={navIds} moduleAnchors={moduleAnchors} />

        <div className="min-w-0 space-y-12">
          {/* Modules */}
          <section id="learn-modules" className="scroll-mt-28">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-deepBlue">المنهاج والوحدات</h2>
                <p className="mt-2 max-w-2xl text-[13px] font-semibold text-deepBlue/60">
                  بيانات مباشرة من <span className="font-mono text-[11px]">GET /student/courses/{'{id}'}/learn</span>
                </p>
              </div>
            </div>
            {modulesLms.length === 0 ?
              <div className="rounded-3xl border border-deepBlue/[0.08] bg-white/70 p-8 text-[13px] font-semibold leading-relaxed text-deepBlue/70 shadow-inner backdrop-blur">
                لا توجد وحدات مربوطة بهذه الدورة في استجابة الخادم — عندما تضيف الإدارة وحدات، ستُعرض هنا تلقائياً.
              </div>
            : (
              <div className="grid gap-4 sm:grid-cols-2">
                {modulesLms.map((m, idx) => {
                  const done = Math.max(0, m.completed_lessons ?? 0)
                  const pct = Math.round((done / Math.max(m.lessons_count, 1)) * 100)
                  return (
                    <motion.div
                      key={m.id}
                      id={`learn-module-${m.id}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="scroll-mt-28 rounded-3xl border border-white/50 bg-white/75 p-5 shadow-emc backdrop-blur-md ring-1 ring-deepBlue/[0.04]"
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-bl from-deepBlue to-customBlue text-sm font-black text-white">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-deepBlue">{m.title}</h3>
                          <p className="mt-2 text-[11px] font-bold text-slate-500">
                            الدروس: {m.lessons_count} — المكتمل: {done}
                          </p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-gradient-to-l from-customBlue to-customOrange" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Sessions */}
          <section id="learn-sessions" className="scroll-mt-28 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-deepBlue/[0.06] bg-gradient-to-bl from-white/95 to-orange-50/20 p-6 shadow-sm ring-1 ring-deepBlue/[0.04] backdrop-blur">
              <div>
                <h2 className="text-xl font-black text-deepBlue">الجلسات المباشرة</h2>
                <p className="mt-2 text-[13px] font-semibold text-deepBlue/60">
                  المواعيد وروابط Google Meet أو Zoom وفقاً لما يعيده الخادم في كائن الدورة نفسها.
                </p>
              </div>
              <Sparkles className="h-7 w-7 text-customOrange/90" aria-hidden />
            </div>
            {sessionsMapped.length === 0 ?
              <div className="rounded-3xl border border-deepBlue/[0.06] bg-white/75 p-6 backdrop-blur">
                <LmsEmptyState
                  icon={Calendar}
                  title="لا جلسات حتى الآن"
                  description="عندما تُنشأ الجلسات من لوحة المحتوى، ستظهر هنا مع الموعد والروابط الحقيقية."
                />
              </div>
            : (
              <div className="grid gap-4">
                {sessionsMapped.map((s) => (
                  <SessionCard key={s.id} session={s} showRecording joinMeetingLabel="انضم للجلسة" />
                ))}
              </div>
            )}
          </section>

          {/* Materials */}
          <section id="learn-materials" className="scroll-mt-28">
            <h2 className="mb-4 text-xl font-black text-deepBlue">المقررات والمواد</h2>
            {materials.length === 0 ?
              <div className="rounded-3xl bg-white/80 p-2 ring-1 ring-deepBlue/[0.06] backdrop-blur">
                <LmsEmptyState
                  icon={FolderOpen}
                  title="لا مواد لهذه الدورة بعد"
                  description="بعد أن يرفع الفريق ملفاتاً أو روابط عبر لوحة المحتوى، ستظهر هنا مع أزرار التحميل أو الفتح."
                />
              </div>
            : (
              <div className="grid gap-4 sm:grid-cols-2">
                {materials.map((m) => (
                  <MaterialCard key={m.id} material={m} />
                ))}
              </div>
            )}
          </section>

          {/* Assignments */}
          <section id="learn-assignments" className="scroll-mt-28">
            <h2 className="mb-4 text-xl font-black text-deepBlue">الواجبات والتكليفات</h2>
            {assignments.length === 0 ?
              <div className="rounded-3xl bg-white/80 ring-1 ring-deepBlue/[0.06] backdrop-blur">
                <LmsEmptyState
                  icon={ClipboardList}
                  title="لا واجبات ظاهرة"
                  description="عند إضافة واجبات من لوحة المحتوى، ستُعرض هنا مع الموعد وحالة التسليم من الخادم."
                />
              </div>
            : (
              <div className="grid gap-4">
                {assignments.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    onSubmit={
                      ['pending', 'revision', 'late'].includes(String(a.status)) ?
                        () => void navigate('/dashboard/student/assignments')
                      : undefined
                    }
                  />
                ))}
                <Link
                  to="/dashboard/student/assignments"
                  className="inline-flex items-center justify-end gap-2 text-[12px] font-black text-customBlue hover:underline"
                >
                  فتح كل الواجبات
                  <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden />
                </Link>
              </div>
            )}
          </section>

          {/* Progress block */}
          <section id="learn-progress" className="scroll-mt-28 space-y-4">
            <h2 className="text-xl font-black text-deepBlue">التقدّم ضمن هذه الدورة</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  label: 'التقدّم الإجمالي',
                  Icon: Layers,
                  value: `${progressPct}%`,
                  hint:
                    typeof ctx.progress_percent === 'number'
                      ? 'القيمة من حقل التقدّم في استجابة التعلّم.'
                      : 'محسوبة من إكمال الدروس ضمن الوحدات عند عدم توفير النسبة من الخادم.',
                },
                {
                  label: 'الوحدات',
                  Icon: BookOpen,
                  value: `${modulesLms.length}`,
                  hint: 'عدد الوحدات في الجواب الحالي للتعلّم.',
                },
                {
                  label: 'الجلسات المخطّطة / المجدولة',
                  Icon: Calendar,
                  value: `${sessionsMapped.filter((s) => s.status !== 'completed').length} نشطة`,
                  hint: `${sessionsMapped.filter((s) => s.status === 'completed').length} مكتملة في نفس المصدر.`,
                },
              ].map(({ label, value, Icon, hint }) => (
                <motion.div
                  key={label}
                  whileHover={{ y: -2 }}
                  className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-inner backdrop-blur"
                >
                  <Icon className="mb-3 h-5 w-5 text-customOrange" aria-hidden />
                  <p className="text-[11px] font-black uppercase tracking-wide text-deepBlue/50">{label}</p>
                  <p className="mt-2 font-latin text-2xl font-black text-deepBlue tabular-nums">{value}</p>
                  {hint ?
                    <p className="mt-2 text-[11px] font-semibold leading-relaxed text-deepBlue/50">{hint}</p>
                  : null}
                </motion.div>
              ))}
            </div>
            <div className="rounded-3xl border border-dashed border-customBlue/35 bg-customBlue/[0.04] p-5 text-[12px] font-semibold leading-relaxed text-deepBlue/75">
              <strong className="font-black text-deepBlue">مسارات إضافية:</strong>{' '}
              يمكن متابعة الاختبارات والأنشطة العامة من مساحة التعلّم الموحّدة.
              <Link to="/dashboard/learning" className="mr-2 inline-block font-black text-customBlue underline">
                فتح مسار التعلّم
              </Link>
            </div>
          </section>

          {/* Workshops */}
          <section id="learn-workshops" className="scroll-mt-28 rounded-3xl border border-orange-100/95 bg-orange-50/45 p-6 shadow-sm ring-1 ring-orange-100/80 backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <h2 className="text-xl font-black text-deepBlue">طلب ورشة تكميلية</h2>
                <p className="mt-2 text-[13px] font-semibold text-deepBlue/65">
                  لا نعرض ورشاً وهمياً هنا؛ يمكنك طلب ورشة حقيقية عبر النموذج الرسمي.
                </p>
              </div>
              <Link
                to="/submit-workshop"
                className="inline-flex items-center gap-2 rounded-2xl bg-customOrange px-5 py-2.5 text-[12px] font-black text-white shadow-md hover:brightness-105"
              >
                <LayoutList className="h-4 w-4" aria-hidden />
                طلب ورشة
              </Link>
            </div>
          </section>

          {/* Notes */}
          <section id="learn-notes" className="scroll-mt-28 rounded-3xl border border-deepBlue/[0.08] bg-white/82 p-6 shadow-emc backdrop-blur">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-black text-deepBlue">
                <StickyNote className="h-5 w-5 text-customOrange" aria-hidden />
                ملاحظاتي
              </h2>
              <p className="text-[11px] font-semibold text-deepBlue/48">محفوظة على هذا الجهاز فقط.</p>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              dir="rtl"
              rows={6}
              placeholder="دوّن أفكارك، روابط مهمة أو ما تريد متابعته قبل الجلسة القادمة..."
              className="w-full resize-y rounded-2xl border border-deepBlue/12 bg-emcBg/40 px-4 py-3 text-[13px] font-semibold text-deepBlue shadow-inner outline-none ring-1 ring-transparent transition focus:border-customBlue/35 focus:ring-customBlue/20"
            />
          </section>
        </div>
      </div>
    </div>
  )
}
