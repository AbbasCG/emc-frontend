import type { ClassAssignment, Course, Enrollment } from '@/types'
import type { StudentClassAssignment, StudentListedCourse, StudentRegistrationRow } from '@/api/studentApi'
import { normalizeRegistrationStatus } from './statusLabels'

function toClassAssignment(ca: StudentClassAssignment | null | undefined): ClassAssignment | null {
  if (!ca) return null
  return {
    class_group_id:  ca.class_group_id,
    name:            ca.name,
    level_code:      ca.level_code ?? null,
    schedule_day:    ca.schedule_day ?? null,
    schedule_time:   ca.schedule_time ?? null,
    location_type:   ca.location_type ?? null,
    meeting_link:    ca.meeting_link ?? null,
    start_date:      ca.start_date ?? null,
    instructor_name: ca.instructor_name ?? null,
    assigned_at:     ca.assigned_at ?? null,
  }
}

export function mapBackendRegStatus(raw?: string | null): Enrollment['status'] {
  return normalizeRegistrationStatus(raw)
}

/** Shared course scaffold for LMS merge / envelope parsing. */
export function skeletonCourse(
  courseId: number,
  title: string,
  slug?: string | null,
  instructor?: string | null,
  extra?: Partial<Course>,
): Course {
  const slugResolved =
    slug != null && String(slug).trim() !== '' ? String(slug).trim() : `course-${courseId}`
  return {
    id: courseId,
    title: title.trim() || `دورة #${courseId}`,
    slug: slugResolved,
    description: '',
    short_description: null,
    instructor_name: instructor ?? undefined,
    type: 'free',
    price: 0,
    is_online: true,
    features: [],
    ...extra,
  }
}

function enrollmentFromRegistration(r: StudentRegistrationRow): Enrollment {
  return {
    id: r.id,
    course: skeletonCourse(r.course_id, r.course_title ?? '', r.slug, r.instructor_name ?? null, {
      start_date: r.start_date ?? undefined,
      start_time: r.start_time ?? undefined,
      end_date: r.end_date ?? undefined,
      end_time: r.end_time ?? undefined,
      is_ended: r.is_ended ?? undefined,
      computed_status: r.computed_status ?? undefined,
      lifecycle_status: r.lifecycle_status ?? undefined,
      meeting_link: r.meeting_link ?? undefined,
      course_image: r.course_cover_url ?? undefined,
      image_url: r.course_cover_url ?? undefined,
      cover_image: r.course_cover_url ?? undefined,
      requires_placement_test: r.requires_placement_test,
    }),
    enrolled_at: r.enrolled_at ?? '',
    completed_sessions: 0,
    total_sessions: 0,
    status: mapBackendRegStatus(r.status),
    placement_status: r.placement_status ?? null,
    can_start_learning: r.can_start_learning ?? null,
  }
}

function enrollmentFromListedCourse(c: StudentListedCourse): Enrollment {
  const totalSessions = 10
  const pct = typeof c.progress_percent === 'number' ? c.progress_percent : 0
  const completed = Math.min(totalSessions, Math.max(0, Math.round((pct / 100) * totalSessions)))
  let status = mapBackendRegStatus(c.status)
  if (!c.status && pct >= 99) status = 'completed'

  return {
    /** Stable surrogate tied to enrolled course row from `/student/courses` */
    id: c.id,
    course: skeletonCourse(c.id, c.title, c.slug, c.instructor_name ?? null, {
      start_date: c.start_date ?? undefined,
      start_time: c.start_time ?? undefined,
      end_date: c.end_date ?? undefined,
      end_time: c.end_time ?? undefined,
      is_ended: c.is_ended ?? undefined,
      computed_status: c.computed_status ?? undefined,
      lifecycle_status: c.lifecycle_status ?? undefined,
      meeting_link: c.meeting_link ?? undefined,
      requires_placement_test: c.requires_placement_test,
      // Pass cover image through so card can display it
      image_url: c.cover_url ?? undefined,
      course_image: c.cover_url ?? undefined,
    }),
    enrolled_at: '',
    completed_sessions: completed,
    total_sessions: totalSessions,
    status,
    placement_status: c.placement_status ?? null,
    placement_score: c.placement_score ?? null,
    placement_total: c.placement_total ?? null,
    placement_percentage: c.placement_percentage ?? null,
    placement_estimated_level: c.placement_estimated_level ?? null,
    oral_booking_status: c.oral_booking_status ?? null,
    oral_booking_starts_at: c.oral_booking_starts_at ?? null,
    oral_booking_ends_at: c.oral_booking_ends_at ?? null,
    oral_final_level: c.oral_final_level ?? null,
    oral_score: c.oral_score ?? null,
    can_start_learning: c.can_start_learning ?? null,
    class_assignment: toClassAssignment(c.class_assignment),
  }
}

