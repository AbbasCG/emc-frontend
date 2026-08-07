import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import VolunteerHrProfilePage from '@/pages/dashboard/VolunteerHrProfilePage'
import type { VolunteerHrProfile } from '@/api/volunteerHrProfileApi'

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

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('@/lib/toast', () => ({
  default: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a), warning: vi.fn(), message: vi.fn() },
}))

// AppFileUpload does real async PDF compression on change — irrelevant to
// post-submission state and slow/flaky under jsdom. Swap in a plain input.
vi.mock('@/components/ui/AppFileUpload', () => ({
  default: ({ label, name, onChange }: { label: string; name: string; onChange: (f: File | null) => void }) => (
    <label>
      {label}
      <input
        type="file"
        name={name}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  ),
}))

function submittedProfile(overrides: Partial<VolunteerHrProfile> = {}): VolunteerHrProfile {
  return {
    id: 1, user_id: 9, full_name: 'أحمد', email: 'ahmad@example.com', phone: '+31612345678',
    phone_country_code: '+31', country: 'هولندا', country_code: 'NL', city: null, date_of_birth: null,
    gender: null, nationality: null, profile_photo_url: null,
    department: { id: 8, name: 'التقنية' }, department_id: 8, job_title: 'مطور Backend',
    employment_type: null, join_date: '2026-08-06', availability: null, weekly_hours: null,
    skills: null, languages: [], education: null, experience: null, motivation: null,
    linkedin_url: null, portfolio_url: null,
    cv: { available: true, file_name: 'cv.pdf', mime_type: 'application/pdf', size: 1000, uploaded_at: '2026-08-06T10:00:00Z' },
    status: 'submitted', submitted_at: '2026-08-06T10:00:00Z', reviewed_at: null, reviewed_by: null,
    rejection_reason: null, approved_at: null, approved_by: null, team_profile_id: null,
    created_at: '2026-08-06T10:00:00Z', updated_at: '2026-08-06T10:00:00Z',
    ...overrides,
  }
}

async function fillMinimalForm(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(screen.getByText('الاسم الكامل')).toBeInTheDocument())
  const inputs = screen.getAllByRole('textbox')
  await user.type(inputs[0], 'أحمد')
  const emailInput = document.querySelector('input[type=email]') as HTMLInputElement
  await user.type(emailInput, 'ahmad@example.com')
  const phoneInput = document.querySelector('input[type=tel]') as HTMLInputElement
  await user.type(phoneInput, '612345678')
  await user.selectOptions(screen.getByRole('combobox', { name: 'القسم' }), '8')
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'المسمى الوظيفي' })).not.toBeDisabled())
  await user.selectOptions(screen.getByRole('combobox', { name: 'المسمى الوظيفي' }), 'مطور Backend')
  const cvInput = document.querySelector('input[name=cv_file]') as HTMLInputElement
  const file = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })
  await user.upload(cvInput, file)
  const checkbox = document.querySelector('input[type=checkbox]') as HTMLInputElement
  await user.click(checkbox)
}

