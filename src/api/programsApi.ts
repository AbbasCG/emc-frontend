import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'
import { fetchPublicLearningPaths, type LearningPath } from '@/api/learningPathsApi'
import {
  fetchCourses,
  fetchUpcomingWorkshops,
  type CourseItem,
  type WorkshopItem,
} from '@/services/coursesApi'
import { mapApiCourseToCourseItem } from '@/utils/mapApiCourseToCourseItem'
import { extractCoursesList } from '@/api/coursesApi.public'
import type { Course } from '@/types'

export type ProgramCategory = {
  label: string
  count: number
  key?: string
}

export type ProgramsOverview = {
  courses: CourseItem[]
  workshops: WorkshopItem[]
  learningPaths: LearningPath[]
  categories: ProgramCategory[]
  source: 'programs' | 'fallback'
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

function deriveCategories(courses: CourseItem[]): ProgramCategory[] {
  const m = new Map<string, { label: string; count: number }>()
  for (const c of courses) {
    const cur = m.get(c.category_key)
    if (cur) cur.count += 1
    else m.set(c.category_key, { label: c.category_label, count: 1 })
  }
  return Array.from(m.entries())
    .map(([key, v]) => ({ key, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count)
}

function mapCoursesFromUnknown(rows: unknown): CourseItem[] {
  const raw = extractCoursesList(rows)
  const mapped: CourseItem[] = []
  for (let i = 0; i < raw.length; i++) {
    try {
      mapped.push(mapApiCourseToCourseItem(raw[i] as Course, i))
    } catch {
      /* skip malformed row */
    }
  }
  return mapped
}

function mapWorkshopsFromUnknown(rows: unknown): WorkshopItem[] {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((x): x is Record<string, unknown> => isRecord(x))
    .map((w) => ({
      id: Number(w.id) || 0,
      title: String(w.title ?? ''),
      slug: String(w.slug ?? ''),
      date: String(w.date ?? w.start_date ?? ''),
      time: String(w.time ?? w.start_time ?? ''),
      duration_hours: Number(w.duration_hours) || 2,
      trainer_name: String(w.trainer_name ?? w.instructor_name ?? 'فريق EMC'),
      is_online: Boolean(w.is_online),
      spots_remaining: Number(w.spots_remaining ?? w.seats_remaining ?? 0),
      total_spots: Number(w.total_spots ?? w.capacity ?? 0),
    }))
    .filter((w) => w.id > 0 && w.slug)
}

function mapLearningPathsFromUnknown(rows: unknown): LearningPath[] {
  if (!Array.isArray(rows)) return []
  return rows as LearningPath[]
}

function parseProgramsPayload(payload: unknown): ProgramsOverview | null {
  if (!isRecord(payload)) return null

  const body = unwrapData<Record<string, unknown>>(payload) ?? payload
  if (!isRecord(body)) return null

  const coursesRaw =
    body.courses ?? body.programs ?? body.items ?? (Array.isArray(body.data) ? body.data : null)
  const workshopsRaw = body.workshops ?? body.upcoming_workshops
  const pathsRaw = body.learning_paths ?? body.paths

  const courses = mapCoursesFromUnknown(coursesRaw)
  const workshops = mapWorkshopsFromUnknown(workshopsRaw)
  const learningPaths = mapLearningPathsFromUnknown(pathsRaw)

  const categoriesRaw = body.categories
  let categories: ProgramCategory[] = []
  if (Array.isArray(categoriesRaw)) {
    categories = categoriesRaw
      .filter((x): x is Record<string, unknown> => isRecord(x))
      .map((c) => ({
        key: c.key != null ? String(c.key) : undefined,
        label: String(c.label ?? c.name ?? ''),
        count: Number(c.count) || 0,
      }))
      .filter((c) => c.label && c.count > 0)
  }
  if (categories.length === 0 && courses.length > 0) {
    categories = deriveCategories(courses)
  }

  if (courses.length === 0 && workshops.length === 0 && learningPaths.length === 0) {
    return null
  }

  return { courses, workshops, learningPaths, categories, source: 'programs' }
}

export async function fetchPublicProgramsOverview(): Promise<ProgramsOverview> {
  try {
    const res = await apiClient.get('/programs', { skipErrorToast: true })
    const parsed = parseProgramsPayload(res.data)
    if (parsed) return parsed
  } catch {
    /* fallback below */
  }

  const [coursesRes, workshopsRes, pathsRes] = await Promise.all([
    fetchCourses(),
    fetchUpcomingWorkshops(),
    fetchPublicLearningPaths({ per_page: 50 }),
  ])

  const courses = coursesRes.data
  return {
    courses,
    workshops: workshopsRes.data,
    learningPaths: pathsRes.data,
    categories: deriveCategories(courses),
    source: 'fallback',
  }
}
