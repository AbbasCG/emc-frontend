import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import StudentMyCourseCard from '@/components/dashboard/StudentMyCourseCard'
import { resolveCourseEnrollCta } from '@/utils/publicCourseDetailCta'
import { resolveCourseSeatMetrics } from '@/utils/courseDetailPageData'
import { deriveCourseDetail } from '@/utils/courseDetailDerived'
import type { Course, Enrollment } from '@/types'
import type { StudentCourseAccess } from '@/api/studentApi'

vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))

function course(over: Partial<Course> = {}): Course {
  return { id: 1, title: 'English 101', slug: 'english-101', type: 'paid', price: 99, is_online: true, requires_placement_test: false, ...over } as Course
}

/** What the backend sends once the payment is confirmed but the enrollment waits for finance. */
function underReview(over: Partial<StudentCourseAccess> = {}): StudentCourseAccess {
  return {
    is_paid_course: true, payment_required: false, payment_status: 'payment_confirmed', payment_completed: true, payment_url: null,
    payment_under_review: true, enrollment_active: false, can_start_placement_test: false, placement_test_required: false,
    can_access_learning: false, block_reason: 'payment_under_review', registration_id: 1, ...over,
  }
}

function enrollment(access: StudentCourseAccess): Enrollment {
  return { id: 1, course: course(), enrolled_at: '2026-01-01', completed_sessions: 0, total_sessions: 0, status: 'pending', access } as Enrollment
}

describe('payment received — under review', () => {
  it('My Courses says "received — under review", never "complete payment", and offers no pay or learn action', () => {
    render(
      <MemoryRouter>
        <StudentMyCourseCard enrollment={enrollment(underReview())} />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('تم استلام الدفعة — قيد المراجعة').length).toBeGreaterThan(0)
    expect(screen.getByTestId('payment-under-review')).toHaveTextContent('لا حاجة للدفع مرة أخرى')
    expect(screen.queryByText('إكمال الدفع')).not.toBeInTheDocument()
    expect(screen.queryByText('بانتظار الدفع')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /الدفع/ })).not.toBeInTheDocument()
    expect(screen.queryByText('ابدأ التعلم')).not.toBeInTheDocument()
    expect(screen.queryByText('ابدأ اختبار تحديد المستوى')).not.toBeInTheDocument()
  })

  it('the course detail CTA is a disabled, explained state — no payment link', () => {
    const cta = resolveCourseEnrollCta({
      registrationOpen: true, seatsFull: false, alreadyEnrolled: true, isAuthenticated: true, courseSlug: 'english-101', courseId: 1,
      isPaid: true, access: underReview(),
    })

    expect(cta.label).toBe('تم استلام الدفعة — قيد المراجعة')
    expect(cta.disabled).toBe(true)
    expect(cta.href).toBeUndefined()
    expect(cta.message).toContain('لا حاجة للدفع مرة أخرى')
  })
})

describe('capacity indicators use the backend canonical figures', () => {
  it('prefers seats_remaining / seats_taken over the raw registration count', () => {
    // 10 seats; 6 raw registrations, but 9 seats are held (access-granting + pending-payment reservations).
    const m = resolveCourseSeatMetrics(course({ capacity: 10, registrations_count: 6, seats_taken: 9, seats_remaining: 1 }))
    expect(m).toEqual({ capacity: 10, enrolled: 9, remaining: 1 })
  })

  it('uses seats_remaining as given, even where raw registrations would say otherwise', () => {
    // raw would give 10 - 6 = 4; the backend says 1 seat is left (pending-payment reservations count)
    expect(resolveCourseSeatMetrics(course({ capacity: 10, registrations_count: 6, seats_remaining: 1 })).remaining).toBe(1)
  })

  it('falls back to capacity minus registrations for older payloads', () => {
    expect(resolveCourseSeatMetrics(course({ capacity: 10, registrations_count: 4 })).remaining).toBe(6)
  })

  it('no capacity limit means no remaining figure', () => {
    expect(resolveCourseSeatMetrics(course({ capacity: null, registrations_count: 4 })).remaining).toBeNull()
  })

  it('is_full from the backend decides "full" even when raw registrations look lower', () => {
    const full = deriveCourseDetail(course({ capacity: 10, registrations_count: 6, seats_taken: 10, seats_remaining: 0, is_full: true }))
    expect(full.seatsFull).toBe(true)
    const open = deriveCourseDetail(course({ capacity: 10, registrations_count: 12, seats_taken: 8, seats_remaining: 2, is_full: false }))
    expect(open.seatsFull).toBe(false)
  })
})
