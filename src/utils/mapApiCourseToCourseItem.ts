import type { Course } from '../types'
import type { CourseItem, CourseLevel, CourseStatus } from '@/services/coursesApi'
import {
  EMC_COURSE_COVER_PLACEHOLDER,
  mapCourseStatusArabic,
  mapDeliveryTypeArabic,
  mapProgramTypeArabic,
  resolveCourseCoverImageUrl,
} from '@/utils/publicCourseDisplay'
import { isOneSessionWorkshop, ONE_SESSION_WORKSHOP_DURATION_AR } from '@/utils/courseDuration'

const INSTRUCTOR_FALLBACK_AR = 'لم يتم تعيين مدرب بعد'

const LEVEL_AR: Record<CourseLevel, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

/** Laravel / DB often sends 1 / "1" / "true" — بدون قوالب نصية غير آمنة */
function matchesTruthyFlag(value: unknown): boolean {
  if (value === true || value === 1) return true
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    return s === '1' || s === 'true'
  }
  return false
}

function matchesFalsyFlag(value: unknown): boolean {
  if (value === false || value === 0) return true
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    return s === '0' || s === 'false'
  }
  return false
}

/** Flatten JSON:API-style `{ id, attributes: { ... } }` into one object */
function normalizeCourseShape(raw: Course | Record<string, unknown>): Record<string, unknown> {
  const r = raw as Record<string, unknown>
  if (isRecord(r.attributes)) {
    return { ...r, ...r.attributes }
  }
  return r
}

function mapLevel(level?: string | null): CourseLevel {
  const l = (level ?? '').toLowerCase()
  if (l.includes('متقدم') || l.includes('advanced')) return 'advanced'
  if (l.includes('متوسط') || l.includes('intermediate')) return 'intermediate'
  return 'beginner'
}

function mapStatusEnum(c: Course): CourseStatus {
  const s = (c.status ?? '').toLowerCase()
  if (s.includes('upcoming') || s.includes('scheduled')) return 'upcoming'
  if (s.includes('archiv') || s.includes('cancel')) return 'archived'
  return 'active'
}

function estimateWeeks(start?: string | null, end?: string | null): number {
  if (!start || !end) return 4
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 4
  const days = Math.max(7, Math.ceil((e - s) / 86400000))
  return Math.max(1, Math.ceil(days / 7))
}

function deriveCategory(c: Course, extra: Record<string, unknown>): { key: string; label: string } {
  const trackTitle =
    c.track?.title?.trim() ||
    c.track_title?.trim() ||
    String(extra.track_title ?? extra.track_name ?? '').trim()

  const deptName =
    c.department?.name?.trim() || c.department_name?.trim() || String(extra.department_name ?? '').trim()

  if (trackTitle) {
    const tid = c.track?.id != null ? String(c.track.id) : trackTitle
    return { key: `t:${tid}`, label: trackTitle }
  }
  if (deptName) {
    const did = c.department?.id != null ? String(c.department.id) : deptName
    return { key: `d:${did}`, label: deptName }
  }
  const cat = String(extra.category ?? '').trim()
  if (cat) return { key: `c:${cat}`, label: cat }
  return { key: 'general', label: 'عام' }
}

function isExplicitOnline(course: Course, extra: Record<string, unknown>): boolean {
  return (
    course.is_online === true ||
    course.is_online === 1 ||
    extra.is_online === true ||
    extra.is_online === 1 ||
    matchesTruthyFlag(course.is_online) ||
    matchesTruthyFlag(extra.is_online)
  )
}

function isExplicitOffline(course: Course, extra: Record<string, unknown>): boolean {
  return (
    course.is_online === false ||
    course.is_online === 0 ||
    extra.is_online === false ||
    extra.is_online === 0 ||
    matchesFalsyFlag(course.is_online) ||
    matchesFalsyFlag(extra.is_online)
  )
}

