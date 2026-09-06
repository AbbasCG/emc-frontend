import type { Course } from '@/types'

/**
 * A course counts as paid when the API flags it explicitly *or* types it as paid —
 * several endpoints send only one of the two. Shared so the card and the fields modal
 * always route the same course through the same (payment) flow.
 *
 * Lives in its own module rather than beside the card: a component file that also
 * exports a helper loses Fast Refresh (`react-refresh/only-export-components`).
 */
export function isPaidCourse(course: Pick<Course, 'is_paid' | 'type'>): boolean {
  return course.is_paid === true || course.type === 'paid'
}
