import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios, { type AxiosError } from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FolderOpen,
  Hourglass,
  RefreshCw,
  StickyNote,
  TrendingUp,
  Users,
  Video,
  XCircle,
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
import { STUDENT_SCOPE_REFRESH_EVENT, notifyStudentScopeRefresh, fetchStudentCoursesList } from '@/api/studentApi'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { AssignmentSubmitModal } from '@/components/lms'
import type { StudentAssignment } from '@/types/lms'
import type { CourseLearnAssignment, StudentCourseLearnPayload } from '@/types/courseLearn'
import type { LmsModule } from '@/types/platform'
import type { LmsSession } from '@/types/lms'
import logo from '@/assets/logo.png'
import { resolveCoursePkFromLikelyMisKey, studentLearnHref } from '@/utils/studentLearnNavigation'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { formatSessionSchedule, getSessionJoinState } from '@/utils/lmsSession'
import UnitsTab from './learn-tabs/UnitsTab'
import SessionsTab from './learn-tabs/SessionsTab'
import MaterialsTab, { type MaterialEntry } from './learn-tabs/MaterialsTab'
import AssignmentsTab, { type AssignmentEntry } from './learn-tabs/AssignmentsTab'
import NotesTab from './learn-tabs/NotesTab'
import ProgressTab from './learn-tabs/ProgressTab'

const NOTES_KEY = (courseId: number) => `emc-student-learn-notes:${courseId}`

type LearnTab = 'modules' | 'sessions' | 'materials' | 'assignments' | 'notes' | 'progress'

type GateError =
  | 'forbidden'
  | 'forbidden_sync'
  | 'missing'
  | 'placement_required'
  | 'placement_oral'
  | 'payment_pending'
  | 'payment_failed'
  | 'payment_required'
  | null

/** Production hotfix — canonical backend access block attached to a 403, when present. */
type LearnGateAccess = {
  payment_url?: string | null
  block_reason?: string | null
} | null

function parseLearnGateError(e: unknown): { gate: GateError; message: string | null; access: LearnGateAccess } {
  if (!axios.isAxiosError(e)) return { gate: null, message: null, access: null }
  const status = e.response?.status
  const body = e.response?.data as { placement_status?: string; message?: string; access?: LearnGateAccess } | undefined
  const access = body?.access ?? null
  if (status === 404) return { gate: 'missing', message: body?.message ?? null, access }
  if (status === 403) {
    const ps = body?.placement_status
    // Payment must be evaluated before placement state — these reason codes
    // come straight from the backend's canonical access block, never
    // re-derived here (production hotfix).
    if (ps === 'payment_pending') return { gate: 'payment_pending', message: body?.message ?? null, access }
    if (ps === 'payment_failed') return { gate: 'payment_failed', message: body?.message ?? null, access }
    if (ps === 'payment_required' || ps === 'no_registration' || ps === 'registration_cancelled') {
      return { gate: 'payment_required', message: body?.message ?? null, access }
    }
    if (ps === 'placement_required') return { gate: 'placement_required', message: body?.message ?? null, access }
    if (ps === 'written_completed') return { gate: 'placement_oral', message: body?.message ?? null, access }
    return { gate: 'forbidden', message: body?.message ?? null, access }
  }
  return { gate: null, message: null, access: null }
}

