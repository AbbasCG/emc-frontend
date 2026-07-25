import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ENDED_COURSE_LABEL_AR,
  ENDED_COURSE_DETAIL_MESSAGE,
  resolveCourseIsEnded,
  resolveCourseComputedStatus,
  endedCourseBlocksEnrollment,
} from '@/utils/courseEnded'

/**
 * Every date in this file is anchored with `vi.setSystemTime`, and every expected
 * boundary is derived with `Date.parse` on the very same string the implementation
 * builds — so the suite is independent of the machine timezone.
 */
const END_DATE = '2026-07-25'
/** The implicit end instant used when no `end_time` is supplied. */
const IMPLICIT_END_TS = Date.parse(`${END_DATE}T23:59:59`)

function at(ts: number) {
  vi.setSystemTime(new Date(ts))
}

beforeEach(() => {
  vi.useFakeTimers()
  // Default "now": comfortably before the course end instant.
  at(Date.parse(`${END_DATE}T08:00:00`))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('resolveCourseIsEnded — explicit flags win over dates', () => {
  it('treats is_ended === true as ended even with a future end_date', () => {
    expect(resolveCourseIsEnded({ is_ended: true, status: 'published', end_date: '2099-01-01' })).toBe(true)
  })

  it('accepts the numeric 1 the API sends for is_ended', () => {
    expect(resolveCourseIsEnded({ is_ended: 1, status: 'published', end_date: '2099-01-01' })).toBe(true)
  })

  it('treats an explicit is_ended === false as authoritative over a long-past end_date', () => {
    at(Date.parse('2030-01-01T00:00:00'))
    expect(resolveCourseIsEnded({ is_ended: false, status: 'published', end_date: END_DATE })).toBe(false)
  })

  it('treats the numeric 0 the API sends for is_ended as not-ended', () => {
    at(Date.parse('2030-01-01T00:00:00'))
    expect(resolveCourseIsEnded({ is_ended: 0, status: 'published', end_date: END_DATE })).toBe(false)
  })

  it('falls through to the date rules when is_ended is null or absent', () => {
    at(IMPLICIT_END_TS + 1)
    expect(resolveCourseIsEnded({ is_ended: null, status: 'published', end_date: END_DATE })).toBe(true)
    expect(resolveCourseIsEnded({ status: 'published', end_date: END_DATE })).toBe(true)
  })

  it('honours computed_status "ended" regardless of case and without any date', () => {
    expect(resolveCourseIsEnded({ computed_status: 'ended' })).toBe(true)
    expect(resolveCourseIsEnded({ computed_status: 'ENDED' })).toBe(true)
    expect(resolveCourseIsEnded({ computed_status: 'published' })).toBe(false)
  })
})

describe('resolveCourseIsEnded — end_date boundary (implicit 23:59:59)', () => {
  it('is not ended one second before the end instant', () => {
    at(IMPLICIT_END_TS - 1000)
    expect(resolveCourseIsEnded({ status: 'published', end_date: END_DATE })).toBe(false)
  })

  it('is not ended exactly at the end instant (comparison is strictly less-than)', () => {
    at(IMPLICIT_END_TS)
    expect(resolveCourseIsEnded({ status: 'published', end_date: END_DATE })).toBe(false)
  })

  it('is ended one millisecond after the end instant', () => {
    at(IMPLICIT_END_TS + 1)
    expect(resolveCourseIsEnded({ status: 'published', end_date: END_DATE })).toBe(true)
  })

  it('is ended a full day after the end instant', () => {
    at(IMPLICIT_END_TS + 86_400_000)
    expect(resolveCourseIsEnded({ status: 'published', end_date: END_DATE })).toBe(true)
  })
})

describe('resolveCourseIsEnded — end_time handling', () => {
  it('pads an "HH:MM" end_time to :59 seconds, so 18:30 is still live at 18:30:30', () => {
    at(Date.parse(`${END_DATE}T18:30:30`))
    expect(resolveCourseIsEnded({ status: 'published', end_date: END_DATE, end_time: '18:30' })).toBe(false)
  })

  it('uses a full "HH:MM:SS" end_time verbatim, so 18:30:00 has passed by 18:30:30', () => {
    at(Date.parse(`${END_DATE}T18:30:30`))
    expect(resolveCourseIsEnded({ status: 'published', end_date: END_DATE, end_time: '18:30:00' })).toBe(true)
  })

  it('ignores an unparseable end_time and falls back to end-of-day', () => {
    at(Date.parse(`${END_DATE}T18:30:30`))
    expect(resolveCourseIsEnded({ status: 'published', end_date: END_DATE, end_time: 'مساءً' })).toBe(false)
    at(IMPLICIT_END_TS + 1)
    expect(resolveCourseIsEnded({ status: 'published', end_date: END_DATE, end_time: 'مساءً' })).toBe(true)
  })

  it('ignores whitespace-only end_time', () => {
    at(IMPLICIT_END_TS - 1000)
    expect(resolveCourseIsEnded({ status: 'published', end_date: END_DATE, end_time: '   ' })).toBe(false)
  })

  it('accepts an end_time carrying milliseconds', () => {
    at(Date.parse(`${END_DATE}T18:30:30`))
    expect(resolveCourseIsEnded({ status: 'published', end_date: END_DATE, end_time: '18:30:00.000' })).toBe(true)
    expect(resolveCourseIsEnded({ status: 'published', end_date: END_DATE, end_time: '18:31:00.000' })).toBe(false)
  })
})

describe('resolveCourseIsEnded — null / malformed / non-published input', () => {
  it('returns false for a null or missing end_date', () => {
    expect(resolveCourseIsEnded({ status: 'published', end_date: null })).toBe(false)
    expect(resolveCourseIsEnded({ status: 'published' })).toBe(false)
  })

  it('returns false for an empty-string end_date', () => {
    expect(resolveCourseIsEnded({ status: 'published', end_date: '' })).toBe(false)
  })

  it('returns false for a malformed (non-ISO) end_date instead of throwing', () => {
    at(Date.parse('2030-01-01T00:00:00'))
    expect(resolveCourseIsEnded({ status: 'published', end_date: '25/07/2026' })).toBe(false)
    expect(resolveCourseIsEnded({ status: 'published', end_date: 'غير محدد' })).toBe(false)
    expect(resolveCourseIsEnded({ status: 'published', end_date: 'not-a-date' })).toBe(false)
  })

  it('accepts a full ISO timestamp end_date by taking its date part', () => {
    at(IMPLICIT_END_TS + 1)
    expect(resolveCourseIsEnded({ status: 'published', end_date: `${END_DATE}T00:00:00.000Z` })).toBe(true)
  })

  it('never date-ends a draft or archived course', () => {
    at(Date.parse('2030-01-01T00:00:00'))
    expect(resolveCourseIsEnded({ status: 'draft', end_date: END_DATE })).toBe(false)
    expect(resolveCourseIsEnded({ status: 'archived', end_date: END_DATE })).toBe(false)
    expect(resolveCourseIsEnded({ end_date: END_DATE })).toBe(false)
  })

  it('accepts published-like courses via status "active" or is_published truthy forms', () => {
    at(Date.parse('2030-01-01T00:00:00'))
    expect(resolveCourseIsEnded({ status: 'active', end_date: END_DATE })).toBe(true)
    expect(resolveCourseIsEnded({ status: 'PUBLISHED', end_date: END_DATE })).toBe(true)
    expect(resolveCourseIsEnded({ is_published: true, end_date: END_DATE })).toBe(true)
    expect(resolveCourseIsEnded({ is_published: 1, end_date: END_DATE })).toBe(true)
  })

  it('returns false for a completely empty object', () => {
    expect(resolveCourseIsEnded({})).toBe(false)
  })
})

describe('resolveCourseComputedStatus', () => {
  it('reports "ended" ahead of every other status', () => {
    expect(resolveCourseComputedStatus({ is_ended: true, status: 'published' })).toBe('ended')
    expect(resolveCourseComputedStatus({ computed_status: 'ended', status: 'draft' })).toBe('ended')
  })

  it('maps published and active onto "published"', () => {
    expect(resolveCourseComputedStatus({ status: 'published' })).toBe('published')
    expect(resolveCourseComputedStatus({ status: 'active' })).toBe('published')
    expect(resolveCourseComputedStatus({ status: 'Published' })).toBe('published')
  })

  it('maps archived onto "archived" and keeps it out of the date-ended path', () => {
    at(Date.parse('2030-01-01T00:00:00'))
    expect(resolveCourseComputedStatus({ status: 'archived', end_date: END_DATE })).toBe('archived')
  })

  it('defaults to "draft" for missing, null or unknown statuses', () => {
    expect(resolveCourseComputedStatus({})).toBe('draft')
    expect(resolveCourseComputedStatus({ status: null })).toBe('draft')
    expect(resolveCourseComputedStatus({ status: 'pending_review' })).toBe('draft')
  })

  it('an is_ended === false course past its end date is reported by its own status', () => {
    at(Date.parse('2030-01-01T00:00:00'))
    expect(resolveCourseComputedStatus({ is_ended: false, status: 'published', end_date: END_DATE })).toBe('published')
  })
})

describe('endedCourseBlocksEnrollment', () => {
  it('never blocks a course that has not ended', () => {
    expect(endedCourseBlocksEnrollment({ status: 'published', end_date: '2099-01-01' })).toBe(false)
    expect(endedCourseBlocksEnrollment({ is_ended: false, registration_open: false })).toBe(false)
  })

  it('blocks an ended course when registration_open is missing, null or false', () => {
    expect(endedCourseBlocksEnrollment({ is_ended: true })).toBe(true)
    expect(endedCourseBlocksEnrollment({ is_ended: true, registration_open: null })).toBe(true)
    expect(endedCourseBlocksEnrollment({ is_ended: true, registration_open: false })).toBe(true)
    expect(endedCourseBlocksEnrollment({ is_ended: true, registration_open: 0 })).toBe(true)
  })

  it('lets an ended course stay open when registration_open is explicitly on', () => {
    expect(endedCourseBlocksEnrollment({ is_ended: true, registration_open: true })).toBe(false)
    expect(endedCourseBlocksEnrollment({ is_ended: true, registration_open: 1 })).toBe(false)
  })

  it('accepts the stringified booleans the API sometimes sends', () => {
    expect(endedCourseBlocksEnrollment({ is_ended: true, registration_open: '1' })).toBe(false)
    expect(endedCourseBlocksEnrollment({ is_ended: true, registration_open: 'true' })).toBe(false)
    expect(endedCourseBlocksEnrollment({ is_ended: true, registration_open: '  TRUE  ' })).toBe(false)
  })

  it('blocks on string values that do not mean "open"', () => {
    expect(endedCourseBlocksEnrollment({ is_ended: true, registration_open: '0' })).toBe(true)
    expect(endedCourseBlocksEnrollment({ is_ended: true, registration_open: 'false' })).toBe(true)
    expect(endedCourseBlocksEnrollment({ is_ended: true, registration_open: '' })).toBe(true)
  })

  it('blocks a date-ended published course with no registration override', () => {
    at(IMPLICIT_END_TS + 1)
    expect(endedCourseBlocksEnrollment({ status: 'published', end_date: END_DATE })).toBe(true)
  })
})

describe('Arabic copy contract', () => {
  it('exposes the shared ended label and detail message used across public + admin', () => {
    expect(ENDED_COURSE_LABEL_AR).toBe('منتهية')
    expect(ENDED_COURSE_DETAIL_MESSAGE).toContain('انتهت هذه الدورة')
  })
})
