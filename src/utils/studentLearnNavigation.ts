import type { StudentRegistrationRow } from '@/api/studentApi'

/** Canonical learn route — uses real course PK (never registration row id). */
export function studentLearnHref(coursePk: number): string {
  return `/dashboard/student/learn/${coursePk}`
}

/** If URL used registration id instead of course id, resolve the course PK. */
export function resolveCoursePkFromLikelyMisKey(
  paramId: number,
  registrations: StudentRegistrationRow[],
): number | null {
  const hit = registrations.find((r) => r.id === paramId && r.course_id > 0 && r.course_id !== paramId)
  return hit?.course_id ?? null
}
