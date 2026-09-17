import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompleteTaskModal } from '@/components/tickets/modals/CompleteTaskModal'

const mockCompleteTask = vi.fn().mockResolvedValue({ success: true })
vi.mock('@/services/ticketService', () => ({
  ticketService: {
    completeTask: (...args: unknown[]) => mockCompleteTask(...args),
  },
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

/**
 * Regression: TicketController::completeTask() validates `resolution_type`
 * (required|in:RESOLVED,UNRESOLVED) — a payload sent under any other field
 * name (e.g. the pre-existing `completion_status` bug in
 * AssigneeWorkspacePage) 422s and the ticket can never be closed. Both
 * surfaces that call this endpoint must send the same field name the backend
 * actually validates.
 */
describe('CompleteTaskModal — sends the field the backend actually validates', () => {
  beforeEach(() => {
    mockCompleteTask.mockClear()
  })

  it('submits resolution_type (not completion_status) on the FormData', async () => {
    render(<CompleteTaskModal ticketId={9} onClose={vi.fn()} onSuccess={vi.fn()} />)

    await userEvent.type(
      screen.getByPlaceholderText('اشرح الإجراءات التقنية المتخذة والنتيجة التي تحققت...'),
      'تم استبدال الكابل وإعادة تشغيل الجهاز',
    )
    await userEvent.click(screen.getByText('✅ تأكيد الحل والإغلاق'))

    expect(mockCompleteTask).toHaveBeenCalledTimes(1)
    const [, formData] = mockCompleteTask.mock.calls[0] as [number, FormData]
    expect(formData.get('resolution_type')).toBe('RESOLVED')
    expect(formData.get('completion_status')).toBeNull()
  })
})
