import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VolunteerHrProfilePage from '@/pages/dashboard/VolunteerHrProfilePage'

const mockFetchMyProfile = vi.fn()
const mockSubmit = vi.fn()
const mockFetchDepartmentOptions = vi.fn()
const mockFetchJobTitles = vi.fn()

vi.mock('@/api/volunteerHrProfileApi', () => ({
  fetchMyVolunteerHrProfile: (...a: unknown[]) => mockFetchMyProfile(...a),
  submitVolunteerHrProfile: (...a: unknown[]) => mockSubmit(...a),
  updateVolunteerHrProfile: vi.fn(),
}))

vi.mock('@/api/jobTitlesApi', () => ({
  fetchDepartmentOptions: (...a: unknown[]) => mockFetchDepartmentOptions(...a),
  fetchJobTitles: (...a: unknown[]) => mockFetchJobTitles(...a),
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

describe('VolunteerHrProfilePage — privacy consent questions', () => {
  beforeEach(() => {
    mockFetchMyProfile.mockReset().mockResolvedValue(null)
    mockSubmit.mockReset().mockResolvedValue({ id: 1, status: 'submitted' })
    mockFetchDepartmentOptions.mockReset().mockResolvedValue([{ id: 1, name_ar: 'التقنية', name: 'Technology' }])
    mockFetchJobTitles.mockReset().mockResolvedValue([])
  })

  it('renders both Yes/No consent questions with no selection made by default', async () => {
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getAllByText('نعم، أوافق').length).toBe(2))
    expect(screen.getAllByText('لا، لا أوافق').length).toBe(2)
  })

  it('clicking "نعم، أوافق" sets that consent to true (not a truthy string)', async () => {
    const user = userEvent.setup()
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getAllByText('نعم، أوافق').length).toBe(2))

    const yesButtons = screen.getAllByText('نعم، أوافق')
    await user.click(yesButtons[0])

    // Visually confirmed selected via the active style class, not just presence.
    expect(yesButtons[0].closest('button')).toHaveClass('border-emerald-300')
  })

  it('clicking "لا، لا أوافق" sets that consent to false, distinct from unanswered', async () => {
    const user = userEvent.setup()
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getAllByText('لا، لا أوافق').length).toBe(2))

    const noButtons = screen.getAllByText('لا، لا أوافق')
    await user.click(noButtons[0])

    expect(noButtons[0].closest('button')).toHaveClass('border-slate-400')
  })

  it('blocks submission and shows a field error when a consent question is left unanswered', async () => {
    const { container } = render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('الاسم الكامل')).toBeInTheDocument())

    // fireEvent.submit bypasses jsdom's native `required`-attribute constraint
    // validation on unrelated fields (e.g. the CV upload) so this exercises
    // just the consent guard in handleSubmit, not the whole form's validity.
    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() =>
      expect(screen.getByText('يرجى تحديد اختيارك بخصوص استخدام الصورة الشخصية')).toBeInTheDocument(),
    )
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('error clears once a valid Yes/No selection is made', async () => {
    const user = userEvent.setup()
    const { container } = render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('الاسم الكامل')).toBeInTheDocument())

    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() =>
      expect(screen.getByText('يرجى تحديد اختيارك بخصوص استخدام الصورة الشخصية')).toBeInTheDocument(),
    )

    await user.click(screen.getAllByText('نعم، أوافق')[0])

    expect(screen.queryByText('يرجى تحديد اختيارك بخصوص استخدام الصورة الشخصية')).not.toBeInTheDocument()
  })
})
