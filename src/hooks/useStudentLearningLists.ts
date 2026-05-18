import { useCallback, useEffect, useMemo, useState } from 'react'
import apiClient from '@/api/axios'
import {
  STUDENT_SCOPE_REFRESH_EVENT,
  fetchStudentCoursesList,
  fetchStudentRegistrations,
  type StudentRegistrationRow,
} from '@/api/studentApi'
import { fetchCoursesStrict } from '@/api/superAdminCatalogApi'
import type { Course, DashboardStats, Enrollment, StudentDashboard } from '@/types'
import { mergeStudentEnrollments } from '@/utils/studentEnrollmentMerge'

const EMPTY_STATS: DashboardStats = {
  enrolled_courses: 0,
  upcoming_sessions: 0,
  completed_certificates: 0,
  training_hours: 0,
}

function toFiniteStat(n: unknown, fallback = 0): number {
  if (typeof n === 'number' && Number.isFinite(n)) return n
  const x = Number(n)
  return Number.isFinite(x) ? x : fallback
}

function unwrapDashboardPayload(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: unknown }).data
  return raw
}

function normalizeStudentDashboard(raw: unknown): StudentDashboard {
  const inner = unwrapDashboardPayload(raw)
  if (!inner || typeof inner !== 'object') {
    return { stats: { ...EMPTY_STATS }, enrollments: [], upcoming_sessions: [], notifications: [] }
  }
  const o = inner as Partial<StudentDashboard>
  const statsIn = o.stats && typeof o.stats === 'object' ? o.stats : {}
  const s = statsIn as Partial<DashboardStats>
  return {
    stats: {
      enrolled_courses: toFiniteStat(s.enrolled_courses, EMPTY_STATS.enrolled_courses),
      upcoming_sessions: toFiniteStat(s.upcoming_sessions, EMPTY_STATS.upcoming_sessions),
      completed_certificates: toFiniteStat(s.completed_certificates, EMPTY_STATS.completed_certificates),
      training_hours: toFiniteStat(s.training_hours, EMPTY_STATS.training_hours),
    },
    enrollments: Array.isArray(o.enrollments) ? o.enrollments : [],
    upcoming_sessions: Array.isArray(o.upcoming_sessions) ? o.upcoming_sessions : [],
    notifications: Array.isArray(o.notifications) ? o.notifications : [],
  }
}

export function useStudentLearningLists() {
  const [loading, setLoading] = useState(true)
  const [enrollmentsMerged, setEnrollmentsMerged] = useState<Enrollment[]>([])
  const [regs, setRegs] = useState<StudentRegistrationRow[]>([])
  const [catalog, setCatalog] = useState<Course[]>([])

  const sync = useCallback(async () => {
    setLoading(true)
    try {
      const [dashRes, courses, registrations, pack] = await Promise.all([
        apiClient.get('/dashboard', { skipErrorToast: true }).catch(() => null),
        fetchStudentCoursesList(),
        fetchStudentRegistrations(),
        fetchCoursesStrict(),
      ])
      const base = dashRes != null ? normalizeStudentDashboard(dashRes.data).enrollments : []
      setEnrollmentsMerged(mergeStudentEnrollments(Array.isArray(base) ? base : [], registrations, courses))
      setRegs(registrations)
      setCatalog(pack.ok ? pack.rows : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void sync()
  }, [sync])

  useEffect(() => {
    function onRefresh() {
      void sync()
    }
    window.addEventListener(STUDENT_SCOPE_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(STUDENT_SCOPE_REFRESH_EVENT, onRefresh)
  }, [sync])

  const browseCourses = useMemo(() => {
    const enrolledSlugs = new Set(
      enrollmentsMerged.filter((e) => e.course?.slug).map((e) => String(e.course.slug)),
    )
    return [...catalog].filter((c) => c.slug && !enrolledSlugs.has(c.slug))
  }, [catalog, enrollmentsMerged])

  return {
    loading,
    enrollmentsMerged,
    registrations: regs,
    catalog,
    browseCourses,
    refresh: sync,
  }
}
