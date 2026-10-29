import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import HrVolunteerProfilesPage from '@/pages/dashboard/HrVolunteerProfilesPage'
import toast from '@/lib/toast'
import type { VolunteerHrProfile } from '@/api/volunteerHrProfileApi'

/**
 * HR edits a volunteer's profile from the detail modal of /dashboard/hr/volunteers: the form opens prefilled, sends only what
 * changed (with the version it was loaded at), shows the saved profile and refreshes the list, and explains every refusal.
 */

const mockFetchProfiles = vi.fn()
const mockFetchFilterOptions = vi.fn()
const mockFetchProfile = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/api/hrVolunteerProfilesApi', () => ({
  fetchHrVolunteerProfiles: (...a: unknown[]) => mockFetchProfiles(...a),
  fetchHrVolunteerProfileFilterOptions: (...a: unknown[]) => mockFetchFilterOptions(...a),
  fetchHrVolunteerProfile: (...a: unknown[]) => mockFetchProfile(...a),
  updateHrVolunteerProfile: (...a: unknown[]) => mockUpdate(...a),
  startVolunteerProfileReview: vi.fn(),
  approveVolunteerProfile: vi.fn(),
  rejectVolunteerProfile: vi.fn(),
  fetchVolunteerHrProfileCvBlob: vi.fn(),
}))
vi.mock('@/api/jobTitlesApi', () => ({
  fetchJobTitles: vi.fn().mockResolvedValue([{ id: 1, department_id: 1, name: 'مطور برمجيات' }, { id: 2, department_id: 1, name: 'قائد فريق' }]),
}))
vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'HR', role: 'hr_manager' }, isAuthenticated: true, isLoading: false }),
}))

const httpError = (status: number, data: unknown = {}) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } })

function profile(overrides: Partial<VolunteerHrProfile> = {}): VolunteerHrProfile {
  return {
    id: 1, user_id: 5, full_name: 'أحمد محمد', email: 'ahmad@example.com',
    phone: '0612345678', phone_country_code: '+31', country: 'هولندا', country_code: 'NL',
    city: 'أمستردام', date_of_birth: '1995-06-16', gender: 'male', nationality: 'NL',
    profile_photo_url: null,
    department: { id: 1, name: 'التقنية' }, department_id: 1, job_title: 'مطور برمجيات',
    employment_type: 'volunteer', join_date: '2026-08-06', availability: 'مساءً', weekly_hours: 5,
    skills: 'PHP, React', languages: ['العربية'], education: 'bachelor',
    university_specialization: 'علوم الحاسوب', experience: '3 سنوات', motivation: 'حب العطاء',
    professional_bio: 'نبذة', linkedin_url: null, portfolio_url: null,
    emergency_contact_name: null, emergency_contact_phone: null,
    photo_publication_consent: true, photo_consent_at: null, professional_profile_consent: true, professional_profile_consent_at: null,
    cv: { available: false, file_name: null, mime_type: null, size: null, uploaded_at: null },
    status: 'approved', submitted_at: '2026-08-06T09:00:00Z', reviewed_at: null, reviewed_by: null,
    rejection_reason: null, approved_at: '2026-08-07T09:00:00Z', approved_by: null, team_profile_id: 9,
    created_at: '2026-08-06T09:00:00Z', updated_at: '2026-08-07T09:00:00+00:00',
    ...overrides,
  } as VolunteerHrProfile
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/hr/volunteers/1']}>
      <Routes>
        <Route path="/dashboard/hr/volunteers" element={<HrVolunteerProfilesPage />} />
        <Route path="/dashboard/hr/volunteers/:id" element={<HrVolunteerProfilesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function openEditor(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /تعديل معلومات التطوع/ }))
  return screen.findByTestId('hr-volunteer-edit')
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetchProfiles.mockResolvedValue({
    data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 20 },
    statistics: { total: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0, departments_count: 0, joined_this_month: 0 },
  })
  mockFetchFilterOptions.mockResolvedValue({ departments: [{ id: 1, name_ar: 'التقنية', name: 'Tech' }, { id: 2, name_ar: 'الإعلام', name: 'Media' }], statuses: [] })
  mockFetchProfile.mockResolvedValue(profile())
})

