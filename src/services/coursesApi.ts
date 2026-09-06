import apiClient from '@/api/axios'
import { fetchCoursesFromApi } from '@/api/coursesApi.public'
import { unwrapData } from '@/api/unwrap'
import type { Course } from '@/types'
import { mapApiCourseToCourseItem } from '@/utils/mapApiCourseToCourseItem'
import { EMC_COURSE_COVER_PLACEHOLDER } from '@/utils/publicCourseDisplay'

/** Local UI fixtures are impossible in production even if an environment variable is misconfigured. */
export const USE_MOCK_DATA = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_CATALOG === 'true'

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'
export type CourseStatus = 'active' | 'upcoming' | 'archived'
export type CourseCatalogType = 'course' | 'workshop'

/** Normalized row for the public /courses catalog page */
export type CourseItem = {
  id: number
  title: string
  slug: string
  description: string
  short_description: string
  category_key: string
  category_label: string
  track_name: string | null
  department_name: string | null
  level: CourseLevel
  level_label_ar: string
  price: number
  original_price: number | null
  is_free: boolean
  duration_weeks: number
  duration_label: string
  sessions_count: number
  trainer: { name: string; avatar: string | null }
  enrolled_count: number
  registrations_count: number
  effective_enrollment_count: number
  seats_count: number | null
  thumbnail: string | null
  /** data-URI SVG when no cover */
  cover_placeholder: string
  catalog_type: CourseCatalogType
  catalog_type_label_ar: string | null
  status: CourseStatus
  status_label_ar: string | null
  delivery_key: string
  delivery_label_ar: string
  tags: string[]
  start_date: string | null
  /** وقت البدء من الـ API إن وُجد */
  start_time: string | null
  language: string | null
  program_kind_raw: string | null
  /** True when course is published but its end_date has passed */
  is_ended: boolean
  progress?: number
}

export type TrackItem = {
  id: number
  name: string
  slug: string
  icon: string
  duration_months: number
  courses_count: number
  workshops_count: number
  level: CourseLevel
  price: number
  original_price: number | null
  description: string
}

export type WorkshopItem = {
  id: number
  title: string
  date: string
  time: string
  duration_hours: number
  trainer_name: string
  is_online: boolean
  spots_remaining: number
  total_spots: number
  slug: string
  price: number
  is_free: boolean
}

export type FetchCoursesParams = {
  category?: string
  type?: string
  sort?: string
  page?: number
  search?: string
}

/** Small dev-only catalog when `VITE_USE_MOCK_CATALOG=true` */
const MOCK_CATALOG_ITEMS: CourseItem[] = [
  {
    id: -1,
    title: 'معاينة دورة تجريبية',
    slug: 'mock-sample-course',
    description: 'تظهر فقط عند تفعيل الوضع التجريبي للواجهة.',
    short_description: 'تظهر فقط عند تفعيل الوضع التجريبي للواجهة.',
    category_key: 'general',
    category_label: 'عام',
    track_name: null,
    department_name: null,
    level: 'beginner',
    level_label_ar: 'مبتدئ',
    price: 0,
    original_price: null,
    is_free: true,
    duration_weeks: 4,
    duration_label: '4 أسابيع',
    sessions_count: 12,
    trainer: { name: 'فريق EMC', avatar: null },
    enrolled_count: 0,
    registrations_count: 0,
    effective_enrollment_count: 0,
    seats_count: 30,
    thumbnail: null,
    cover_placeholder: EMC_COURSE_COVER_PLACEHOLDER,
    catalog_type: 'course',
    catalog_type_label_ar: 'دورة تدريبية',
    status: 'active',
    status_label_ar: 'منشورة',
    delivery_key: 'online',
    delivery_label_ar: 'عن بُعد',
    tags: [],
    start_date: null,
    start_time: null,
    language: 'العربية',
    program_kind_raw: 'course',
    is_ended: false,
  },
]

export const mockTracks: TrackItem[] = [
  {
    id: 1,
    name: 'مهندس الذكاء الاصطناعي',
    slug: 'ai-engineer',
    icon: 'Brain',
    duration_months: 6,
    courses_count: 8,
    workshops_count: 4,
    level: 'intermediate',
    price: 2400,
    original_price: 3200,
    description: 'من Python إلى نماذج GPT مسار شامل يبني مهندساً متكاملاً في الذكاء الاصطناعي',
  },
]

