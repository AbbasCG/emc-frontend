/**
 * Path upsell — «هذه الدورة محطة في مسار» revenue math (G4).
 *
 * Finds the public learning paths that contain a given course so the course
 * detail page can upsell the full path, and computes the honest savings
 * percent (sum of the individual course prices vs the path's effective
 * price). Numbers are NEVER invented: when any course in a path lacks a
 * numeric price, or the path itself has no numeric price below that sum,
 * savings are simply not computable (null) and callers fall back to the
 * certificate line.
 */

import {
  fetchPublicLearningPaths,
  type LearningPath,
  type LearningPathCourse,
} from '@/api/learningPathsApi'

export type PathUpsellMatch = {
  path: LearningPath
  /** Whole-percent savings vs buying every course alone — null when not computable. */
  savingsPercent: number | null
}

export type PathSavings = {
  /** Sum of the individual course prices (each course's effective price: discount over base). */
  coursesTotal: number
  /** The path's effective price (discount_price ?? price). */
  pathPrice: number
  /** Whole percent saved — always ≥ 1 when returned. */
  savingsPercent: number
}

/**
 * Module-level promise cache: the public paths list is fetched at most once
 * per page lifetime no matter how many course pages the visitor walks
 * through. A failed fetch resolves [] AND clears the cache so a later visit
 * can retry instead of pinning the failure forever.
 */
let pathsPromise: Promise<LearningPath[]> | null = null

function loadPublicPaths(): Promise<LearningPath[]> {
  pathsPromise ??= fetchPublicLearningPaths({ per_page: 50 }).then(
    (res) => res.data ?? [],
    () => {
      pathsPromise = null
      return []
    },
  )
  return pathsPromise
}

/**
 * Effective numeric price of one course row. The list payload is not typed
 * for course prices, so read defensively: a missing price → null (not
 * computable), a present-but-non-numeric price → null too (never guess).
 */
function coursePrice(course: LearningPathCourse): number | null {
  const c = course as unknown as Record<string, unknown>
  for (const key of ['discount_price', 'price'] as const) {
    const raw = c[key]
    if (raw == null || raw === '') continue
    const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  return null
}

/**
 * Savings math for one path. Computable ONLY when the path carries a
 * non-empty `courses` array whose every entry has a numeric price AND the
 * path's own effective price is numeric and strictly below that sum.
 * Anything else → null — the UI must not invent numbers.
 */
export function computePathSavings(path: LearningPath): PathSavings | null {
  const courses = path.courses
  if (!Array.isArray(courses) || courses.length === 0) return null
  let coursesTotal = 0
  for (const course of courses) {
    const price = coursePrice(course)
    if (price == null) return null
    coursesTotal += price
  }
  const pathPrice = path.discount_price ?? path.price
  if (typeof pathPrice !== 'number' || !Number.isFinite(pathPrice) || pathPrice < 0) return null
  if (coursesTotal <= 0 || pathPrice >= coursesTotal) return null
  const savingsPercent = Math.round(((coursesTotal - pathPrice) / coursesTotal) * 100)
  if (savingsPercent < 1) return null
  return { coursesTotal, pathPrice, savingsPercent }
}

function pathContainsCourse(path: LearningPath, courseSlugOrId: string | number): boolean {
  const courses = path.courses
  if (!Array.isArray(courses)) return false
  return courses.some((c) =>
    typeof courseSlugOrId === 'number' ?
      c.id === courseSlugOrId
    : c.slug === courseSlugOrId || String(c.id) === courseSlugOrId,
  )
}

/**
 * All public learning paths that include the given course (matched by slug
 * or numeric id), each with its computable savings percent. Resilient to
 * list payloads that omit `courses` — such paths simply never match, and a
 * fully bare payload yields [].
 */
export async function findPathsContainingCourse(
  courseSlugOrId: string | number,
): Promise<PathUpsellMatch[]> {
  if (courseSlugOrId == null || courseSlugOrId === '') return []
  const paths = await loadPublicPaths()
  return paths
    .filter((path) => pathContainsCourse(path, courseSlugOrId))
    .map((path) => ({ path, savingsPercent: computePathSavings(path)?.savingsPercent ?? null }))
}