async function isCourseListedForStudent(courseId: number): Promise<boolean> {
  const listed = await fetchStudentCoursesList()
  return listed.some((c) => c.id === courseId)
}

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
  const [gateError, setGateError] = useState<GateError>(null)
  const [gatePaymentUrl, setGatePaymentUrl] = useState<string | null>(null)
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

  const { registrations, enrollmentsMerged, registeredCourseIds, loading: dashboardLoading, refresh: refreshDashboard } = useStudentDashboardData()

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

  const loadLearn = useCallback(async (opts?: { refreshEnrollment?: boolean }) => {
    if (!validId) return
    setLearnError(null)
    setGateError(null)
    setGatePaymentUrl(null)
    setLearnLoading(true)
    if (opts?.refreshEnrollment) {
      try { await refreshDashboard() } catch { /* non-fatal */ }
    }
    try {
      const data = await fetchStudentCourseLearn(courseId)
      setLearn(data)
    } catch (e) {
      setLearn(null)
      const { gate, message, access } = parseLearnGateError(e)
      if (gate === 'missing') {
        setGateError('missing')
      } else if (gate === 'payment_pending' || gate === 'payment_failed' || gate === 'payment_required') {
        setGateError(gate)
        setGatePaymentUrl(access?.payment_url ?? null)
        if (message) setLearnError(message)
      } else if (gate === 'placement_required' || gate === 'placement_oral') {
        setGateError(gate)
        if (message) setLearnError(message)
      } else if (gate === 'forbidden') {
        let enrolledInList = registeredCourseIds.has(courseId)
          || registrations.some((r) => r.course_id === courseId)
          || enrollmentsMerged.some((en) => en.course.id === courseId)
        if (!enrolledInList) {
          try { enrolledInList = await isCourseListedForStudent(courseId) } catch { /* ignore */ }
        }
        setGateError(enrolledInList ? 'forbidden_sync' : 'forbidden')
      } else {
        setLearnError(message ?? getApiErrorMessage(e as AxiosError) ?? 'تعذّر تحميل مساحة التعلّم.')
      }
    } finally {
      setLearnLoading(false)
    }
  }, [courseId, validId, registeredCourseIds, registrations, enrollmentsMerged, refreshDashboard])

  const softRefresh = useCallback(async () => {
    if (!validId) return
    setLearnError(null)
    setGateError(null)
    setGatePaymentUrl(null)
    setRefreshing(true)
    try {
      const data = await fetchStudentCourseLearn(courseId)
      setLearn(data)
    } catch (e) {
      setLearn(null)
      const { gate, message, access } = parseLearnGateError(e)
      if (gate === 'missing') setGateError('missing')
      else if (gate === 'payment_pending' || gate === 'payment_failed' || gate === 'payment_required') {
        setGateError(gate)
        setGatePaymentUrl(access?.payment_url ?? null)
        if (message) setLearnError(message)
      }
      else if (gate === 'placement_required' || gate === 'placement_oral') {
        setGateError(gate)
        if (message) setLearnError(message)
      } else if (gate === 'forbidden') {
        let enrolledInList = registeredCourseIds.has(courseId)
          || registrations.some((r) => r.course_id === courseId)
          || enrollmentsMerged.some((en) => en.course.id === courseId)
        if (!enrolledInList) {
          try { enrolledInList = await isCourseListedForStudent(courseId) } catch { /* ignore */ }
        }
        setGateError(enrolledInList ? 'forbidden_sync' : 'forbidden')
      } else {
        setLearnError(message ?? getApiErrorMessage(e as AxiosError) ?? 'تعذّر تحميل مساحة التعلّم.')
      }
    } finally {
      setRefreshing(false)
    }
  }, [courseId, validId, registeredCourseIds, registrations, enrollmentsMerged])

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

  const materialEntries = useMemo((): MaterialEntry[] => {
    const raw = ctx?.materials ?? []
    return raw.map((m) => ({
      material: mapCourseLearnMaterialToLmsMaterial(m, { courseId, courseTitle }),
      moduleId: m.module_id ?? null,
    }))
  }, [ctx?.materials, courseId, courseTitle])

  const moduleTitleById = useMemo(() => {
    const map = new Map<number, string>()
    for (const m of ctx?.modules ?? []) map.set(m.id, m.title)
    return map
  }, [ctx?.modules])

  const rawAssignmentsDeduped = useMemo((): CourseLearnAssignment[] => {
    const seen = new Set<number>()
    const raw: CourseLearnAssignment[] = []

    // Course-level assignments first — add their IDs to `seen` so module-level
    // duplicates (same CA appearing in both buckets) are filtered out.
    for (const a of ctx?.assignments ?? []) {
      if (!seen.has(a.id)) {
        seen.add(a.id)
        raw.push(a)
      }
    }
    // Module-level assignments, deduped against course-level AND each other.
    for (const mod of ctx?.modules ?? []) {
      for (const a of mod.assignments ?? []) {
        if (!seen.has(a.id)) {
          seen.add(a.id)
          raw.push(a)
        }
      }
    }
    return raw.filter((a) => a.visible !== false)
  }, [ctx?.assignments, ctx?.modules])

  const assignmentEntries = useMemo((): AssignmentEntry[] => {
    const finalSeen = new Set<number>()
    const out: AssignmentEntry[] = []
    for (const a of rawAssignmentsDeduped) {
      const sa = mapCourseLearnAssignmentToStudentAssignment(a, { courseId, courseTitle })
      if (!sa || finalSeen.has(sa.id)) continue
      finalSeen.add(sa.id)
      out.push({
        assignment: sa,
        moduleId: a.module_id ?? null,
        required: a.is_required ?? a.required ?? true,
      })
    }
    return out
  }, [rawAssignmentsDeduped, courseId, courseTitle])

  const assignments = useMemo(() => assignmentEntries.map((e) => e.assignment), [assignmentEntries])

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

  if ((learnLoading || dashboardLoading) && !ctx && redirectCoursePk == null) {
    return (
      <div className="animate-pulse space-y-6" dir="rtl">
        <div className="h-52 rounded-3xl bg-slate-200/90" />
        <div className="h-12 rounded-2xl bg-slate-100" />
        <div className="h-80 rounded-3xl bg-slate-100" />
      </div>
    )
  }

  // Production hotfix — dedicated unpaid-course state. Payment is always
  // evaluated before placement-test state (never shows the placement-test
  // start/retry actions here), per the canonical backend access block.
  if (gateError === 'payment_pending' || gateError === 'payment_failed' || gateError === 'payment_required') {
    const Icon = gateError === 'payment_failed' ? XCircle : gateError === 'payment_pending' ? Hourglass : CreditCard
    const iconColor = gateError === 'payment_failed' ? 'text-red-500' : 'text-customOrange'
    const title =
      gateError === 'payment_pending' ? 'الدفع قيد المراجعة'
      : gateError === 'payment_failed' ? 'لم تكتمل عملية الدفع'
      : 'يلزم إكمال الدفع أولاً'
    const body =
      gateError === 'payment_pending'
        ? 'تم تسجيل عملية الدفع، وهي الآن قيد المراجعة. ستتمكن من بدء اختبار تحديد المستوى بعد اعتماد الدفع.'
      : gateError === 'payment_failed'
        ? 'تعذر تأكيد عملية الدفع. يرجى إعادة المحاولة للمتابعة إلى اختبار تحديد المستوى ومحتوى الدورة.'
      : 'لا يمكنك بدء اختبار تحديد المستوى أو الوصول إلى محتوى هذه الدورة قبل إتمام عملية الدفع بنجاح.'

    return (
      <div className="rounded-3xl border border-[#22334A]/10 bg-white/90 p-10 text-center shadow-xl" dir="rtl">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ${iconColor}`}>
          <Icon className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-black text-[#22334A]">{title}</h1>
        <p className="mx-auto mt-2 max-w-lg text-[13px] font-semibold leading-relaxed text-[#22334A]/60">
          {body}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {gateError !== 'payment_pending' && (
            gatePaymentUrl ? (
              <a
                href={gatePaymentUrl}
                className="rounded-2xl bg-customOrange px-6 py-2.5 text-[12px] font-black text-white transition hover:brightness-105"
              >
                إكمال الدفع
              </a>
            ) : (
              <Link
                to="/dashboard/student/courses"
                className="rounded-2xl bg-customOrange px-6 py-2.5 text-[12px] font-black text-white transition hover:brightness-105"
              >
                إكمال الدفع
              </Link>
            )
          )}
          <button
            type="button"
            onClick={() => {
              notifyStudentScopeRefresh()
              void loadLearn({ refreshEnrollment: true })
            }}
            className="rounded-2xl border border-[#22334A]/15 px-6 py-2.5 text-[12px] font-black text-[#22334A]"
          >
            إعادة التحقق من حالة الدفع
          </button>
          <Link to="/dashboard/student/courses" className="rounded-2xl bg-[#22334A] px-6 py-2.5 text-[12px] font-black text-white">
            العودة إلى دوراتي
          </Link>
        </div>
      </div>
    )
  }

  if (gateError !== null) {
    const title =
      gateError === 'missing' ? 'لم يُعثر على هذه الدورة'
      : gateError === 'placement_required' ? 'اختبار تحديد المستوى مطلوب'
      : gateError === 'placement_oral' ? 'المقابلة الشفوية مطلوبة'
      : gateError === 'forbidden_sync' ? 'تعذّر فتح محتوى الدورة مؤقتاً'
      : 'لا يمكنك الوصول إلى محتوى هذه الدورة'

    const body =
      gateError === 'placement_required'
        ? 'أكمل اختبار تحديد المستوى الكتابي من صفحة دوراتي قبل الدخول إلى محتوى هذه الدورة.'
      : gateError === 'placement_oral'
        ? 'احجز موعد المقابلة الشفوية من صفحة دوراتي قبل الدخول إلى محتوى هذه الدورة.'
      : gateError === 'forbidden_sync'
        ? 'أنت مسجّل في هذه الدورة في دوراتي، لكن التحقق من الوصول لم ينجح بعد. جرّب إعادة المحاولة أو افتح الدورة من دوراتي مرة أخرى.'
      : gateError === 'forbidden'
        ? 'تأكّد من تسجيلك في هذه الدورة عبر مسارك التعليمي أو من صفحة دوراتي.'
      : clientKnowsRegistered
        ? 'يبدو أن الرابط لا يطابق الدورة المسجّلة. جرّب فتح الدورة من صفحة دوراتي.'
        : 'تحقّق من الرابط أو تواصل مع الإدارة.'

    return (
      <div className="rounded-3xl border border-[#22334A]/10 bg-white/90 p-10 text-center shadow-xl" dir="rtl">
        <BookOpen className="mx-auto h-12 w-12 text-[#2691C2]" aria-hidden />
        <h1 className="mt-4 text-xl font-black text-[#22334A]">{title}</h1>
        <p className="mx-auto mt-2 max-w-lg text-[13px] font-semibold text-[#22334A]/60">
          {body}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {gateError === 'placement_required' && (
            <Link
              to={`/dashboard/student/courses/${courseId}/placement-test`}
              className="rounded-2xl bg-amber-500 px-6 py-2.5 text-[12px] font-black text-white"
            >
              ابدأ اختبار تحديد المستوى
            </Link>
          )}
          {gateError === 'placement_oral' && (
            <Link
              to={`/dashboard/student/courses/${courseId}/oral-booking`}
              className="rounded-2xl bg-[#2691C2] px-6 py-2.5 text-[12px] font-black text-white"
            >
              حجز المقابلة الشفوية
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              notifyStudentScopeRefresh()
              void loadLearn({ refreshEnrollment: true })
            }}
            className="rounded-2xl border border-[#22334A]/15 px-6 py-2.5 text-[12px] font-black text-[#22334A]"
          >
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
      {/*
        Deliberately NOT AnimatePresence mode="wait": that mode blocks the new
        tab from mounting until the outgoing one's exit animation resolves.
        Child tab components (Units/Sessions/Materials/etc.) each run their own
        nested Framer Motion animations (skeletons, staggered lists), and a
        nested animation's promise can prevent the parent's exit from ever
        completing — which silently froze tab-switching entirely (verified
        live: state updated correctly, DOM never re-rendered). A plain keyed
        fade-in gives the same "tab content fade/slide" feel without the risk.
      */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >

          {activeTab === 'modules' && (
            <UnitsTab
              ctx={ctx}
              courseId={courseId}
              courseTitle={courseTitle}
              totalLessons={totalLessons}
              openModules={openModules}
              onToggleModule={toggleModule}
              onSubmitAssignment={setActiveAssignment}
              loading={learnLoading}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionsTab sessions={sessionsMapped} loading={learnLoading} />
          )}

          {activeTab === 'materials' && (
            <MaterialsTab entries={materialEntries} moduleTitleById={moduleTitleById} loading={learnLoading} />
          )}

          {activeTab === 'assignments' && (
            <AssignmentsTab
              entries={assignmentEntries}
              moduleTitleById={moduleTitleById}
              onSubmitAssignment={setActiveAssignment}
              loading={learnLoading}
            />
          )}

          {activeTab === 'notes' && (
            <NotesTab
              notes={notes}
              onChangeNotes={setNotes}
              onSave={handleSaveNotes}
              loading={notesLoading}
              saving={notesSaving}
              savedAt={notesSavedAt}
              error={notesError}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressTab
              progressPct={progressPct}
              totalLessons={totalLessons}
              doneLessons={doneLessons}
              doneAssignments={doneAssignments}
              assignmentsCount={assignments.length}
              upcomingCount={upcomingSorted.length}
              completedSessionsCount={sessionsMapped.filter((s) => s.status === 'completed').length}
              instructor={instructor}
              modules={ctx.modules}
            />
          )}
      </motion.div>

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