const mockWorkshops: WorkshopItem[] = [
  {
    id: 1,
    title: 'ورشة تجريبية',
    date: '2026-05-15',
    time: '19:00',
    duration_hours: 2,
    trainer_name: 'فريق EMC',
    is_online: true,
    spots_remaining: 18,
    total_spots: 50,
    slug: 'sample-workshop',
    price: 0,
    is_free: true,
  },
]

// ── API Functions ──────────────────────────────────────────────────────────────

export async function fetchCourses(params: FetchCoursesParams = {}) {
  if (USE_MOCK_DATA) {
    await new Promise<void>((r) => setTimeout(r, 500))
    return { data: MOCK_CATALOG_ITEMS, total: MOCK_CATALOG_ITEMS.length }
  }
  const raw = await fetchCoursesFromApi()
  const mapped: CourseItem[] = []
  for (let i = 0; i < raw.length; i++) {
    try {
      mapped.push(mapApiCourseToCourseItem(raw[i] as Course, i))
    } catch {
      /* malformed row — keep other valid API courses visible */
    }
  }
  let list = mapped
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase()
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.trainer.name.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }
  return { data: list, total: list.length }
}

export async function fetchTracks() {
  if (USE_MOCK_DATA) {
    await new Promise<void>((r) => setTimeout(r, 300))
    return { data: mockTracks }
  }
  const response = await apiClient.get('/tracks', { skipErrorToast: true })
    const rows = unwrapData<
      {
        id: number
        title: string
        slug: string
        description?: string | null
        duration_months?: number | null
        courses_count?: number
      }[]
    >(response.data)
    const data: TrackItem[] = (rows ?? []).map((r) => ({
      id: r.id,
      name: r.title,
      slug: r.slug,
      icon: 'Brain',
      duration_months: r.duration_months ?? 6,
      courses_count: r.courses_count ?? 0,
      workshops_count: 0,
      level: 'beginner',
      price: 0,
      original_price: null,
      description: r.description ?? '',
    }))
  return { data }
}

export async function fetchUpcomingWorkshops() {
  if (USE_MOCK_DATA) {
    await new Promise<void>((r) => setTimeout(r, 300))
    return { data: mockWorkshops }
  }
  const response = await apiClient.get('/workshops', { skipErrorToast: true })
    const rows = unwrapData<Record<string, unknown>[]>(response.data)
    const data: WorkshopItem[] = (rows ?? [])
      .filter((w): w is Record<string, unknown> => Boolean(w?.id && w?.slug && w?.title))
      .map((w) => ({
        id: Number(w.id),
        title: String(w.title),
        slug: String(w.slug),
        // date / start_date — backend returns both aliases
        date: String(w.date ?? w.start_date ?? ''),
        time: String(w.time ?? w.start_time ?? ''),
        // duration — training_hours or duration_hours
        duration_hours:
          typeof w.duration_hours === 'number' ? w.duration_hours
          : typeof w.training_hours === 'number' ? w.training_hours
          : 0,
        // instructor name — flat alias or nested object
        trainer_name:
          typeof w.trainer_name === 'string' && w.trainer_name
            ? w.trainer_name
            : (w.instructor as Record<string, unknown>)?.name
              ? String((w.instructor as Record<string, unknown>).name)
              : 'لم يحدد المدرب',
        is_online: Boolean(w.is_online),
        // seats aliases — the backend (and the public normalizers) use seats_remaining/seats_total;
        // missing them here stranded the /courses spotlight at «0 مقعد» (real alias bug).
        spots_remaining: typeof w.spots_remaining === 'number' ? w.spots_remaining
          : typeof w.seats_remaining === 'number' ? w.seats_remaining
          : typeof w.available_seats === 'number' ? w.available_seats
          : 0,
        total_spots: typeof w.total_spots === 'number' ? w.total_spots
          : typeof w.seats_total === 'number' ? w.seats_total
          : typeof w.seats === 'number' ? w.seats
          : 0,
        price: typeof w.price === 'number' ? w.price : Number(w.price ?? 0),
        is_free: typeof w.is_free === 'boolean' ? w.is_free : Number(w.price ?? 0) <= 0,
      }))
  return { data }
}
