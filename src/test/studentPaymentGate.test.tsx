import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import StudentMyCourseCard from '@/components/dashboard/StudentMyCourseCard'
import PaymentRequiredCta from '@/components/dashboard/PaymentRequiredCta'
import type { Course, Enrollment } from '@/types'
import type { StudentCourseAccess } from '@/api/studentApi'

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: 1, title: 'English 101', slug: 'english-101', type: 'paid', price: 99, is_online: true,
    requires_placement_test: false,
    ...overrides,
  } as Course
}

function access(overrides: Partial<StudentCourseAccess> = {}): StudentCourseAccess {
  return {
    is_paid_course: true, payment_required: true, payment_status: 'pending_payment',
    payment_completed: false, payment_url: null, enrollment_active: false,
    can_start_placement_test: false, placement_test_required: false, can_access_learning: false,
    block_reason: 'payment_required', registration_id: 1,
    ...overrides,
  }
}

function enrollment(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    id: 1, course: course(), enrolled_at: '2026-01-01', completed_sessions: 0, total_sessions: 0,
    status: 'pending',
    ...overrides,
  } as Enrollment
}

function renderCard(e: Enrollment) {
  return render(
    <MemoryRouter>
      <StudentMyCourseCard enrollment={e} />
    </MemoryRouter>,
  )
}

describe('StudentMyCourseCard — payment gate (production hotfix)', () => {
  it('an unpaid (pending_payment) paid course shows a payment CTA, not ابدأ التعلم', () => {
    renderCard(enrollment({ access: access({ block_reason: 'payment_required' }) }))

    expect(screen.queryByText('ابدأ التعلم')).not.toBeInTheDocument()
    expect(screen.queryByText('ابدأ اختبار تحديد المستوى')).not.toBeInTheDocument()
    expect(screen.getByText('إكمال الدفع')).toBeInTheDocument()
  })

  it('shows the بانتظار الدفع badge for a plain payment_required block reason', () => {
    renderCard(enrollment({ access: access({ block_reason: 'payment_required' }) }))
    expect(screen.getByText('بانتظار الدفع')).toBeInTheDocument()
  })

  it('shows a pending-review state (no clickable payment button) for payment_pending', () => {
    renderCard(enrollment({ access: access({ block_reason: 'payment_pending', payment_status: 'pending_payment' }) }))

    expect(screen.getAllByText('الدفع قيد المراجعة').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /إكمال الدفع/ })).not.toBeInTheDocument()
  })

  it('shows a retry-payment state for payment_failed', () => {
    renderCard(enrollment({ access: access({ block_reason: 'payment_failed', payment_status: 'payment_failed' }) }))

    expect(screen.getByText('فشل الدفع')).toBeInTheDocument()
    expect(screen.getByText('إعادة محاولة الدفع')).toBeInTheDocument()
  })

  it('a paid student with placement still required sees the existing placement flow, not a payment CTA', () => {
    renderCard(enrollment({
      status: 'active',
      course: course({ requires_placement_test: true }),
      placement_status: 'not_started',
      can_start_learning: false,
      access: access({
        payment_completed: true, enrollment_active: true, block_reason: 'placement_test_required',
        can_start_placement_test: true, placement_test_required: true,
      }),
    }))

    expect(screen.queryByText('إكمال الدفع')).not.toBeInTheDocument()
    expect(screen.getByText('ابدأ اختبار تحديد المستوى')).toBeInTheDocument()
  })

  it('a free course is never marked payment_required regardless of status', () => {
    renderCard(enrollment({
      status: 'active',
      course: course({ type: 'free', price: 0 }),
      can_start_learning: true,
      access: access({ is_paid_course: false, payment_required: false, payment_completed: true, enrollment_active: true, block_reason: 'access_allowed' }),
    }))

    expect(screen.queryByText('إكمال الدفع')).not.toBeInTheDocument()
    expect(screen.queryByText('بانتظار الدفع')).not.toBeInTheDocument()
  })

  it('a fully paid, no-placement course shows the normal ابدأ التعلم action', () => {
    renderCard(enrollment({
      status: 'active',
      can_start_learning: true,
      access: access({ payment_completed: true, enrollment_active: true, block_reason: 'access_allowed' }),
    }))

    expect(screen.getByText('ابدأ التعلم')).toBeInTheDocument()
  })

  it('preserves payment_completed === false correctly rather than treating it as missing/truthy', () => {
    const a = access({ payment_completed: false })
    expect(a.payment_completed).toBe(false)
    renderCard(enrollment({ access: a }))
    expect(screen.queryByText('ابدأ التعلم')).not.toBeInTheDocument()
  })
})

describe('PaymentRequiredCta — navigation behavior', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    })
  })

  it('navigates to the real stored payment_url on click', async () => {
    render(
      <MemoryRouter>
        <PaymentRequiredCta access={access({ payment_url: 'https://checkout.stripe.com/pay/cs_test_123' })} course={course()} />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: /إكمال الدفع/ }))
    expect(window.location.href).toBe('https://checkout.stripe.com/pay/cs_test_123')
  })

  it('double-click does not trigger a second navigation once busy', async () => {
    render(
      <MemoryRouter>
        <PaymentRequiredCta access={access({ payment_url: 'https://checkout.stripe.com/pay/cs_test_123' })} course={course()} />
      </MemoryRouter>,
    )

    const button = screen.getByRole('button', { name: /إكمال الدفع/ })
    await userEvent.click(button)
    const afterFirstClick = window.location.href
    await userEvent.click(button)
    expect(window.location.href).toBe(afterFirstClick)
  })

  it('shows a recoverable error and a course-details fallback link when no payment_url is available', async () => {
    render(
      <MemoryRouter>
        <PaymentRequiredCta access={access({ payment_url: null })} course={course()} />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: /إكمال الدفع/ }))
    expect(window.location.href).toBe('')
    expect(screen.getByText('عرض تفاصيل الدورة')).toBeInTheDocument()
  })

  it('renders Arabic RTL-appropriate labels', () => {
    render(
      <MemoryRouter>
        <PaymentRequiredCta access={access({ block_reason: 'payment_pending' })} course={course()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('الدفع قيد المراجعة')).toBeInTheDocument()
  })
})
