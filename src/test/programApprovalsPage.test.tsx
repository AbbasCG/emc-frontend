import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProgramApprovalsPage from '@/pages/finance/ProgramApprovalsPage'
import type { FinanceApprovalItem } from '@/api/programFinanceApi'

const mockList = vi.fn()
const mockApprove = vi.fn()
const mockReject = vi.fn()

vi.mock('@/api/programFinanceApi', () => ({
  programFinanceApi: {
    list: (...args: unknown[]) => mockList(...args),
    approve: (...args: unknown[]) => mockApprove(...args),
    reject: (...args: unknown[]) => mockReject(...args),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

function item(overrides: Partial<FinanceApprovalItem> = {}): FinanceApprovalItem {
  return {
    id: 1,
    status: 'pending',
    request_type: 'create',
    changes: null,
    approvable_type: 'Course',
    approvable_id: 10,
    submitted_at: '2026-09-20T10:00:00Z',
    reviewed_at: null,
    review_note: null,
    rejection_reason: null,
    price_snapshot: 100,
    currency_snapshot: 'EUR',
    submitter: { id: 2, name: 'منسق البرامج', email: 'a@b.c', role: 'programs_manager' },
    reviewer: null,
    program: {
      id: 10, title: 'English A1', type: 'Course', program_type: null,
      price: 100, currency: 'EUR', status: 'draft', created_by: null,
    },
    ...overrides,
  }
}

function respond(items: FinanceApprovalItem[]) {
  return {
    data: {
      success: true,
      data: items,
      meta: { current_page: 1, last_page: 1, total: items.length, per_page: 50 },
      summary: { pending: items.length, approved: 0, rejected: 0 },
    },
  }
}

describe('ProgramApprovalsPage — create vs edit requests', () => {
  beforeEach(() => {
    mockList.mockReset()
    mockApprove.mockReset()
    mockReject.mockReset()
  })

  it('labels a first-time submission as a creation request', async () => {
    mockList.mockResolvedValue(respond([item()]))
    render(<ProgramApprovalsPage />)

    expect(await screen.findByText('إنشاء دورة')).toBeInTheDocument()
  })

  it('labels an edit to an approved course as a change request', async () => {
    mockList.mockResolvedValue(respond([item({
      request_type: 'update',
      changes: { price: { from: 100, to: 150 } },
    })]))
    render(<ProgramApprovalsPage />)

    expect(await screen.findByText('تعديل دورة معتمد')).toBeInTheDocument()
  })

  it('labels a learning path edit with the path wording', async () => {
    mockList.mockResolvedValue(respond([item({
      approvable_type: 'LearningPath',
      request_type: 'update',
      changes: { price: { from: 200, to: 250 } },
    })]))
    render(<ProgramApprovalsPage />)

    expect(await screen.findByText('تعديل مسار تعليمي معتمد')).toBeInTheDocument()
  })

  it('shows the before and after values so Finance approves a visible delta', async () => {
    mockList.mockResolvedValue(respond([item({
      request_type: 'update',
      changes: { price: { from: 100, to: 150 } },
    })]))
    render(<ProgramApprovalsPage />)

    const diff = await screen.findByTestId('finance-changes-diff')
    expect(within(diff).getByText('السعر')).toBeInTheDocument()
    expect(within(diff).getByText(/100/)).toBeInTheDocument()
    expect(within(diff).getByText(/150/)).toBeInTheDocument()
  })

  it('renders a course-membership change as added/removed rather than raw ids', async () => {
    mockList.mockResolvedValue(respond([item({
      approvable_type: 'LearningPath',
      request_type: 'update',
      changes: { course_ids: { from: [1, 2], to: [1, 3] } },
    })]))
    render(<ProgramApprovalsPage />)

    const diff = await screen.findByTestId('finance-changes-diff')
    expect(within(diff).getByText('+ 1 دورة')).toBeInTheDocument()
    expect(within(diff).getByText('− 1 دورة')).toBeInTheDocument()
  })

  it('renders no diff block for a plain creation request', async () => {
    mockList.mockResolvedValue(respond([item()]))
    render(<ProgramApprovalsPage />)

    await screen.findByText('English A1')
    expect(screen.queryByTestId('finance-changes-diff')).not.toBeInTheDocument()
  })
})

describe('ProgramApprovalsPage — entity filtering', () => {
  beforeEach(() => {
    mockList.mockReset()
    mockList.mockResolvedValue(respond([item()]))
  })

  it('does not send a type filter while showing everything', async () => {
    render(<ProgramApprovalsPage />)
    await screen.findByText('English A1')

    expect(mockList).toHaveBeenCalledWith(expect.not.objectContaining({ approvable_type: expect.anything() }))
  })

  it('asks the API for learning paths only when that filter is chosen', async () => {
    render(<ProgramApprovalsPage />)
    await screen.findByText('English A1')

    await userEvent.click(within(screen.getByTestId('finance-type-filters')).getByText('المسارات التعليمية'))

    await waitFor(() => {
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ approvable_type: 'LearningPath' }))
    })
  })

  it('asks the API for courses only when that filter is chosen', async () => {
    render(<ProgramApprovalsPage />)
    await screen.findByText('English A1')

    await userEvent.click(within(screen.getByTestId('finance-type-filters')).getByText('الدورات'))

    await waitFor(() => {
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ approvable_type: 'Course' }))
    })
  })
})

