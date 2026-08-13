import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import HrVolunteerProfilesPage from '@/pages/dashboard/HrVolunteerProfilesPage'
import type { VolunteerHrProfile } from '@/api/volunteerHrProfileApi'

const mockFetchProfiles = vi.fn()
const mockFetchFilterOptions = vi.fn()
const mockFetchProfile = vi.fn()
const mockStartReview = vi.fn()
const mockApprove = vi.fn()
const mockReject = vi.fn()
const mockFetchCvBlob = vi.fn()

vi.mock('@/api/hrVolunteerProfilesApi', () => ({
  fetchHrVolunteerProfiles: (...a: unknown[]) => mockFetchProfiles(...a),
  fetchHrVolunteerProfileFilterOptions: (...a: unknown[]) => mockFetchFilterOptions(...a),
  fetchHrVolunteerProfile: (...a: unknown[]) => mockFetchProfile(...a),
  startVolunteerProfileReview: (...a: unknown[]) => mockStartReview(...a),
  approveVolunteerProfile: (...a: unknown[]) => mockApprove(...a),
  rejectVolunteerProfile: (...a: unknown[]) => mockReject(...a),
  fetchVolunteerHrProfileCvBlob: (...a: unknown[]) => mockFetchCvBlob(...a),
}))

vi.mock('@/api/ambassadorApplicationFilesApi', () => ({
  triggerBlobDownload: vi.fn(),
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'HR', role: 'hr_manager' }, isAuthenticated: true, isLoading: false }),
}))

function fullProfile(overrides: Partial<VolunteerHrProfile> = {}): VolunteerHrProfile {
  return {
    id: 1, user_id: 5, full_name: 'أحمد محمد', email: 'ahmad@example.com',
    phone: '+31612345678', phone_country_code: '+31', country: 'هولندا', country_code: 'NL',
    city: 'أمستردام', date_of_birth: '1995-06-16', gender: 'male', nationality: 'هولندي',
    profile_photo_url: null,
    department: { id: 1, name: 'التقنية' }, department_id: 1, job_title: 'مطور برمجيات',
    employment_type: 'volunteer', join_date: '2026-08-06', availability: 'مساءً', weekly_hours: 5,
    skills: 'PHP, React', languages: ['العربية', 'الإنجليزية'], education: 'بكالوريوس',
    university_specialization: 'علوم الحاسوب',
    experience: '3 سنوات', motivation: 'حب العطاء', professional_bio: 'مطور برمجيات شغوف',
    linkedin_url: 'https://linkedin.com/in/ahmad',
    portfolio_url: 'https://ahmad.dev',
    photo_publication_consent: true, photo_consent_at: '2026-08-06T09:00:00Z',
    professional_profile_consent: true, professional_profile_consent_at: '2026-08-06T09:00:00Z',
    cv: { available: true, file_name: 'Ahmad-CV.pdf', mime_type: 'application/pdf', size: 204800, uploaded_at: '2026-08-06T10:00:00Z' },
    status: 'submitted', submitted_at: '2026-08-06T09:00:00Z', reviewed_at: null, reviewed_by: null,
    rejection_reason: null, approved_at: null, approved_by: null, team_profile_id: null,
    created_at: '2026-08-06T09:00:00Z', updated_at: '2026-08-06T09:00:00Z',
    ...overrides,
  }
}

