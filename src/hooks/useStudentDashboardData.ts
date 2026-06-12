import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchCoursesFromApi } from '@/api/coursesApi.public'
import { fetchNotifications, isNotificationUnread } from '@/api/notificationsApi'
import {
  STUDENT_SCOPE_REFRESH_EVENT,
  fetchStudentAssignments,
  fetchStudentAvailableCourses,
  fetchStudentCoursesList,
  fetchStudentLmsDashboardWithEnvelope,
  fetchStudentMaterials,
  fetchStudentProgress,
  fetchStudentRegistrations,
  fetchStudentReviews,
  fetchStudentSessions,
  normalizeStudentLmsDashboard,
  type StudentListedCourse,
  type StudentRegistrationRow,
  type StudentReviewRow,
} from '@/api/studentApi'
import type { Course } from '@/types'
import type { Enrollment } from '@/types'
import type {
  LmsMaterial,
  LmsSession,
  StudentAssignment,
  StudentLmsDashboard,
  StudentProgressPayload,
} from '@/types/lms'
import type { PlatformNotification } from '@/types/platform'
import {
  mergeRegistrationRows,
  buildEnrollmentBaselineFromEnvelopePayloads,
  extractExtraRegistrationRows,
} from '@/utils/studentDashboardEnvelope'
import { mergeStudentEnrollments } from '@/utils/studentEnrollmentMerge'
import { normalizeRole } from '@/utils/dashboardAccess'
import { useAuth } from '@/contexts/AuthContext'

const EMPTY_LMS = normalizeStudentLmsDashboard(null)

const EMPTY_LMS_ENVELOPED = {
  dashboard: EMPTY_LMS,
  envelope: null as unknown,
  ok: false,
}

function mergeProgressWithRegistrations(
  progress: StudentProgressPayload,
  registrations: StudentRegistrationRow[],
): StudentProgressPayload {
  const map = new Map(progress.course_progress.map((c) => [c.course_id, { ...c }]))
  for (const r of registrations) {
    if (!map.has(r.course_id)) {
      map.set(r.course_id, {
        course_id: r.course_id,
        course_title: r.course_title ?? `دورة ${r.course_id}`,
        slug: r.slug ?? undefined,
        progress_percent: 0,
        sessions_completed: 0,
        sessions_total: 0,
        assignments_done: 0,
        assignments_total: 0,
      })
    }
  }
  return {
    ...progress,
    course_progress: [...map.values()],
  }
}

function filterSessionsForRegistrations(sessions: LmsSession[], registrations: StudentRegistrationRow[]): LmsSession[] {
  if (!Array.isArray(registrations) || registrations.length === 0) return sessions
  const ids = new Set(registrations.map((r) => r.course_id))
  const slugs = new Set(registrations.map((r) => r.slug).filter(Boolean) as string[])
  const titles = new Set(
    registrations.map((r) => String(r.course_title ?? '').trim().toLowerCase()).filter(Boolean),
  )

  return sessions.filter((s) => {
    if (s.course_id != null && Number.isFinite(s.course_id)) return ids.has(s.course_id)
    if (s.course_slug && slugs.has(s.course_slug)) return true
    const tn = String(s.course_name ?? '').trim().toLowerCase()
    return !!(tn && titles.has(tn))
  })
}

function filterByRegisteredCourse<T extends { course_id?: number | null }>(
  items: T[],
  registrations: StudentRegistrationRow[],
): T[] {
  if (!Array.isArray(registrations) || registrations.length === 0) return items
  const ids = new Set(registrations.map((r) => r.course_id))
  return items.filter((item) => {
    const cid = item.course_id
    if (cid != null && Number.isFinite(cid)) return ids.has(cid)
    return true
  })
}

function pickBrowseCourses(
  apiAvailable: Course[],
  publicCatalog: Course[],
  registrations: StudentRegistrationRow[],
): { browse: Course[]; source: 'api_available' | 'public_filtered' } {
  const regIds = new Set(registrations.map((r) => r.course_id))
  const regSlugs = new Set(registrations.map((r) => r.slug).filter(Boolean) as string[])

  const exclude = (c: Course) =>
    regIds.has(c.id) || (c.slug != null && String(c.slug).trim() !== '' && regSlugs.has(String(c.slug)))

  if (apiAvailable.length > 0) {
    return {
      browse: apiAvailable.filter((c) => !exclude(c)),
      source: 'api_available',
    }
  }
  return {
    browse: publicCatalog.filter((c) => !exclude(c)),
    source: 'public_filtered',
  }
}

