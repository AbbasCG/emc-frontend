import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'

/**
 * Back-compat shim — student LMS routes load data once via `StudentDashboardProvider`.
 * Prefer `useStudentDashboardData()` in new code.
 */
export function useStudentLearningLists() {
  const d = useStudentDashboardData()
  return {
    loading: d.loading,
    refreshing: d.refreshing,
    enrollmentsMerged: d.enrollmentsMerged,
    registrations: d.registrations,
    catalog: d.browseCourses,
    browseCourses: d.browseCourses,
    refresh: d.refresh,
  }
}