function renderAtDetail(id = 1) {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/hr/volunteers/${id}`]}>
      <Routes>
        <Route path="/dashboard/hr/volunteers" element={<HrVolunteerProfilesPage />} />
        <Route path="/dashboard/hr/volunteers/:id" element={<HrVolunteerProfilesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HrVolunteerProfilesPage — redesigned detail modal', () => {
  beforeEach(() => {
    mockFetchProfiles.mockReset().mockResolvedValue({
      data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 20 },
      statistics: { total: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0, departments_count: 0, joined_this_month: 0 },
    })
    mockFetchFilterOptions.mockReset().mockResolvedValue({ departments: [], statuses: [] })
    mockFetchProfile.mockReset()
    mockStartReview.mockReset()
    mockApprove.mockReset()
    mockReject.mockReset()
    mockFetchCvBlob.mockReset()
  })

  it('renders a large centered modal dialog portaled to the viewport', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile())
    renderAtDetail()

    const overlay = await screen.findByTestId('hr-volunteer-detail-overlay')
    expect(overlay.className).toMatch(/fixed/)
    expect(overlay.className).toMatch(/inset-0/)
    expect(overlay.className).toMatch(/sm:items-center/)
    expect(overlay.className).toMatch(/sm:p-6/)
    expect(document.body.contains(overlay)).toBe(true)

    const modal = screen.getByTestId('hr-volunteer-detail-modal')
    expect(modal).toHaveAttribute('dir', 'rtl')
    expect(modal.className).toMatch(/sm:w-\[min\(92vw,1450px\)\]/)
    expect(modal.className).toMatch(/sm:max-h-\[92vh\]/)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('header renders avatar, name, email, department and job title', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile())
    renderAtDetail()

    await waitFor(() => expect(screen.getAllByText('أحمد محمد')[0]).toBeInTheDocument())
    expect(screen.getAllByText('ahmad@example.com').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/التقنية/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('مطور برمجيات').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('إغلاق')).toBeInTheDocument()
  })

  it('summary cards render job title, department, hours and join date', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile())
    renderAtDetail()

    await waitFor(() => expect(screen.getAllByText('المسمى الوظيفي').length).toBeGreaterThan(0))
    expect(screen.getAllByText('القسم').length).toBeGreaterThan(0)
    expect(screen.getByText('عدد الساعات الأسبوعية')).toBeInTheDocument()
    expect(screen.getAllByText('تاريخ الانضمام').length).toBeGreaterThan(0)
    expect(screen.getAllByText('5 ساعة').length).toBeGreaterThan(0)
  })

  it('renders the complete volunteer profile — every submitted field is visible', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile())
    renderAtDetail()

    await waitFor(() => expect(screen.getAllByText('أحمد محمد')[0]).toBeInTheDocument())

    expect(screen.getByText('المعلومات الشخصية')).toBeInTheDocument()
    expect(screen.getByText('معلومات التطوع')).toBeInTheDocument()
    expect(screen.getByText('المهارات واللغات')).toBeInTheDocument()
    expect(screen.getByText('الوثائق')).toBeInTheDocument()
    expect(screen.getByText('سجل المراجعة')).toBeInTheDocument()

    expect(screen.getByText('أمستردام')).toBeInTheDocument()
    expect(screen.getAllByText(/هولندا/).length).toBeGreaterThan(0)
    expect(screen.getByText('بكالوريوس')).toBeInTheDocument()
    expect(screen.getByText('3 سنوات')).toBeInTheDocument()
    expect(screen.getByText('حب العطاء')).toBeInTheDocument()
    expect(screen.getByText('Ahmad-CV.pdf')).toBeInTheDocument()
    expect(screen.getByText('LinkedIn')).toBeInTheDocument()
    expect(screen.getByText('Portfolio')).toBeInTheDocument()
    expect(screen.getByText('ذكر')).toBeInTheDocument()
  })

  it('renders skills and languages as chips', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile())
    renderAtDetail()

    await waitFor(() => expect(screen.getAllByText('أحمد محمد')[0]).toBeInTheDocument())

    expect(screen.getByText('PHP')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('العربية')).toBeInTheDocument()
    expect(screen.getByText('الإنجليزية')).toBeInTheDocument()
  })

  it('formats dates as dd/MM/yyyy', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile({ date_of_birth: '2023-08-16', join_date: '2026-08-06' }))
    renderAtDetail()

    await waitFor(() => expect(screen.getByText('16/08/2023')).toBeInTheDocument())
    expect(screen.getAllByText('06/08/2026').length).toBeGreaterThan(0)
  })

  it('CV preview button fetches and opens the preview modal for a PDF', async () => {
    const user = userEvent.setup()
    mockFetchProfile.mockResolvedValue(fullProfile())
    mockFetchCvBlob.mockResolvedValue({ blob: new Blob(['%PDF'], { type: 'application/pdf' }), mime: 'application/pdf', filename: 'Ahmad-CV.pdf' })
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
    renderAtDetail()

    const previewButtons = await screen.findAllByRole('button', { name: 'معاينة السيرة الذاتية' })
    await user.click(previewButtons[0])

    await waitFor(() => expect(mockFetchCvBlob).toHaveBeenCalledWith(1, 'preview'))
  })

  it('shows the unsupported-format fallback message for a non-previewable CV type', async () => {
    const user = userEvent.setup()
    mockFetchProfile.mockResolvedValue(fullProfile({ cv: { available: true, file_name: 'cv.docx', mime_type: 'application/msword', size: 5000, uploaded_at: null } }))
    renderAtDetail()

    const previewButtons = await screen.findAllByRole('button', { name: 'معاينة السيرة الذاتية' })
    await user.click(previewButtons[0])

    await waitFor(() => expect(screen.getByText(/معاينة ملفات Word \(DOC\/DOCX\) غير متاحة/)).toBeInTheDocument())
    expect(mockFetchCvBlob).not.toHaveBeenCalled()
  })

  it('download still works', async () => {
    const user = userEvent.setup()
    mockFetchProfile.mockResolvedValue(fullProfile())
    mockFetchCvBlob.mockResolvedValue({ blob: new Blob(['%PDF']), mime: 'application/pdf', filename: 'Ahmad-CV.pdf' })
    renderAtDetail()

    const downloadButtons = await screen.findAllByRole('button', { name: 'تحميل' })
    await user.click(downloadButtons[0])

    await waitFor(() => expect(mockFetchCvBlob).toHaveBeenCalledWith(1, 'download'))
  })

  it('pending status shows approve/reject actions', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile({ status: 'submitted' }))
    renderAtDetail()

    await waitFor(() => expect(screen.getByRole('button', { name: 'قبول' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /رفض/ })).toBeInTheDocument()
  })

  it('approved status hides duplicate approve action and keeps footer edit/message', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile({
      status: 'approved',
      approved_at: '2026-08-06T12:00:00Z',
      approved_by: { id: 1, name: 'Super Admin' },
    }))
    renderAtDetail()

    await waitFor(() => expect(screen.getByText('تعديل معلومات التطوع')).toBeInTheDocument())
    expect(screen.getByText('إرسال رسالة')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'قبول' })).not.toBeInTheDocument()
  })

  it('approval requires confirmation showing department, job title, and join date', async () => {
    const user = userEvent.setup()
    mockFetchProfile.mockResolvedValue(fullProfile())
    mockApprove.mockResolvedValue(fullProfile({ status: 'approved' }))
    renderAtDetail()

    await waitFor(() => expect(screen.getByRole('button', { name: 'قبول' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'قبول' }))

    expect(screen.getByText(/هل أنت متأكد من قبول/)).toBeInTheDocument()
    expect(screen.getAllByText(/التقنية/)[0]).toBeInTheDocument()
    expect(mockApprove).not.toHaveBeenCalled()

    await user.click(screen.getByText('تأكيد القبول'))
    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith(1))
  })

  it('rejection reason is required', async () => {
    const user = userEvent.setup()
    mockFetchProfile.mockResolvedValue(fullProfile())
    renderAtDetail()

    await waitFor(() => expect(screen.getByRole('button', { name: /رفض/ })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /رفض/ }))

    const confirmButton = screen.getByText('تأكيد الرفض')
    expect(confirmButton).toBeDisabled()

    await user.type(screen.getByPlaceholderText('سبب الرفض (مطلوب)'), 'CV غير مكتملة')
    expect(confirmButton).not.toBeDisabled()

    await user.click(confirmButton)
    await waitFor(() => expect(mockReject).toHaveBeenCalledWith(1, 'CV غير مكتملة'))
  })

  it('header and footer remain available with long content (sticky chrome)', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile({
      motivation: 'x'.repeat(800),
      experience: 'y'.repeat(800),
    }))
    renderAtDetail()

    const modal = await screen.findByTestId('hr-volunteer-detail-modal')
    expect(within(modal).getByLabelText('إغلاق')).toBeInTheDocument()
    expect(within(modal).getByText('تعديل معلومات التطوع')).toBeInTheDocument()
    expect(modal.className).toMatch(/flex-col/)
    expect(modal.className).not.toMatch(/overflow-y-auto/)
  })

  it('mobile layout classes avoid nested scrollbars on the shell', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile())
    renderAtDetail()

    const modal = await screen.findByTestId('hr-volunteer-detail-modal')
    // Only the body region scrolls — shell itself does not use overflow-y-auto.
    expect(modal.className).toMatch(/overflow-hidden/)
    const scrollBody = modal.querySelector('.overflow-y-auto')
    expect(scrollBody).toBeTruthy()
    expect(scrollBody?.querySelector('.overflow-y-auto')).toBeNull()
  })

  it('info rows do not use opposite-edge spacing (no justify-between)', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile())
    renderAtDetail()

    await screen.findByTestId('hr-volunteer-detail-modal')
    const rows = screen.getAllByTestId('detail-info-row')
    expect(rows.length).toBeGreaterThan(5)
    for (const row of rows) {
      expect(row.className).not.toMatch(/justify-between/)
      expect(row.className).toMatch(/detail-row/)
      expect(row.className).toMatch(/sm:grid-cols-\[/)
    }
  })

  it('volunteer-info rows use wider controlled label/value spacing', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile())
    renderAtDetail()

    await screen.findByText('معلومات التطوع')
    const wideRows = document.querySelectorAll('[data-testid="detail-info-row"][data-wide="true"]')
    expect(wideRows.length).toBeGreaterThan(3)
    wideRows.forEach((row) => {
      expect(row.className).toMatch(/minmax\(150px,190px\)/)
      expect(row.className).toMatch(/sm:gap-x-8/)
      expect(row.className).not.toMatch(/justify-between/)
    })
  })

  it('summary cards stay compact', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile())
    renderAtDetail()

    await screen.findByTestId('hr-volunteer-detail-modal')
    const cards = screen.getAllByTestId('summary-metric-card')
    expect(cards).toHaveLength(4)
    for (const card of cards) {
      expect(card.className).toMatch(/h-\[68px\]/)
      expect(card.className).toMatch(/px-4/)
      expect(card.className).toMatch(/py-3/)
    }
  })

  it('maps canonical education codes to Arabic labels in skills card', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile({ education: 'bachelor' }))
    renderAtDetail()

    await screen.findByText('المهارات واللغات')
    expect(screen.getByText('بكالوريوس')).toBeInTheDocument()
    expect(screen.queryByText('bachelor')).not.toBeInTheDocument()
  })

  it('country renders flag once with ISO code and localized name (no NL NL)', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile({
      country: 'هولندا', country_code: 'NL', nationality: 'هولندي',
    }))
    renderAtDetail()

    const countryValues = await screen.findAllByTestId('country-value')
    const text = countryValues[0].textContent ?? ''
    // One ISO code only — Windows emoji "NL" glyph duplication is avoided via SVG img.
    expect(text.match(/NL/g)?.length).toBe(1)
    expect(text).toMatch(/هولندا/)
    expect(countryValues[0].querySelector('img[aria-hidden]')).toBeTruthy()
    // Legacy masculine demonym resolves to ISO + country name (not demonym adjective).
    expect(screen.getAllByText(/هولندا/).length).toBeGreaterThan(0)
  })

  it('nationality maps when stored as a country name/code, not from phone code', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile({
      country: 'اليمن',
      country_code: 'YE',
      phone_country_code: '+967',
      nationality: 'هولندا',
    }))
    renderAtDetail()

    await screen.findByText('المعلومات الشخصية')
    const countryValues = screen.getAllByTestId('country-value')
    // First = residence YE, second = nationality NL from "هولندا" text — not phone YE.
    expect(countryValues.some((el) => el.textContent?.includes('YE') && el.textContent?.includes('اليمن'))).toBe(true)
    expect(countryValues.some((el) => el.textContent?.includes('NL') && el.textContent?.includes('هولندا'))).toBe(true)
    for (const el of countryValues) {
      const codes = el.textContent?.match(/\b[A-Z]{2}\b/g) ?? []
      expect(codes.length).toBe(1)
      expect(el.querySelector('img[aria-hidden]')).toBeTruthy()
    }
  })

  it('unknown legacy country value renders safely without inventing a flag', async () => {
    mockFetchProfile.mockResolvedValue(fullProfile({
      country: 'مدينة غير معروفة',
      country_code: null,
      nationality: null,
    }))
    renderAtDetail()

    expect(await screen.findByText('مدينة غير معروفة')).toBeInTheDocument()
    const countryValues = screen.getAllByTestId('country-value')
    expect(countryValues[0].querySelector('[aria-hidden]')).toBeNull()
  })
})
