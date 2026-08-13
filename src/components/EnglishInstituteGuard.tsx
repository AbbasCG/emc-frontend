import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

/**
 * Blocks direct-URL access to English Institute pages for instructors who
 * don't teach any course with requires_placement_test=true. The sidebar link
 * is already hidden for them (dashboardSidebar.tsx), but hiding a link never
 * blocks a typed URL — this is the actual route boundary. Source of truth is
 * `user.has_english_courses`, populated by /auth/me from
 * Instructor::hasEnglishCourses() — never role/department/title.
 */
export default function EnglishInstituteGuard() {
  const { user } = useAuth()

  if (user?.role === 'instructor' && !user.has_english_courses) {
    return <Navigate to="/dashboard/instructor/courses" replace />
  }

  return <Outlet />
}