function deliveryFilterKey(course: Course, extra: Record<string, unknown>, labelAr: string): string {
  const hay = [labelAr, course.location_type ?? '', extra.delivery_type ?? '', course.delivery_type ?? '']
    .join(' ')
    .toLowerCase()
  if (/هجين|hybrid|blended/i.test(hay)) return 'hybrid'
  if (/عن بُعد|remote|online|distance|digital/i.test(hay)) return 'online'
  if (/حضور|offline|onsite|presence|attendance/i.test(hay)) return 'offline'
  if (isExplicitOnline(course, extra)) return 'online'
  if (isExplicitOffline(course, extra)) return 'offline'
  return 'unknown'
}

function deliveryLabelSafe(course: Course, extra: Record<string, unknown>): string {
  const mapped = mapDeliveryTypeArabic(course, extra)
  if (mapped) return mapped
  if (isExplicitOnline(course, extra)) return 'عن بُعد'
  if (isExplicitOffline(course, extra)) return 'حضوري'
  return 'سيُعلن لاحقاً'
}

function parseIsFree(c: Course, extra: Record<string, unknown>, price: number, typeStr: string): boolean {
  if (matchesTruthyFlag(c.is_free)) return true
  if (matchesTruthyFlag(extra.is_free)) return true
  if (typeStr === 'free') return true
  if (price === 0 && typeStr !== 'paid') return true
  return false
}

function catalogTypeFromCourse(
  c: Course,
  programLabel: string | null,
  extra: Record<string, unknown>,
): { kind: 'workshop' | 'course'; label: string | null } {
  const raw = [
    c.program_kind ?? '',
    programLabel ?? '',
    String(extra.program_type ?? ''),
    String(extra.catalog_kind ?? ''),
  ]
    .join(' ')
    .toLowerCase()
  if (/workshop|ورشة|one_session|session/i.test(raw)) {
    return { kind: 'workshop', label: programLabel ?? 'ورشة تدريبية' }
  }
  return { kind: 'course', label: programLabel ?? 'دورة تدريبية' }
}

function formatDurationDisplay(c: Course, weeksFallback: number, extra: Record<string, unknown>): string {
  if (isOneSessionWorkshop(c, extra)) return ONE_SESSION_WORKSHOP_DURATION_AR

  const d = c.duration
  if (typeof d === 'string' && d.trim() !== '') return d.trim()

  const computed = String(extra.computed_duration_label ?? '').trim()
  if (computed) return computed

  if (typeof c.training_hours === 'number' && c.training_hours > 0) {
    return `${c.training_hours} ساعة تدريبية`
  }
  return `${weeksFallback} أسبوعاً`
}

function pickOptionalString(values: Array<unknown>): string | null {
  for (const v of values) {
    if (typeof v === 'string') {
      const t = v.trim()
      if (t !== '') return t
    }
  }
  return null
}

function instructorDisplayName(c: Course, extra: Record<string, unknown>): string {
  const direct =
    pickOptionalString([
      c.instructor?.name,
      c.instructor_name,
      extra.instructor_name,
      extra.trainer_name,
    ]) ?? null

  if (direct) return direct

  const ins = extra.instructor
  if (isRecord(ins)) {
    const n = ins.name
    if (typeof n === 'string' && n.trim() !== '') return n.trim()
  }

  return INSTRUCTOR_FALLBACK_AR
}

function instructorAvatar(c: Course, extra: Record<string, unknown>): string | null {
  const img = c.instructor?.image
  if (typeof img === 'string' && img.trim() !== '') return img.trim()
  const ex = extra.instructor_image
  if (typeof ex === 'string' && ex.trim() !== '') return ex.trim()
  const ins = extra.instructor
  if (isRecord(ins)) {
    const av = ins.image ?? ins.avatar_url ?? ins.photo
    if (typeof av === 'string' && av.trim() !== '') return av.trim()
  }
  return null
}

/**
 * Maps API course JSON → catalog CourseItem 
 */
