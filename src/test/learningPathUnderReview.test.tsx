import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import apiClient from '@/api/axios'
import { fetchEnrollmentStatus, type StudentEnrollment } from '@/api/learningPathsApi'
import StudentLearningPathsPage from '@/pages/lms/student/StudentLearningPathsPage'

vi.mock('@/api/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

const mocked = apiClient as unknown as { get: ReturnType<typeof vi.fn> }

function row(over: Partial<StudentEnrollment> & { enrollment_id: number; pathId: number }): StudentEnrollment {
  const { pathId, ...rest } = over
  return {
    enrollment_status: 'active',
    enrolled_at: null,
    completed_at: null,
    learning_path: { id: pathId, title: `مسار ${pathId}`, slug: `p-${pathId}`, courses_count: 2, duration: 4, duration_unit: 'weeks' } as unknown as StudentEnrollment['learning_path'],
    ...rest,
  } as StudentEnrollment
}

beforeEach(() => mocked.get.mockReset())

describe('learning path enrollment status — payment under review', () => {
  it('passes the server flag through and never offers a checkout', async () => {
    mocked.get.mockResolvedValueOnce({ data: { success: true, enrolled: false, payment_under_review: true, requires_checkout: false, checkout_url: null, enrollment: { id: 1, status: 'pending_payment', enrolled_at: '', completed_at: null } } })
    const s = await fetchEnrollmentStatus('p-1')
    expect(s.payment_under_review).toBe(true)
    expect(s.requires_checkout).toBe(false)
    expect(s.checkout_url).toBeNull()
  })

  it('leaves the flag out when the server does not say so', async () => {
    mocked.get.mockResolvedValueOnce({ data: { success: true, enrolled: true, enrollment: null } })
    expect((await fetchEnrollmentStatus('p-1')).payment_under_review).toBeUndefined()
  })
})

describe('StudentLearningPathsPage — payment states', () => {
  async function renderPage(rows: StudentEnrollment[]) {
    mocked.get.mockResolvedValue({ data: { success: true, data: rows } })
    render(
      <MemoryRouter>
        <StudentLearningPathsPage />
      </MemoryRouter>,
    )
    await screen.findByText(`مسار ${rows[0].learning_path.id}`)
  }

  it('shows "payment received — under review" and not "in progress" for a withheld enrollment', async () => {
    await renderPage([row({ enrollment_id: 1, pathId: 1, enrollment_status: 'pending_payment', payment_under_review: true })])
    expect(screen.getByTestId('path-card-under-review')).toHaveTextContent('تم استلام الدفعة — قيد المراجعة')
    expect(screen.queryByText('جاري')).not.toBeInTheDocument()
    expect(screen.queryByText('بانتظار الدفع')).not.toBeInTheDocument()
  })

  it('an unpaid pending enrollment says "awaiting payment", an active one says "in progress"', async () => {
    await renderPage([
      row({ enrollment_id: 1, pathId: 1, enrollment_status: 'pending_payment' }),
      row({ enrollment_id: 2, pathId: 2, enrollment_status: 'active' }),
    ])
    expect(screen.getByText('بانتظار الدفع')).toBeInTheDocument()
    expect(screen.getByText('جاري')).toBeInTheDocument()
    expect(screen.queryByTestId('path-card-under-review')).not.toBeInTheDocument()
  })
})