export type StudentSidebarCounts = {
  myCourses: number
  registrations: number
  sessionsUpcoming: number
  assignmentsDue: number
}

export type StudentDashboardContextValue = {
  loading: boolean
  refreshing: boolean
  loadError: string | null
  refresh: () => Promise<void>
  lmsDashboard: StudentLmsDashboard
  registrations: StudentRegistrationRow[]
  listedCourses: StudentListedCourse[]
  enrollmentsMerged: Enrollment[]
  browseCourses: Course[]
  browseSource: 'api_available' | 'public_filtered'
  sessionsUpcoming: LmsSession[]
  sessionsLive: LmsSession[]
  sessionsEnded: LmsSession[]
  sessionsCompleted: LmsSession[]
  materialsScoped: LmsMaterial[]
  assignmentsScoped: StudentAssignment[]
  progressMerged: StudentProgressPayload
  reviews: StudentReviewRow[]
  reviewedCourseIds: Set<number>
  registeredCourseIds: Set<number>
  sidebarCounts: StudentSidebarCounts
  notificationsUnread: number
}

const FALLBACK_CONTEXT: StudentDashboardContextValue = {
  loading: false,
  refreshing: false,
  loadError: null,
  refresh: async () => {},
  lmsDashboard: EMPTY_LMS,
  registrations: [],
  listedCourses: [],
  enrollmentsMerged: [],
  browseCourses: [],
  browseSource: 'public_filtered',
  sessionsUpcoming: [],
  sessionsLive: [],
  sessionsEnded: [],
  sessionsCompleted: [],
  materialsScoped: [],
  assignmentsScoped: [],
  progressMerged: mergeProgressWithRegistrations(
    {
      course_progress: [],
      attendance_percent: 0,
      overall_assignment_completion: 0,
    },
    [],
  ),
  reviews: [],
  reviewedCourseIds: new Set(),
  registeredCourseIds: new Set(),
  sidebarCounts: {
    myCourses: 0,
    registrations: 0,
    sessionsUpcoming: 0,
    assignmentsDue: 0,
  },
  notificationsUnread: 0,
}

const StudentDashboardContext = createContext<StudentDashboardContextValue | null>(null)

