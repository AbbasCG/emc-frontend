import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NavigateFunction } from 'react-router'
import {
  buildPublicLoginHref,
  buildCourseDetailEnrollHref,
  buildWorkshopDetailEnrollHref,
  resolvePublicEnrollGate,
  gatePublicEnrollClick,
} from '@/utils/publicEnrollAuth'

const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock('@/lib/toast', () => ({
  default: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
    warning: vi.fn(),
    message: vi.fn(),
  },
}))

beforeEach(() => {
  toastError.mockReset()
  toastSuccess.mockReset()
})

describe('buildPublicLoginHref', () => {
  it('encodes a safe internal path as the login redirect', () => {
    expect(buildPublicLoginHref('/courses/english-101')).toBe('/login?redirect=%2Fcourses%2Fenglish-101')
  })

  it('keeps the enrol hash in the redirect', () => {
    const href = buildPublicLoginHref('/courses/english-101#enroll')
    expect(decodeURIComponent(href.split('redirect=')[1]!)).toBe('/courses/english-101#enroll')
  })

  it('falls back to /dashboard for an off-site absolute URL', () => {
    expect(buildPublicLoginHref('https://evil.example/steal')).toBe('/login?redirect=%2Fdashboard')
  })

  it('falls back to /dashboard for a protocol-relative URL', () => {
    expect(buildPublicLoginHref('//evil.example')).toBe('/login?redirect=%2Fdashboard')
  })

  it('falls back to /dashboard for an empty or non-rooted path', () => {
    expect(buildPublicLoginHref('')).toBe('/login?redirect=%2Fdashboard')
    expect(buildPublicLoginHref('courses/english-101')).toBe('/login?redirect=%2Fdashboard')
  })
})

describe('detail enrol anchors', () => {
  it('builds the course detail enrol anchor', () => {
    expect(buildCourseDetailEnrollHref('english-101')).toBe('/courses/english-101#enroll')
  })

  it('builds the workshop detail enrol anchor on the workshops namespace', () => {
    expect(buildWorkshopDetailEnrollHref('cv-writing')).toBe('/workshops/cv-writing#enroll')
  })

  it('keeps courses and workshops on separate namespaces for the same slug', () => {
    expect(buildCourseDetailEnrollHref('x')).not.toBe(buildWorkshopDetailEnrollHref('x'))
  })
})

describe('resolvePublicEnrollGate', () => {
  it('reports guest for a visitor who is not signed in', () => {
    expect(resolvePublicEnrollGate(false)).toBe('guest')
  })

  it('reports learner for every signed-in account: learning is not a role, so no role is looked at', () => {
    expect(resolvePublicEnrollGate(true)).toBe('learner')
  })
})

describe('gatePublicEnrollClick', () => {
  function setup(overrides: Partial<Parameters<typeof gatePublicEnrollClick>[0]> = {}) {
    const navigate = vi.fn() as unknown as NavigateFunction
    const onLearner = vi.fn()
    const result = gatePublicEnrollClick({
      isAuthenticated: true,
      redirectPath: '/courses/english-101',
      navigate,
      onLearner,
      ...overrides,
    })
    return { navigate: navigate as unknown as ReturnType<typeof vi.fn>, onLearner, result }
  }

  it('sends a guest to the login page carrying the course path and blocks the action', () => {
    const { navigate, onLearner, result } = setup({ isAuthenticated: false })

    expect(result).toBe(false)
    expect(navigate).toHaveBeenCalledWith('/login?redirect=%2Fcourses%2Fenglish-101')
    expect(onLearner).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('sanitises an unsafe redirect before navigating a guest', () => {
    const { navigate } = setup({ isAuthenticated: false, redirectPath: '//evil.example' })
    expect(navigate).toHaveBeenCalledWith('/login?redirect=%2Fdashboard')
  })

  it('lets any signed-in account through, with no toast and no redirect', () => {
    const { navigate, onLearner, result } = setup()

    expect(result).toBe(true)
    expect(onLearner).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('still allows the action when a handler is not supplied', () => {
    const navigate = vi.fn() as unknown as NavigateFunction
    expect(gatePublicEnrollClick({ isAuthenticated: true, redirectPath: '/courses/x', navigate })).toBe(true)
  })
})
