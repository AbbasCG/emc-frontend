import type { LearningPath, LearningPathCourse } from '@/api/learningPathsApi'
import { formatEuroInteger } from '@/utils/currency'

const LEVEL_AR: Record<string, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
}

export function levelLabelAr(level: string | null | undefined): string | null {
  if (!level?.trim()) return null
  const key = level.trim().toLowerCase()
  return LEVEL_AR[key] ?? level.trim()
}

export function formatPathDuration(path: LearningPath): string | null {
  const raw = path.duration
  if (raw == null || String(raw).trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return String(raw).trim()

  const unitKey = (path.duration_unit ?? 'weeks').toLowerCase()
  const unit =
    unitKey === 'months' ? 'شهر'
    : unitKey === 'days' ? 'يوم'
    : unitKey === 'weeks' ? 'أسبوع'
    : path.duration_unit

  if (n === 1) return `${String(n)} ${unit}`
  if (unitKey === 'weeks') return `${String(n)} أسابيع`
  if (unitKey === 'months') return `${String(n)} أشهر`
  if (unitKey === 'days') return `${String(n)} أيام`
  return `${String(n)} ${unit}`
}

export function formatPathPrice(path: LearningPath): {
  label: string
  isFree: boolean
  hasPrice: boolean
  original: string | null
} {
  const effective = path.discount_price ?? path.price
  if (effective == null) {
    return { label: '', isFree: false, hasPrice: false, original: null }
  }
  if (effective === 0) {
    return { label: 'مجاناً', isFree: true, hasPrice: true, original: null }
  }
  const original =
    path.discount_price != null &&
    path.price != null &&
    path.price > path.discount_price ?
      formatEuroInteger(path.price, 'ar')
    : null
  return {
    label: formatEuroInteger(effective, 'ar'),
    isFree: false,
    hasPrice: true,
    original,
  }
}

export function curriculumPreview(path: LearningPath): LearningPathCourse[] {
  const courses = path.courses ?? []
  return [...courses].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).slice(0, 4)
}

export function coursesCountLabel(path: LearningPath): string | null {
  const n = path.courses_count
  if (!Number.isFinite(n) || n <= 0) return null
  return `${String(n)} ${n === 1 ? 'دورة' : 'دورات'}`
}

export function includedCoursesHeading(path: LearningPath): string | null {
  const n = path.courses_count
  if (!Number.isFinite(n) || n <= 0) return null
  return `${String(n)} ${n === 1 ? 'دورة ضمن المسار' : 'دورات ضمن المسار'}`
}

export function coursePreviewItems(
  path: LearningPath,
  previewCount = 3,
): { items: LearningPathCourse[]; extra: number } {
  const sorted = [...(path.courses ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  )
  const total =
    path.courses_count > 0 ? path.courses_count
    : sorted.length > 0 ? sorted.length
    : 0
  const items = sorted.slice(0, previewCount)
  const extra = Math.max(0, total - items.length)
  return { items, extra }
}
