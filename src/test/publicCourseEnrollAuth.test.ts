import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NavigateFunction } from 'react-router'
import {
  PUBLIC_ENROLL_STUDENT_ONLY_MSG,
  isStudentUser,
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

describe('isStudentUser', () => {
  it('recognises the canonical student role', () => {
    expect(isStudentUser('student')).toBe(true)
  })

  it('normalises casing and surrounding whitespace before comparing', () => {
    expect(isStudentUser('  STUDENT  ')).toBe(true)
    expect(isStudentUser('Student')).toBe(true)
  })

  it('rejects every staff role', () => {
    for (const role of ['instructor', 'teacher', 'admin', 'super_admin', 'support_agent', 'partner']) {
      expect(isStudentUser(role)).toBe(false)
    }
  })

  it('rejects null, undefined and empty roles', () => {
    expect(isStudentUser(null)).toBe(false)
    expect(isStudentUser(undefined)).toBe(false)
    expect(isStudentUser('')).toBe(false)
    expect(isStudentUser('   ')).toBe(false)
  })

  it('does not match a role that merely contains "student"', () => {
    expect(isStudentUser('student_affairs')).toBe(false)
    expect(isStudentUser('ex-student')).toBe(false)
  })
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
  it('reports guest whenever the visitor is not authenticated, whatever role is cached', () => {
    expect(resolvePublicEnrollGate(false, null)).toBe('guest')
    expect(resolvePublicEnrollGate(false, 'student')).toBe('guest')
    expect(resolvePublicEnrollGate(false, 'admin')).toBe('guest')
  })

  it('reports student for an authenticated student', () => {
    expect(resolvePublicEnrollGate(true, 'student')).toBe('student')
    expect(resolvePublicEnrollGate(true, ' Student ')).toBe('student')
  })

  it('reports non_student for an authenticated staff member', () => {
    expect(resolvePublicEnrollGate(true, 'instructor')).toBe('non_student')
    expect(resolvePublicEnrollGate(true, 'super_admin')).toBe('non_student')
  })

  it('reports non_student when an authenticated session carries no role', () => {
    expect(resolvePublicEnrollGate(true, null)).toBe('non_student')
    expect(resolvePublicEnrollGate(true, undefined)).toBe('non_student')
  })
})

describe('gatePublicEnrollClick', () => {
  function setup(overrides: Partial<Parameters<typeof gatePublicEnrollClick>[0]> = {}) {
    const navigate = vi.fn() as unknown as NavigateFunction
    const onStudent = vi.fn()
    const result = gatePublicEnrollClick({
      isAuthenticated: true,
      role: 'student',
      redirectPath: '/courses/english-101',
      navigate,
      onStudent,
      ...overrides,
    })
    return { navigate: navigate as unknown as ReturnType<typeof vi.fn>, onStudent, result }
  }

  it('sends a guest to the login page carrying the course path and blocks the action', () => {
    const { navigate, onStudent, result } = setup({ isAuthenticated: false, role: null })

    expect(result).toBe(false)
    expect(navigate).toHaveBeenCalledWith('/login?redirect=%2Fcourses%2Fenglish-101')
    expect(onStudent).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('sanitises an unsafe redirect before navigating a guest', () => {
    const { navigate } = setup({ isAuthenticated: false, role: null, redirectPath: '//evil.example' })
    expect(navigate).toHaveBeenCalledWith('/login?redirect=%2Fdashboard')
  })

  it('shows the Arabic student-only toast for a signed-in non-student and blocks the action', () => {
    const { navigate, onStudent, result } = setup({ role: 'instructor' })

    expect(result).toBe(false)
    expect(toastError).toHaveBeenCalledWith(PUBLIC_ENROLL_STUDENT_ONLY_MSG)
    expect(navigate).not.toHaveBeenCalled()
    expect(onStudent).not.toHaveBeenCalled()
  })

  it('runs the student callback and allows the action for a signed-in student', () => {
    const { navigate, onStudent, result } = setup()

    expect(result).toBe(true)
    expect(onStudent).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('still allows the action when a student handler is not supplied', () => {
    const navigate = vi.fn() as unknown as NavigateFunction
    expect(() =>
      gatePublicEnrollClick({
        isAuthenticated: true,
        role: 'student',
        redirectPath: '/courses/x',
        navigate,
      }),
    ).not.toThrow()
    expect(
      gatePublicEnrollClick({
        isAuthenticated: true,
        role: 'student',
        redirectPath: '/courses/x',
        navigate,
      }),
    ).toBe(true)
  })

  it('treats a legacy "teacher" role as staff, not as a student', () => {
    const { onStudent, result } = setup({ role: 'teacher' })
    expect(result).toBe(false)
    expect(onStudent).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(PUBLIC_ENROLL_STUDENT_ONLY_MSG)
  })
})

describe('student-only message copy', () => {
  it('is the Arabic sign-in-as-student instruction', () => {
    expect(PUBLIC_ENROLL_STUDENT_ONLY_MSG).toBe('يجب تسجيل الدخول كطالب للالتحاق بهذا البرنامج')
  })
})