/** Merge legacy dashboard enrollments with dedicated student registrations / courses endpoints. */
export function mergeStudentEnrollments(
  baseline: Enrollment[],
  regs: StudentRegistrationRow[],
  listed: StudentListedCourse[],
): Enrollment[] {
  const byCourseId = new Map<number, Enrollment>()
  const base = Array.isArray(baseline) ? baseline : []

  for (const r of regs) {
    const cid = r.course_id
    if (!(typeof cid === 'number' && cid > 0)) continue
    byCourseId.set(cid, enrollmentFromRegistration(r))
  }

  for (const e of base) {
    const cid = e?.course?.id
    if (!(typeof cid === 'number' && cid > 0)) continue
    if (!byCourseId.has(cid)) byCourseId.set(cid, e)
  }

  listed.forEach((c) => {
    const prev = byCourseId.get(c.id)
    if (!prev) {
      byCourseId.set(c.id, enrollmentFromListedCourse(c))
      return
    }
    const totalSessions = prev.total_sessions > 0 ? prev.total_sessions : 10
    const pct = typeof c.progress_percent === 'number' ? c.progress_percent : 0
    const completed =
      pct > 0 ? Math.min(totalSessions, Math.max(0, Math.round((pct / 100) * totalSessions))) : prev.completed_sessions

    // Prefer listed-course placement data (fresher) over registration data
    const mergedRequires =
      c.requires_placement_test ?? prev.course.requires_placement_test
    const mergedPlacementStatus = c.placement_status ?? prev.placement_status ?? null
    const mergedCanStart = c.can_start_learning ?? prev.can_start_learning ?? null
    const mergedScore = c.placement_score ?? prev.placement_score ?? null
    const mergedTotal = c.placement_total ?? prev.placement_total ?? null
    const mergedPct = c.placement_percentage ?? prev.placement_percentage ?? null
    const mergedEstLevel = c.placement_estimated_level ?? prev.placement_estimated_level ?? null
    const mergedOralStatus = c.oral_booking_status ?? prev.oral_booking_status ?? null
    const mergedOralStartsAt = c.oral_booking_starts_at ?? prev.oral_booking_starts_at ?? null
    const mergedOralEndsAt = c.oral_booking_ends_at ?? prev.oral_booking_ends_at ?? null
    const mergedOralFinalLevel = c.oral_final_level ?? prev.oral_final_level ?? null
    const mergedOralScore = c.oral_score ?? prev.oral_score ?? null
    // Class assignment from listed source wins (freshest)
    const mergedClassAssignment = toClassAssignment(c.class_assignment) ?? prev.class_assignment ?? null

    byCourseId.set(c.id, {
      ...prev,
      course: skeletonCourse(
        c.id,
        c.title || prev.course.title,
        c.slug ?? prev.course.slug,
        c.instructor_name ?? prev.course.instructor_name ?? null,
        {
          start_date: c.start_date ?? prev.course.start_date ?? undefined,
          start_time: c.start_time ?? prev.course.start_time ?? undefined,
          end_date: c.end_date ?? prev.course.end_date ?? undefined,
          end_time: c.end_time ?? prev.course.end_time ?? undefined,
          // Listed-course lifecycle wins when present (freshest computed status).
          is_ended: c.is_ended ?? prev.course.is_ended ?? undefined,
          computed_status: c.computed_status ?? prev.course.computed_status ?? undefined,
          lifecycle_status: c.lifecycle_status ?? prev.course.lifecycle_status ?? undefined,
          meeting_link: c.meeting_link ?? prev.course.meeting_link ?? undefined,
          image_url: c.cover_url ?? prev.course.image_url ?? undefined,
          course_image: c.cover_url ?? prev.course.course_image ?? undefined,
          requires_placement_test: mergedRequires,
        },
      ),
      completed_sessions: Math.max(prev.completed_sessions, completed),
      total_sessions: totalSessions,
      status: c.status ? mapBackendRegStatus(c.status) : prev.status,
      enrolled_at: prev.enrolled_at || '',
      placement_status: mergedPlacementStatus,
      placement_score: mergedScore,
      placement_total: mergedTotal,
      placement_percentage: mergedPct,
      placement_estimated_level: mergedEstLevel,
      oral_booking_status: mergedOralStatus,
      oral_booking_starts_at: mergedOralStartsAt,
      oral_booking_ends_at: mergedOralEndsAt,
      oral_final_level: mergedOralFinalLevel,
      oral_score: mergedOralScore,
      can_start_learning: mergedCanStart,
      class_assignment: mergedClassAssignment,
    })
  })

  return [...byCourseId.values()]
}
