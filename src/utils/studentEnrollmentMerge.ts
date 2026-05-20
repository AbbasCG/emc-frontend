import type { Course, Enrollment } from '@/types'
import type { StudentListedCourse, StudentRegistrationRow } from '@/api/studentApi'

export function mapBackendRegStatus(raw?: string | null): Enrollment['status'] {
  const s = String(raw ?? '').toLowerCase()
  if (s.includes('complete') || s.includes('finish')) return 'completed'
  if (s.includes('pending') || s.includes('wait') || s.includes('hold')) return 'pending'
  return 'active'
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
      meeting_link: r.meeting_link ?? undefined,
      course_image: r.course_cover_url ?? undefined,
      image_url: r.course_cover_url ?? undefined,
      cover_image: r.course_cover_url ?? undefined,
    }),
    enrolled_at: r.enrolled_at ?? '',
    completed_sessions: 0,
    total_sessions: 0,
    status: mapBackendRegStatus(r.status),
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
      meeting_link: c.meeting_link ?? undefined,
    }),
    enrolled_at: '',
    completed_sessions: completed,
    total_sessions: totalSessions,
    status,
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
          meeting_link: c.meeting_link ?? prev.course.meeting_link ?? undefined,
        },
      ),
      completed_sessions: Math.max(prev.completed_sessions, completed),
      total_sessions: totalSessions,
      status: c.status ? mapBackendRegStatus(c.status) : prev.status,
      enrolled_at: prev.enrolled_at || '',
    })
  })

  return [...byCourseId.values()]
}
