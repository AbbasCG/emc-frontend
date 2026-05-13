import type { Course } from '../types'
import type { CourseCategory, CourseItem, CourseLevel, CourseStatus } from '@/services/coursesApi'

function mapLevelToCategory(level?: string | null): CourseCategory {
  const l = (level ?? '').toLowerCase()
  if (l.includes('أكاديم') || l.includes('academic')) return 'Academic'
  if (l.includes('لغ')) return 'Languages'
  if (l.includes('business') || l.includes('أعمال')) return 'Business'
  return 'AI & Tech'
}

function mapLevel(level?: string | null): CourseLevel {
  const l = (level ?? '').toLowerCase()
  if (l.includes('متقدم') || l.includes('advanced')) return 'advanced'
  if (l.includes('متوسط') || l.includes('intermediate')) return 'intermediate'
  return 'beginner'
}

function estimateWeeks(start?: string | null, end?: string | null): number {
  if (!start || !end) return 4
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const days = Math.max(7, Math.ceil((e - s) / 86400000))
  return Math.max(1, Math.ceil(days / 7))
}

/** Maps Laravel course JSON → catalog CourseItem used by CoursesGrid */
export function mapApiCourseToCourseItem(c: Course): CourseItem {
  const isFree = c.type === 'free'
  const trainerName = c.instructor?.name ?? c.instructor_name ?? 'فريق EMC'

  const status: CourseStatus =
    c.status === 'archived' ? 'archived' : c.status === 'upcoming' ? 'upcoming' : 'active'

  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: (c.short_description || c.description || '').slice(0, 280),
    category: mapLevelToCategory(c.level),
    level: mapLevel(c.level),
    price: Number(c.price) || 0,
    original_price: null,
    is_free: isFree,
    duration_weeks: estimateWeeks(c.start_date, c.end_date),
    sessions_count: Math.max(1, Number(c.training_hours) || 6),
    trainer: {
      name: trainerName,
      avatar: c.instructor?.image ?? null,
    },
    enrolled_count: 180,
    rating: 4.85,
    thumbnail: c.course_image ?? null,
    type: 'course',
    status,
    tags: [],
  }
}