export function mapApiCourseToCourseItem(rawInput: Course | Record<string, unknown>, fallbackIndex = 0): CourseItem {
  const extra = normalizeCourseShape(rawInput)
  const c = extra as unknown as Course

  const idRaw = extra.id ?? c.id
  const idNum = typeof idRaw === 'number' ? idRaw : Number(idRaw)
  const id =
    Number.isFinite(idNum) && !Number.isNaN(idNum) ? Math.trunc(idNum) : -100000 - fallbackIndex

  const title = String(c.title ?? extra.title ?? '').trim() || 'دورة بدون عنوان'
  const slugRaw = String(c.slug ?? extra.slug ?? '').trim()
  const slug = slugRaw || `course-${Math.abs(id)}`

  const mergedForCover = extra as unknown as Course
  const thumb = resolveCourseCoverImageUrl(mergedForCover)

  const cat = deriveCategory(c, extra)
  const level = mapLevel(c.level ?? (typeof extra.level === 'string' ? extra.level : null))
  const weeks = estimateWeeks(c.start_date, c.end_date)

  const priceNum = Number(c.price ?? extra.price ?? 0)
  const price = Number.isFinite(priceNum) ? priceNum : 0

  const typeStr = String(c.type ?? extra.type ?? '').trim().toLowerCase()
  const isFree = parseIsFree(c, extra, price, typeStr)

  const trainerName = instructorDisplayName(c, extra)
  // Prefer effective_enrollment_count (backend-computed: uses LP enrollments for LP-owned courses)
  const effectiveCount = (c as Record<string, unknown>).effective_enrollment_count ?? (extra as Record<string, unknown>).effective_enrollment_count
  const regs = Math.max(0, Number(effectiveCount ?? c.registrations_count ?? extra.registrations_count ?? 0) || 0)

  let seats: number | null = null
  const sc = c.seats_count ?? extra.seats_count
  const cap = c.capacity ?? extra.capacity
  if (sc != null && Number(sc) >= 0) seats = Number(sc)
  else if (cap != null && Number(cap) >= 0) seats = Number(cap)

  const deliveryLabelAr = deliveryLabelSafe(c, extra)
  const deliveryKey = deliveryFilterKey(c, extra, deliveryLabelAr)

  const programLabelAr = mapProgramTypeArabic(c, extra)
  const catalog = catalogTypeFromCourse(c, programLabelAr, extra)

  const statusEnum = mapStatusEnum(c)
  const statusLabelAr = mapCourseStatusArabic(c.status, c.is_published)

  const description = String(
    c.short_description ?? c.description ?? extra.short_description ?? extra.description ?? '',
  ).trim()
  const shortDesc = description.slice(0, 320)

  const trackName =
    (c.track?.title?.trim() ??
      c.track_title?.trim() ??
      String(extra.track_title ?? '').trim()) || null

  const departmentName =
    (c.department?.name?.trim() ??
      c.department_name?.trim() ??
      String(extra.department_name ?? '').trim()) || null

  const startDate = pickOptionalString([c.start_date, extra.start_date])

  const startTime =
    pickOptionalString([c.start_time, extra.start_time, c.study_time, extra.study_time]) ??
    null

  const language =
    pickOptionalString([c.language, extra.language]) ??
    null

  const programKindRaw =
    pickOptionalString([c.program_kind, c.program_type, extra.program_kind, extra.program_type]) ??
    null

  return {
    id,
    title,
    slug,
    description: shortDesc,
    short_description: shortDesc,
    category_key: cat.key,
    category_label: cat.label,
    track_name: trackName,
    department_name: departmentName,
    level,
    level_label_ar: LEVEL_AR[level],
    price,
    original_price: null,
    is_free: isFree,
    duration_weeks: weeks,
    duration_label: formatDurationDisplay(c, weeks, extra),
    sessions_count: Math.max(1, Number(c.training_hours) > 0 ? Math.ceil(Number(c.training_hours) / 2) : 12),
    trainer: {
      name: trainerName,
      avatar: instructorAvatar(c, extra),
    },
    enrolled_count: regs,
    registrations_count: regs,
    effective_enrollment_count: regs,
    seats_count: seats,
    thumbnail: thumb,
    cover_placeholder: EMC_COURSE_COVER_PLACEHOLDER,
    catalog_type: catalog.kind,
    catalog_type_label_ar: catalog.label,
    status: statusEnum,
    status_label_ar: statusLabelAr,
    delivery_key: deliveryKey,
    delivery_label_ar: deliveryLabelAr,
    tags: [],
    start_date: startDate,
    start_time: startTime,
    language,
    program_kind_raw: programKindRaw,
  }
}