function useStudentDashboardLoader(enabled: boolean, userId: number): StudentDashboardContextValue {
  const [loading, setLoading] = useState(enabled)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [lmsDashboard, setLmsDashboard] = useState<StudentLmsDashboard>(EMPTY_LMS)
  const [studentDashboardEnvelope, setStudentDashboardEnvelope] = useState<unknown | null>(null)
  const [registrations, setRegistrations] = useState<StudentRegistrationRow[]>([])
  const [listedCourses, setListedCourses] = useState<StudentListedCourse[]>([])
  const [apiAvailable, setApiAvailable] = useState<Course[]>([])
  const [publicCatalog, setPublicCatalog] = useState<Course[]>([])
  const [sessionsUpcomingRaw, setSessionsUpcomingRaw] = useState<LmsSession[]>([])
  const [sessionsCompletedRaw, setSessionsCompletedRaw] = useState<LmsSession[]>([])
  const [materialsRaw, setMaterialsRaw] = useState<LmsMaterial[]>([])
  const [assignmentsRaw, setAssignmentsRaw] = useState<StudentAssignment[]>([])
  const [progressPayload, setProgressPayload] = useState<StudentProgressPayload>(() =>
    mergeProgressWithRegistrations(
      {
        course_progress: [],
        attendance_percent: 0,
        overall_assignment_completion: 0,
      },
      [],
    ),
  )
  const [reviews, setReviews] = useState<StudentReviewRow[]>([])
  const [notificationsUnread, setNotificationsUnread] = useState(0)

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!enabled) return
    if (mode === 'initial') setLoading(true)
    else setRefreshing(true)
    setLoadError(null)

    try {
      const results = await Promise.allSettled([
        fetchStudentLmsDashboardWithEnvelope(),
        fetchStudentRegistrations(),
        fetchStudentCoursesList(),
        fetchStudentAvailableCourses(),
        fetchCoursesFromApi(),
        fetchStudentSessions(),
        fetchStudentMaterials(),
        fetchStudentAssignments(),
        fetchStudentProgress(),
        fetchNotifications(),
        fetchStudentReviews(),
      ])

      const unwrap = <T,>(i: number, fallback: T): T => {
        const r = results[i]
        if (r?.status === 'fulfilled') return r.value as T
        return fallback
      }

      const lmsPacked = unwrap(0, EMPTY_LMS_ENVELOPED)
      setLmsDashboard(lmsPacked.dashboard)
      setStudentDashboardEnvelope(lmsPacked.envelope ?? null)
      if (!lmsPacked.ok) {
        setLoadError('تعذّر تحميل لوحة الطالب.')
      }

      const apiRegs = unwrap(1, []) as StudentRegistrationRow[]
      const regExtrasFromApi = extractExtraRegistrationRows(lmsPacked.envelope)
      setRegistrations(mergeRegistrationRows(apiRegs, regExtrasFromApi))
      setListedCourses(unwrap(2, []))
      setApiAvailable(unwrap(3, []))
      setPublicCatalog(unwrap(4, []))

      const sess = unwrap(5, { upcoming: [] as LmsSession[], completed: [] as LmsSession[] })
      setSessionsUpcomingRaw(sess.upcoming ?? [])
      setSessionsCompletedRaw(sess.completed ?? [])

      setMaterialsRaw(unwrap(6, []))
      setAssignmentsRaw(unwrap(7, []))
      setProgressPayload(
        unwrap(
          8,
          mergeProgressWithRegistrations(
            { course_progress: [], attendance_percent: 0, overall_assignment_completion: 0 },
            [],
          ),
        ),
      )

      const notifs = unwrap(9, []) as PlatformNotification[]
      setNotificationsUnread(notifs.filter((n) => isNotificationUnread(n)).length)

      setReviews(unwrap(10, []))

    } catch {
      setLoadError('تعذّر مزامنة بيانات الطالب.')
    } finally {
      if (mode === 'initial') setLoading(false)
      setRefreshing(false)
    }
  }, [enabled, userId])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    void load('initial')
  }, [enabled, userId, load])

  useEffect(() => {
    if (!enabled) return
    function onRefresh() {
      void load('refresh')
    }
    window.addEventListener(STUDENT_SCOPE_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(STUDENT_SCOPE_REFRESH_EVENT, onRefresh)
  }, [enabled, load])

  const enrollmentBaseline = useMemo(
    () =>
      buildEnrollmentBaselineFromEnvelopePayloads(null, studentDashboardEnvelope, lmsDashboard),
    [studentDashboardEnvelope, lmsDashboard],
  )

  const enrollmentsMerged = useMemo(
    () => mergeStudentEnrollments(enrollmentBaseline, registrations, listedCourses),
    [enrollmentBaseline, registrations, listedCourses],
  )

  const registeredCourseIds = useMemo(() => new Set(registrations.map((r) => r.course_id)), [registrations])

  const { browse: browseCourses, source: browseSource } = useMemo(
    () => pickBrowseCourses(apiAvailable, publicCatalog, registrations),
    [apiAvailable, publicCatalog, registrations],
  )

  const sessionsLive = useMemo(() => {
    const merged = [...(lmsDashboard.live_sessions ?? [])]
    const dedup = new Map<number, LmsSession>()
    for (const s of merged) {
      if (s && typeof s.id === 'number') dedup.set(s.id, s)
    }
    return filterSessionsForRegistrations([...dedup.values()], registrations)
  }, [lmsDashboard.live_sessions, registrations])

  const sessionsUpcoming = useMemo(() => {
    // Prefer backend's segmented upcoming (excludes live); fall back to raw fetched sessions
    const dashboardUpcoming = (lmsDashboard.upcoming_sessions ?? []).filter(
      (s) => s.status !== 'live' && s.status !== 'completed',
    )
    const merged = [...sessionsUpcomingRaw, ...dashboardUpcoming]
    const dedup = new Map<number, LmsSession>()
    for (const s of merged) {
      if (s && typeof s.id === 'number') dedup.set(s.id, s)
    }
    return filterSessionsForRegistrations(
      [...dedup.values()].filter((s) => s.status !== 'live' && s.status !== 'completed'),
      registrations,
    )
  }, [sessionsUpcomingRaw, lmsDashboard.upcoming_sessions, registrations])

  const sessionsEnded = useMemo(() => {
    const merged = [...(lmsDashboard.ended_sessions ?? []), ...sessionsCompletedRaw]
    const dedup = new Map<number, LmsSession>()
    for (const s of merged) {
      if (s && typeof s.id === 'number') dedup.set(s.id, s)
    }
    return filterSessionsForRegistrations([...dedup.values()], registrations)
  }, [lmsDashboard.ended_sessions, sessionsCompletedRaw, registrations])

  const sessionsCompleted = useMemo(() => {
    const merged = [...sessionsCompletedRaw, ...(lmsDashboard.completed_sessions ?? [])]
    const dedup = new Map<number, LmsSession>()
    for (const s of merged) {
      if (s && typeof s.id === 'number') dedup.set(s.id, s)
    }
    return filterSessionsForRegistrations([...dedup.values()], registrations)
  }, [sessionsCompletedRaw, lmsDashboard.completed_sessions, registrations])

  const materialsScoped = useMemo(
    () => filterByRegisteredCourse(materialsRaw, registrations),
    [materialsRaw, registrations],
  )

  const assignmentsScoped = useMemo(
    () => filterByRegisteredCourse(assignmentsRaw, registrations),
    [assignmentsRaw, registrations],
  )

  const progressMerged = useMemo(
    () => mergeProgressWithRegistrations(progressPayload, registrations),
    [progressPayload, registrations],
  )

  const reviewedCourseIds = useMemo(() => new Set(reviews.map((r) => r.course_id)), [reviews])

  const sidebarCounts = useMemo((): StudentSidebarCounts => {
    const c = lmsDashboard.counts
    return {
      myCourses: c.enrolled_courses_count || enrollmentsMerged.length,
      registrations: registrations.length,
      sessionsUpcoming: c.upcoming_sessions_count || sessionsUpcoming.length + sessionsLive.length,
      assignmentsDue: c.pending_assignments_count,
    }
  }, [lmsDashboard.counts, enrollmentsMerged.length, registrations.length, sessionsUpcoming.length, sessionsLive.length])

  const refresh = useCallback(async () => {
    await load('refresh')
  }, [load])

  return {
    loading,
    refreshing,
    loadError,
    refresh,
    lmsDashboard,
    registrations,
    listedCourses,
    enrollmentsMerged,
    browseCourses,
    browseSource,
    sessionsUpcoming,
    sessionsLive,
    sessionsEnded,
    sessionsCompleted,
    materialsScoped,
    assignmentsScoped,
    progressMerged,
    reviews,
    reviewedCourseIds,
    registeredCourseIds,
    sidebarCounts,
    notificationsUnread,
  }
}

function StudentDashboardBridge({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const bundle = useStudentDashboardLoader(true, user?.id ?? 0)
  return createElement(StudentDashboardContext.Provider, { value: bundle }, children)
}

export function StudentDashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const enabled = normalizeRole(user?.role) === 'student'
  if (!enabled) {
    return createElement(StudentDashboardContext.Provider, { value: null }, children)
  }
  return createElement(StudentDashboardBridge, null, children)
}

/** Shared student LMS data — must run inside `StudentDashboardProvider` (dashboard layout). */
export function useStudentDashboardData(): StudentDashboardContextValue {
  const ctx = useContext(StudentDashboardContext)
  return ctx ?? FALLBACK_CONTEXT
}

export function useStudentDashboardOptional(): StudentDashboardContextValue | null {
  return useContext(StudentDashboardContext)
}
