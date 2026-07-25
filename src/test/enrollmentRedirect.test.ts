import { describe, it, expect } from 'vitest'
import {
  safeEnrollmentRedirect,
  buildCourseEnrollSignupHref,
  enrollActionLabel,
} from '@/utils/enrollmentRedirect'

describe('safeEnrollmentRedirect — accepted internal paths', () => {
  it('passes a plain internal course path through unchanged', () => {
    expect(safeEnrollmentRedirect('/courses/english-101')).toBe('/courses/english-101')
  })

  it('passes the site root through', () => {
    expect(safeEnrollmentRedirect('/')).toBe('/')
  })

  it('preserves query string and hash so the caller lands on the enrol anchor', () => {
    expect(safeEnrollmentRedirect('/courses/english-101?ref=email#enroll')).toBe(
      '/courses/english-101?ref=email#enroll',
    )
  })

  it('preserves a percent-encoded Arabic slug without re-encoding it', () => {
    const path = '/courses/%D8%AF%D9%88%D8%B1%D8%A9'
    expect(safeEnrollmentRedirect(path)).toBe(path)
  })

  it('preserves a raw Arabic slug', () => {
    expect(safeEnrollmentRedirect('/courses/دورة-الإنجليزية')).toBe('/courses/دورة-الإنجليزية')
  })
})

describe('safeEnrollmentRedirect — rejected inputs', () => {
  it('rejects null and undefined', () => {
    expect(safeEnrollmentRedirect(null)).toBeNull()
    expect(safeEnrollmentRedirect(undefined)).toBeNull()
  })

  it('rejects the empty string', () => {
    expect(safeEnrollmentRedirect('')).toBeNull()
  })

  it('rejects a protocol-relative URL that would leave the site', () => {
    expect(safeEnrollmentRedirect('//evil.example')).toBeNull()
    expect(safeEnrollmentRedirect('//evil.example/courses/1')).toBeNull()
  })

  it('rejects absolute URLs on any scheme', () => {
    expect(safeEnrollmentRedirect('https://evil.example/courses/1')).toBeNull()
    expect(safeEnrollmentRedirect('http://evil.example')).toBeNull()
    expect(safeEnrollmentRedirect('javascript:alert(1)')).toBeNull()
    expect(safeEnrollmentRedirect('data:text/html,<script>')).toBeNull()
  })

  it('rejects a relative path that does not start with a slash', () => {
    expect(safeEnrollmentRedirect('courses/english-101')).toBeNull()
    expect(safeEnrollmentRedirect('../admin')).toBeNull()
  })

  it('rejects a leading-whitespace absolute URL rather than trimming into acceptance', () => {
    expect(safeEnrollmentRedirect('  /courses/english-101')).toBeNull()
  })
})

describe('buildCourseEnrollSignupHref', () => {
  it('points at /login with the course detail path as an encoded redirect', () => {
    expect(buildCourseEnrollSignupHref('english-101')).toBe('/login?redirect=%2Fcourses%2Fenglish-101')
  })

  it('encodes the redirect so a decoding consumer recovers the exact Arabic path', () => {
    const href = buildCourseEnrollSignupHref('دورة-الإنجليزية')
    const [, encoded] = href.split('redirect=')
    expect(decodeURIComponent(encoded!)).toBe('/courses/دورة-الإنجليزية')
  })

  it('escapes a slug containing query/hash characters so it cannot break out of the parameter', () => {
    const href = buildCourseEnrollSignupHref('x&next=//evil.example#frag')
    expect(href).not.toContain('&next=')
    expect(href).not.toContain('#')
    const [, encoded] = href.split('redirect=')
    expect(decodeURIComponent(encoded!)).toBe('/courses/x&next=//evil.example#frag')
  })

  it('still yields a /courses/ path for an empty slug', () => {
    expect(buildCourseEnrollSignupHref('')).toBe('/login?redirect=%2Fcourses%2F')
  })
})

describe('enrollActionLabel', () => {
  it('uses the workshop wording for workshops', () => {
    expect(enrollActionLabel('workshop')).toBe('التسجيل في الورشة')
  })

  it('uses the course wording for courses', () => {
    expect(enrollActionLabel('course')).toBe('الالتحاق بالدورة')
  })

  it('falls back to the course wording for programs', () => {
    expect(enrollActionLabel('program')).toBe('الالتحاق بالدورة')
  })

  it('returns distinct labels for workshop vs course', () => {
    expect(enrollActionLabel('workshop')).not.toBe(enrollActionLabel('course'))
  })
})
