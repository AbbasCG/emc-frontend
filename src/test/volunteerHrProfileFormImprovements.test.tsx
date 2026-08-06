import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('VolunteerHrProfilePage — emergency contact removal, languages, department-scoped job titles, simplified date picker', () => {
  beforeEach(() => {
    mockFetchMyProfile.mockReset().mockResolvedValue(null)
    mockFetchDepartmentOptions.mockReset().mockResolvedValue([
      { id: 1, name_ar: 'التقنية', name: 'Technology' }, { id: 2, name_ar: 'المالية', name: 'Finance' },
    ])
    mockFetchJobTitles.mockReset().mockResolvedValue([
      { id: 10, department_id: 1, name: 'مطور واجهات أمامية' },
      { id: 11, department_id: 1, name: 'مطور Backend' },
    ])
  })

  it('does not render the emergency-contact section', async () => {
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('الاسم الكامل')).toBeInTheDocument())

    expect(screen.queryByText('جهة الاتصال للطوارئ')).not.toBeInTheDocument()
    expect(screen.queryByText('اسم جهة الاتصال')).not.toBeInTheDocument()
    expect(screen.queryByText(/رقم هاتف جهة الاتصال/)).not.toBeInTheDocument()
  })

  it('renders the languages field as a searchable multi-select (react-select), not a free-text input', async () => {
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('اللغات')).toBeInTheDocument())

    // react-select renders a combobox input with the configured placeholder,
    // not a plain <input> the way the old free-text field did.
    expect(screen.getByText('اختر اللغات')).toBeInTheDocument()
  })

  it('does not render the quick-select date buttons (اليوم / غداً / بعد أسبوع) once the calendar is opened', async () => {
    const user = userEvent.setup()
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('تاريخ الميلاد')).toBeInTheDocument())

    const trigger = screen.getByLabelText(/تاريخ الميلاد: اختر التاريخ/)
    await user.click(trigger)

    // Calendar body (month/year nav + days) is open, but the quick-select row is gone.
    expect(screen.queryByText('اليوم')).not.toBeInTheDocument()
    expect(screen.queryByText('غداً')).not.toBeInTheDocument()
    expect(screen.queryByText('بعد أسبوع')).not.toBeInTheDocument()
  })

  it('job-title field is disabled before a department is selected, with the correct placeholder', async () => {
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('المسمى الوظيفي')).toBeInTheDocument())

    const jobTitleSelect = screen.getByRole('combobox', { name: 'المسمى الوظيفي' }) as HTMLSelectElement
    expect(jobTitleSelect).toBeDisabled()
    expect(screen.getByText('اختر القسم أولاً')).toBeInTheDocument()
  })

  it('selecting a department loads and shows that department\'s own job titles', async () => {
    const user = userEvent.setup()
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('القسم')).toBeInTheDocument())

    const deptSelect = screen.getByRole('combobox', { name: 'القسم' }) as HTMLSelectElement
    await user.selectOptions(deptSelect, '1')

    await waitFor(() => expect(mockFetchJobTitles).toHaveBeenCalledWith(1))
    await waitFor(() => expect(screen.getByText('مطور واجهات أمامية')).toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: 'المسمى الوظيفي' })).not.toBeDisabled()
  })

  it('changing department clears a previously selected (now-incompatible) job title', async () => {
    const user = userEvent.setup()
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('القسم')).toBeInTheDocument())

    const deptSelect = screen.getByRole('combobox', { name: 'القسم' }) as HTMLSelectElement
    await user.selectOptions(deptSelect, '1')
    await waitFor(() => expect(screen.getByText('مطور واجهات أمامية')).toBeInTheDocument())

    const jobTitleSelect = screen.getByRole('combobox', { name: 'المسمى الوظيفي' }) as HTMLSelectElement
    await user.selectOptions(jobTitleSelect, 'مطور واجهات أمامية')
    expect(jobTitleSelect.value).toBe('مطور واجهات أمامية')

    mockFetchJobTitles.mockResolvedValueOnce([{ id: 20, department_id: 2, name: 'محاسب' }])
    await user.selectOptions(deptSelect, '2')

    await waitFor(() => expect(mockFetchJobTitles).toHaveBeenLastCalledWith(2))
    // Job-title select resets to its placeholder rather than keeping the stale value.
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'المسمى الوظيفي' }) as HTMLSelectElement).value).toBe(''))
  })

  it('reuses the signup page\'s country selector (same search placeholder, same component)', async () => {
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('الدولة')).toBeInTheDocument())

    // CountrySelect.tsx's exact placeholder text — proves it's the shared component, not a re-implementation.
    expect(screen.getByText('ابحث بالعربية أو English أو رمز الدولة…')).toBeInTheDocument()
  })

  it('reuses the signup page\'s phone input (dial-code prefix + local-number field)', async () => {
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('رقم الهاتف')).toBeInTheDocument())

    // PhoneInput.tsx's exact placeholder — same component signup uses.
    expect(screen.getByPlaceholderText('000 000 0000')).toBeInTheDocument()
  })
})
