import type { Course } from '@/types'

/** Standard Arabic label for ended courses (public + admin). */
export const ENDED_COURSE_LABEL_AR = 'منتهية'

export const ENDED_COURSE_DETAIL_MESSAGE =
  'انتهت هذه الدورة. يمكنك الاطلاع على تفاصيلها ضمن برامجنا السابقة.'

type EndedLike = {
  is_ended?: boolean | number | null
  computed_status?: string | null
  status?: string | null
  end_date?: string | null
  end_time?: string | null
  is_published?: boolean | number | null
  registration_open?: boolean | number | string | null
}

function isPublishedLike(c: EndedLike): boolean {
  if (c.is_published === true || c.is_published === 1) return true
  const s = String(c.status ?? '').toLowerCase()
  return s === 'published' || s === 'active'
}

function endTimestamp(c: EndedLike): number | null {
  const date = String(c.end_date ?? '').slice(0, 10)
  if (!date) return null
  const time = String(c.end_time ?? '').trim()
  // A single-digit hour ("9:00") is accepted by the API but is not valid ISO —
  // pad it to two digits before assembling, otherwise Date.parse is undefined
  // behaviour and the course can silently read as not-ended.
  const parts = /^(\d{1,2})(:\d{2}.*)$/.exec(time)
  const hour = (parts?.[1] ?? '').padStart(2, '0')
  const rest = parts?.[2] ?? ''
  const iso = parts
    ? `${date}T${hour}${rest.length === 3 ? `${rest}:59` : rest}`
    : `${date}T23:59:59`
  const ts = Date.parse(iso)
  return Number.isFinite(ts) ? ts : null
}

export function resolveCourseIsEnded(input: EndedLike | Course | Record<string, unknown>): boolean {
  const c = input as EndedLike
  if (c.is_ended === true || c.is_ended === 1) return true
  if (c.is_ended === false || c.is_ended === 0) return false
  if (String(c.computed_status ?? '').toLowerCase() === 'ended') return true
  if (!isPublishedLike(c)) return false
  const endTs = endTimestamp(c)
  return endTs != null && endTs < Date.now()
}

export function resolveCourseComputedStatus(c: EndedLike): 'draft' | 'published' | 'archived' | 'ended' {
  if (resolveCourseIsEnded(c)) return 'ended'
  const s = String(c.status ?? 'draft').toLowerCase()
  if (s === 'archived') return 'archived'
  if (s === 'published' || s === 'active') return 'published'
  return 'draft'
}

export function endedCourseBlocksEnrollment(c: EndedLike): boolean {
  if (!resolveCourseIsEnded(c)) return false
  const open = c.registration_open
  if (open === true || open === 1) return false
  if (typeof open === 'string') {
    const s = open.trim().toLowerCase()
    if (s === '1' || s === 'true') return false
  }
  return true
}
