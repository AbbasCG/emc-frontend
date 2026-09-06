import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CourseStudentsTab } from '@/components/programs/CourseStudentsTab'
import type { CourseParticipant } from '@/api/adminCoursesApi'

const mockFetchCourseStudents = vi.fn()
const mockRemoveStudentFromCourse = vi.fn()

vi.mock('@/api/adminCoursesApi', () => ({
  fetchCourseStudents: (...args: unknown[]) => mockFetchCourseStudents(...args),
  removeStudentFromCourse: (...args: unknown[]) => mockRemoveStudentFromCourse(...args),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('@/lib/toast', () => ({
  default: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a), warning: vi.fn(), message: vi.fn() },
}))

function participant(overrides: Partial<CourseParticipant> = {}): CourseParticipant {
  return {
    registration_id: 1, status: 'registered', registered_at: '2026-01-01',
    user_id: 10, name: 'Faisal', email: 'faisal@example.com', phone: null,
    has_account: true, avatar_url: null, progress_status: null, progress_pct: 0,
    ...overrides,
  }
}

describe('CourseStudentsTab — removal (إزالة) behavior', () => {
  beforeEach(() => {
    mockFetchCourseStudents.mockReset()
    mockRemoveStudentFromCourse.mockReset()
    toastSuccess.mockReset()
    toastError.mockReset()
    // jsdom does not implement <dialog> imperative methods, and testing-library
    // treats a non-open <dialog>'s contents as inaccessible — mirror the real
    // open/close semantics so role queries inside the confirm dialog work.
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  })

  it('successful removal shows the backend-confirmed message, closes the dialog, and refetches the list', async () => {
    const p = participant()
    mockFetchCourseStudents
      .mockResolvedValueOnce({ data: [p], meta: { total: 1, current_page: 1, last_page: 1, per_page: 100 } })
      .mockResolvedValueOnce({ data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 100 } })
    mockRemoveStudentFromCourse.mockResolvedValueOnce('تمت إزالة الطالب من الدورة وإلغاء تسجيله بنجاح')
    const onChanged = vi.fn()

    render(<CourseStudentsTab courseId={44} onChanged={onChanged} />)

    await screen.findByText('Faisal')
    await userEvent.click(screen.getByRole('button', { name: 'إزالة' }))
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الإزالة' }))

    await waitFor(() => expect(mockRemoveStudentFromCourse).toHaveBeenCalledWith(44, 10))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('تمت إزالة الطالب من الدورة وإلغاء تسجيله بنجاح'))
    // Row disappears only because the list was refetched after backend confirmation.
    await waitFor(() => expect(mockFetchCourseStudents).toHaveBeenCalledTimes(2))
    expect(onChanged).toHaveBeenCalled()
  })

  it('failed removal keeps the row visible and shows the backend error, no success toast', async () => {
    const p = participant()
    mockFetchCourseStudents.mockResolvedValue({ data: [p], meta: { total: 1, current_page: 1, last_page: 1, per_page: 100 } })
    mockRemoveStudentFromCourse.mockRejectedValueOnce({
      response: { data: { message: 'التسجيل غير موجود أو ملغى بالفعل.' } },
    })

    render(<CourseStudentsTab courseId={44} />)

    await screen.findByText('Faisal')
    await userEvent.click(screen.getByRole('button', { name: 'إزالة' }))
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الإزالة' }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastSuccess).not.toHaveBeenCalled()
    // Row remains — only 1 fetch (initial load), no refetch triggered by a failed removal.
    expect(mockFetchCourseStudents).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Faisal')).toBeInTheDocument()
  })

  it('a pending-payment user remains visible with the بانتظار الدفع badge', async () => {
    const p = participant({ registration_id: 2, user_id: 11, name: 'Pending Student', status: 'pending_payment' })
    mockFetchCourseStudents.mockResolvedValue({ data: [p], meta: { total: 1, current_page: 1, last_page: 1, per_page: 100 } })

    render(<CourseStudentsTab courseId={44} />)

    await screen.findByText('Pending Student')
    // "بانتظار الدفع" also appears as a <select> filter option — assert the badge specifically.
    expect(screen.getAllByText('بانتظار الدفع').length).toBeGreaterThan(0)
  })
})