describe('ProgramApprovalsPage — review actions', () => {
  beforeEach(() => {
    mockList.mockReset()
    mockApprove.mockReset()
    mockReject.mockReset()
  })

  it('shows the diff inside the approve dialog, where the decision is made', async () => {
    mockList.mockResolvedValue(respond([item({
      request_type: 'update',
      changes: { price: { from: 100, to: 150 } },
    })]))
    render(<ProgramApprovalsPage />)

    await userEvent.click(await screen.findByText('اعتماد'))

    expect(await screen.findByText('التغييرات المطلوب اعتمادها')).toBeInTheDocument()
  })

  it('approves through the API', async () => {
    mockList.mockResolvedValue(respond([item()]))
    mockApprove.mockResolvedValue({})
    render(<ProgramApprovalsPage />)

    await userEvent.click(await screen.findByText('اعتماد'))
    await userEvent.click(await screen.findByText('تأكيد الاعتماد'))

    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith(1, undefined))
  })

  it('requires a reason before it will reject', async () => {
    mockList.mockResolvedValue(respond([item()]))
    render(<ProgramApprovalsPage />)

    await userEvent.click(await screen.findByText('رفض'))
    const confirm = await screen.findByText('تأكيد الرفض')
    await userEvent.click(confirm)

    expect(mockReject).not.toHaveBeenCalled()
  })

  it('rejects with the supplied reason', async () => {
    mockList.mockResolvedValue(respond([item()]))
    mockReject.mockResolvedValue({})
    render(<ProgramApprovalsPage />)

    await userEvent.click(await screen.findByText('رفض'))
    await userEvent.type(await screen.findByPlaceholderText('اكتب سبب الرفض...'), 'السعر مرتفع')
    await userEvent.click(screen.getByText('تأكيد الرفض'))

    await waitFor(() => expect(mockReject).toHaveBeenCalledWith(1, 'السعر مرتفع', undefined))
  })

  it('recovers gracefully when the backend rejects a stale approval', async () => {
    // The program was edited again after this request was raised, so the
    // backend answers 409 rather than blessing a version nobody reviewed.
    mockList.mockResolvedValue(respond([item({ request_type: 'update', changes: { price: { from: 100, to: 150 } } })]))
    mockApprove.mockRejectedValue({ response: { status: 409 } })
    render(<ProgramApprovalsPage />)

    await userEvent.click(await screen.findByText('اعتماد'))
    await userEvent.click(await screen.findByText('تأكيد الاعتماد'))

    // Dialog closes and the list is refetched so the reviewer sees the
    // current proposal instead of being stuck on the stale one.
    await waitFor(() => expect(screen.queryByText('تأكيد الاعتماد')).not.toBeInTheDocument())
    await waitFor(() => expect(mockList.mock.calls.length).toBeGreaterThan(1))
  })

  it('does not offer approve/reject on an already reviewed request', async () => {
    mockList.mockResolvedValue(respond([item({ status: 'approved', reviewed_at: '2026-09-21T09:00:00Z' })]))
    render(<ProgramApprovalsPage />)

    await screen.findByText('English A1')
    expect(screen.queryByText('اعتماد')).not.toBeInTheDocument()
    expect(screen.queryByText('رفض')).not.toBeInTheDocument()
  })
})