describe('HR volunteer profile editing', () => {
  it('opens the form prefilled with the current values', async () => {
    const user = userEvent.setup()
    renderDetail()
    const form = await openEditor(user)

    expect(within(form).getByLabelText(/الاسم الكامل/)).toHaveValue('أحمد محمد')
    expect(within(form).getByLabelText(/^البريد الإلكتروني/)).toHaveValue('ahmad@example.com')
    expect(within(form).getByRole('combobox', { name: /^القسم/ })).toHaveValue('1')
    expect(within(form).getByLabelText(/المسمى الوظيفي/)).toHaveValue('مطور برمجيات')
    expect(within(form).getByLabelText(/تاريخ الانضمام/)).toHaveValue('2026-08-06')
    expect(within(form).getByLabelText(/المؤهل الدراسي/)).toHaveValue('bachelor')
    expect(within(form).getByLabelText(/الجنسية/)).toHaveValue('NL')
    expect(within(form).getByText(/تُحدَّث في سجل الفريق أيضاً/)).toBeInTheDocument()
    // the sensitive parts are not in the form at all
    expect(within(form).queryByLabelText(/كلمة المرور/)).toBeNull()
    expect(within(form).queryByLabelText(/الدور/)).toBeNull()
  })

  it('sends only the changed fields with the loaded version, then shows the saved profile and refreshes the list', async () => {
    const user = userEvent.setup()
    mockUpdate.mockResolvedValue(profile({ city: 'روتردام', job_title: 'قائد فريق', department: { id: 2, name: 'الإعلام' }, department_id: 2 }))
    renderDetail()
    const form = await openEditor(user)
    const listCalls = mockFetchProfiles.mock.calls.length

    await user.clear(within(form).getByLabelText(/المدينة/))
    await user.type(within(form).getByLabelText(/المدينة/), 'روتردام')
    await user.selectOptions(within(form).getByRole('combobox', { name: /^القسم/ }), '2')
    await user.clear(within(form).getByLabelText(/المسمى الوظيفي/))
    await user.type(within(form).getByLabelText(/المسمى الوظيفي/), 'قائد فريق')
    await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(1, { city: 'روتردام', department_id: 2, job_title: 'قائد فريق' }, '2026-08-07T09:00:00+00:00'))
    await waitFor(() => expect(screen.queryByTestId('hr-volunteer-edit')).toBeNull())
    expect(toast.success).toHaveBeenCalledWith('تم حفظ بيانات المتطوع')
    expect(await screen.findByText('روتردام')).toBeInTheDocument()
    expect(mockFetchProfiles.mock.calls.length).toBeGreaterThan(listCalls)
  })

  it('catches empty required fields before sending', async () => {
    const user = userEvent.setup()
    renderDetail()
    const form = await openEditor(user)

    await user.clear(within(form).getByLabelText(/الاسم الكامل/))
    await user.clear(within(form).getByLabelText(/رقم الهاتف/, { selector: '#vol-phone' }))
    await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))

    expect(await within(form).findByText('الاسم الكامل مطلوب.')).toBeInTheDocument()
    expect(within(form).getByText('رقم الهاتف مطلوب.')).toBeInTheDocument()
    expect(within(form).getByLabelText(/الاسم الكامل/)).toHaveAttribute('aria-invalid', 'true')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('shows the server validation messages next to their fields', async () => {
    const user = userEvent.setup()
    mockUpdate.mockRejectedValue(httpError(422, { errors: { email: ['هذا البريد الإلكتروني مستخدم في ملف متطوع آخر.'] } }))
    renderDetail()
    const form = await openEditor(user)

    await user.clear(within(form).getByLabelText(/^البريد الإلكتروني/))
    await user.type(within(form).getByLabelText(/^البريد الإلكتروني/), 'taken@example.com')
    await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))

    expect(await within(form).findByText('هذا البريد الإلكتروني مستخدم في ملف متطوع آخر.')).toBeInTheDocument()
    expect(within(form).getByText('لم تُحفظ التعديلات. راجع الحقول المحددة.')).toBeInTheDocument()
    expect(screen.getByTestId('hr-volunteer-edit')).toBeInTheDocument()
  })

  it('explains a conflict and a refusal', async () => {
    const user = userEvent.setup()
    mockUpdate.mockRejectedValueOnce(httpError(409, { code: 'profile_conflict' })).mockRejectedValueOnce(httpError(403))
    renderDetail()
    const form = await openEditor(user)

    await user.type(within(form).getByLabelText(/المدينة/), ' الجديدة')
    await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
    expect(await within(form).findByText(/تم تعديل ملف المتطوع بعد أن فتحته/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
    expect(await within(form).findByText('لا تملك صلاحية تعديل ملفات المتطوعين.')).toBeInTheDocument()
  })

  it('disables saving until something changes, and while a save is running', async () => {
    const user = userEvent.setup()
    let resolve: (v: VolunteerHrProfile) => void = () => {}
    mockUpdate.mockReturnValue(new Promise<VolunteerHrProfile>((r) => { resolve = r }))
    renderDetail()
    const form = await openEditor(user)

    expect(screen.getByRole('button', { name: 'حفظ التعديلات' })).toBeDisabled()
    await user.type(within(form).getByLabelText(/المدينة/), ' 2')
    await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
    expect(screen.getByRole('button', { name: /جارٍ الحفظ/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /جارٍ الحفظ/ }))
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    resolve(profile({ city: 'أمستردام 2' }))
    await waitFor(() => expect(screen.queryByTestId('hr-volunteer-edit')).toBeNull())
  })

  it('does not open the form for a profile that is still with the volunteer', async () => {
    const user = userEvent.setup()
    mockFetchProfile.mockResolvedValue(profile({ status: 'rejected' }))
    renderDetail()

    await user.click(await screen.findByRole('button', { name: /تعديل معلومات التطوع/ }))
    expect(toast.message).toHaveBeenCalledWith(expect.stringContaining('لدى المتطوع'))
    expect(screen.queryByTestId('hr-volunteer-edit')).toBeNull()
  })

  it('keeps legacy values selectable so opening the form changes nothing by itself', async () => {
    const user = userEvent.setup()
    mockFetchProfile.mockResolvedValue(profile({ gender: 'ذكر', nationality: 'هولندي', education: 'معهد فني', country: 'بلد قديم', country_code: null }))
    renderDetail()
    const form = await openEditor(user)

    expect(within(form).getByLabelText(/^الجنس$/)).toHaveValue('ذكر')
    expect(within(form).getByLabelText(/الجنسية/)).toHaveValue('هولندي')
    expect(within(form).getByLabelText(/المؤهل الدراسي/)).toHaveValue('معهد فني')
    expect(within(form).getByLabelText(/دولة الإقامة/)).toHaveValue('بلد قديم')
    expect(screen.getByRole('button', { name: 'حفظ التعديلات' })).toBeDisabled()
  })

  it('clicking inside the form never closes the volunteer panel behind it', async () => {
    const user = userEvent.setup()
    renderDetail()
    const form = await openEditor(user)

    await user.click(within(form).getByLabelText(/المدينة/))
    await user.click(within(form).getByText('البيانات الشخصية'))
    expect(screen.getByTestId('hr-volunteer-detail-modal')).toBeInTheDocument()
    expect(screen.getByTestId('hr-volunteer-edit')).toBeInTheDocument()
  })

  it('Escape inside the form does not close the volunteer panel behind it', async () => {
    const user = userEvent.setup()
    renderDetail()
    await openEditor(user)

    await user.keyboard('{Escape}')
    expect(screen.getByTestId('hr-volunteer-detail-modal')).toBeInTheDocument()
  })
})