describe('VolunteerHrProfilePage — immediate post-submission confirmation (no blank page, no refresh)', () => {
  beforeEach(() => {
    mockFetchMyProfile.mockReset().mockResolvedValue(null)
    mockFetchDepartmentOptions.mockReset().mockResolvedValue([{ id: 8, name_ar: 'التقنية', name: 'Technology' }])
    mockFetchJobTitles.mockReset().mockResolvedValue([{ id: 20, department_id: 8, name: 'مطور Backend' }])
    mockSubmit.mockReset()
    toastSuccess.mockReset()
    toastError.mockReset()
  })

  it('renders the confirmation card immediately from the mutation response — no refetch, no blank page', async () => {
    const user = userEvent.setup()
    mockSubmit.mockResolvedValue(submittedProfile())
    render(<VolunteerHrProfilePage />)

    await fillMinimalForm(user)
    await user.click(screen.getByRole('button', { name: 'إرسال البيانات' }))

    // The confirmation renders from the mutation's own response — fetchMyVolunteerHrProfile
    // is called exactly once (the initial mount), never a second time to "recover" the view.
    await waitFor(() => expect(screen.getByText('ملفك التعريفي كمتطوع')).toBeInTheDocument())
    expect(screen.getByText('تم الإرسال — قيد الانتظار')).toBeInTheDocument()
    expect(mockFetchMyProfile).toHaveBeenCalledTimes(1)
  })

  it('the form is no longer rendered after successful submission', async () => {
    const user = userEvent.setup()
    mockSubmit.mockResolvedValue(submittedProfile())
    render(<VolunteerHrProfilePage />)

    await fillMinimalForm(user)
    await user.click(screen.getByRole('button', { name: 'إرسال البيانات' }))

    await waitFor(() => expect(screen.getByText('ملفك التعريفي كمتطوع')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'إرسال البيانات' })).not.toBeInTheDocument()
  })

  it('the returned status is stored and reflected in the badge', async () => {
    const user = userEvent.setup()
    mockSubmit.mockResolvedValue(submittedProfile({ status: 'under_review' }))
    render(<VolunteerHrProfilePage />)

    await fillMinimalForm(user)
    await user.click(screen.getByRole('button', { name: 'إرسال البيانات' }))

    await waitFor(() => expect(screen.getByText('قيد المراجعة')).toBeInTheDocument())
  })

  it('renders the submission date, department, and job title from the response', async () => {
    const user = userEvent.setup()
    mockSubmit.mockResolvedValue(submittedProfile())
    render(<VolunteerHrProfilePage />)

    await fillMinimalForm(user)
    await user.click(screen.getByRole('button', { name: 'إرسال البيانات' }))

    await waitFor(() => expect(screen.getByText('ملفك التعريفي كمتطوع')).toBeInTheDocument())
    expect(screen.getByText('التقنية')).toBeInTheDocument()
    expect(screen.getByText('مطور Backend')).toBeInTheDocument()
    expect(screen.getByText('تاريخ التقديم')).toBeInTheDocument()
  })

  it('isSubmitting resets after a successful submission (button re-enabled state gone with the form)', async () => {
    const user = userEvent.setup()
    mockSubmit.mockResolvedValue(submittedProfile())
    render(<VolunteerHrProfilePage />)

    await fillMinimalForm(user)
    const submitBtn = screen.getByRole('button', { name: 'إرسال البيانات' })
    await user.click(submitBtn)

    await waitFor(() => expect(screen.getByText('ملفك التعريفي كمتطوع')).toBeInTheDocument())
    // Submit button no longer exists (confirmation replaced the form) — proves
    // the page didn't get stuck in a perpetual "جارٍ الإرسال..." loading state.
    expect(screen.queryByText('جارٍ الإرسال...')).not.toBeInTheDocument()
  })

  it('isSubmitting resets after a failed submission and the form remains with entered values', async () => {
    const user = userEvent.setup()
    mockSubmit.mockRejectedValue(
      Object.assign(new Error('Validation failed'), {
        isAxiosError: true,
        response: { status: 422, data: { errors: { full_name: ['البيانات غير صحيحة'] } } },
      }),
    )
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true)
    render(<VolunteerHrProfilePage />)

    await fillMinimalForm(user)
    await user.click(screen.getByRole('button', { name: 'إرسال البيانات' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'إرسال البيانات' })).not.toBeDisabled())
    // Form is still visible with the entered name preserved.
    expect(screen.getByDisplayValue('أحمد')).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('shows a single success toast, not duplicated', async () => {
    const user = userEvent.setup()
    mockSubmit.mockResolvedValue(submittedProfile())
    render(<VolunteerHrProfilePage />)

    await fillMinimalForm(user)
    await user.click(screen.getByRole('button', { name: 'إرسال البيانات' }))

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1))
  })

  it('existing submitted profile renders the confirmation immediately on initial load (same as post-submit)', async () => {
    mockFetchMyProfile.mockResolvedValue(submittedProfile())
    render(<VolunteerHrProfilePage />)

    await waitFor(() => expect(screen.getByText('ملفك التعريفي كمتطوع')).toBeInTheDocument())
    expect(screen.getByText('التقنية')).toBeInTheDocument()
  })

  it('no status ever renders a blank page — an unrecognized status still shows a real confirmation card', async () => {
    // @ts-expect-error deliberately testing an unmapped status for the defensive fallback
    mockFetchMyProfile.mockResolvedValue(submittedProfile({ status: 'some_future_status' }))
    render(<VolunteerHrProfilePage />)

    await waitFor(() => expect(screen.getByText('ملفك التعريفي كمتطوع')).toBeInTheDocument())
    expect(screen.getByText('some_future_status')).toBeInTheDocument()
  })
})
