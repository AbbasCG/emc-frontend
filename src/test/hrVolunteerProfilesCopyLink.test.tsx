import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import HrVolunteerProfilesPage from '@/pages/dashboard/HrVolunteerProfilesPage'

const mockFetchProfiles = vi.fn()
const mockFetchFilterOptions = vi.fn()

vi.mock('@/api/hrVolunteerProfilesApi', () => ({
  fetchHrVolunteerProfiles: (...a: unknown[]) => mockFetchProfiles(...a),
  fetchHrVolunteerProfileFilterOptions: (...a: unknown[]) => mockFetchFilterOptions(...a),
  fetchHrVolunteerProfile: vi.fn(),
  startVolunteerProfileReview: vi.fn(),
  approveVolunteerProfile: vi.fn(),
  rejectVolunteerProfile: vi.fn(),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('@/lib/toast', () => ({
  default: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a), warning: vi.fn(), message: vi.fn() },
}))

let mockRole = 'hr_manager'
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'HR', role: mockRole }, isAuthenticated: true, isLoading: false }),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/hr/volunteers']}>
      <Routes>
        <Route path="/dashboard/hr/volunteers" element={<HrVolunteerProfilesPage />} />
        <Route path="/dashboard/hr/volunteers/:id" element={<HrVolunteerProfilesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HrVolunteerProfilesPage — copy volunteer form link', () => {
  beforeEach(() => {
    mockRole = 'hr_manager'
    mockFetchProfiles.mockReset().mockResolvedValue({
      data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 20 },
      statistics: { total: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0, departments_count: 0, joined_this_month: 0 },
    })
    mockFetchFilterOptions.mockReset().mockResolvedValue({ departments: [], statuses: [] })
    toastSuccess.mockReset()
    toastError.mockReset()
  })

  it('shows the copy-link button for hr_manager', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('نسخ رابط نموذج المتطوع')).toBeInTheDocument())
  })

  it('shows the copy-link button for admin, super_admin, and tech_admin', async () => {
    for (const role of ['admin', 'super_admin', 'tech_admin']) {
      mockRole = role
      const { unmount } = renderPage()
      await waitFor(() => expect(screen.getByText('نسخ رابط نموذج المتطوع')).toBeInTheDocument())
      unmount()
    }
  })

  it('does not show the copy-link button for an unauthorized role', async () => {
    mockRole = 'student'
    renderPage()
    await waitFor(() => expect(mockFetchProfiles).toHaveBeenCalled())
    expect(screen.queryByText('نسخ رابط نموذج المتطوع')).not.toBeInTheDocument()
  })

  it('copies the correct absolute URL using window.location.origin and shows a success toast', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('نسخ رابط نموذج المتطوع')).toBeInTheDocument())

    await user.click(screen.getByText('نسخ رابط نموذج المتطوع'))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/dashboard/volunteer/hr-profile`))
    expect(toastSuccess).toHaveBeenCalledWith('تم نسخ رابط نموذج المتطوع')
  })

  it('shows a failure toast and a manual-copy fallback when the Clipboard API is unavailable', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('نسخ رابط نموذج المتطوع')).toBeInTheDocument())

    await user.click(screen.getByText('نسخ رابط نموذج المتطوع'))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('تعذر نسخ الرابط، يمكنك نسخه يدوياً'))
    expect(screen.getByDisplayValue(`${window.location.origin}/dashboard/volunteer/hr-profile`)).toBeInTheDocument()
  })
})
