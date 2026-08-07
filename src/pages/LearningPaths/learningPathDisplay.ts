import type { LearningPath, LearningPathCourse } from '@/api/learningPathsApi'
import { formatEuroInteger } from '@/utils/currency'
import { toLatinDigits } from '@/utils/publicDetailFormat'

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

export function coursesCountLabel(path: LearningPath): string | null {
  const n = path.courses_count
  if (!Number.isFinite(n) || n <= 0) return null
  return `${String(n)} ${n === 1 ? 'دورة' : 'دورات'}`
}

// ─── Journey rail (stations) ──────────────────────────────────────────────────

/** Some payload shapes ship `order` / `course_image` instead of the typed keys. */
type RawStationKeys = { order?: number | null }

function stationOrder(course: LearningPathCourse): number {
  const raw = course as LearningPathCourse & RawStationKeys
  const v = raw.sort_order ?? raw.order
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/**
 * Ordered course stations for the journey rail. `extra` counts collapsed
 * courses beyond `max` — the total still comes from the real list, so the
 * rail never invents stations from a stale `courses_count`.
 */
export function journeyStations(
  path: LearningPath,
  max = 4,
): { items: LearningPathCourse[]; extra: number } {
  const rows = [...(path.courses ?? [])].sort((a, b) => stationOrder(a) - stationOrder(b))
  const items = rows.slice(0, max)
  return { items, extra: Math.max(0, rows.length - items.length) }
}

/**
 * Per-course duration for a rail station. A bare number carries no unit —
 * showing it would be noise — so only labelled strings pass through,
 * normalised to Latin digits.
 */
export function courseDurationLabel(course: LearningPathCourse): string | null {
  const raw = course.duration
  if (raw == null) return null
  const t = String(raw).trim()
  if (!t) return null
  if (Number.isFinite(Number(t))) return null
  return toLatinDigits(t)
}
