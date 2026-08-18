import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VolunteerHrProfilePage from '@/pages/dashboard/VolunteerHrProfilePage'

const mockFetchMyProfile = vi.fn()
const mockSubmit = vi.fn()
const mockFetchDepartmentOptions = vi.fn()
const mockFetchJobTitles = vi.fn()

vi.mock('@/api/volunteerHrProfileApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/volunteerHrProfileApi')>('@/api/volunteerHrProfileApi')
  return {
    ...actual,
    fetchMyVolunteerHrProfile: (...a: unknown[]) => mockFetchMyProfile(...a),
    submitVolunteerHrProfile: (...a: unknown[]) => mockSubmit(...a),
    updateVolunteerHrProfile: vi.fn(),
  }
})

vi.mock('@/api/jobTitlesApi', () => ({
  fetchDepartmentOptions: (...a: unknown[]) => mockFetchDepartmentOptions(...a),
  fetchJobTitles: (...a: unknown[]) => mockFetchJobTitles(...a),
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

describe('VolunteerHrProfilePage — restored التخصص الجامعي / نبذة عن المتطوع fields', () => {
  beforeEach(() => {
    mockFetchMyProfile.mockReset().mockResolvedValue(null)
    mockSubmit.mockReset().mockResolvedValue({ id: 1, status: 'submitted' })
    mockFetchDepartmentOptions.mockReset().mockResolvedValue([{ id: 1, name_ar: 'التقنية', name: 'Technology' }])
    mockFetchJobTitles.mockReset().mockResolvedValue([])
  })

  it('renders both restored fields in the form', async () => {
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('التخصص الجامعي')).toBeInTheDocument())
    expect(screen.getByText('نبذة عن المتطوع')).toBeInTheDocument()
  })

  it('the specialization dropdown offers real academic options including أخرى', async () => {
    const user = userEvent.setup()
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('التخصص الجامعي')).toBeInTheDocument())

    const trigger = screen.getByRole('button', { name: 'التخصص الجامعي' })
    await user.click(trigger)

    const listbox = await screen.findByRole('listbox')
    expect(within(listbox).getByRole('option', { name: 'علوم الحاسوب' })).toBeInTheDocument()
    expect(within(listbox).getByRole('option', { name: 'أخرى' })).toBeInTheDocument()
  })

  it('choosing "أخرى" reveals a free-text field for a custom specialization', async () => {
    const user = userEvent.setup()
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('التخصص الجامعي')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'التخصص الجامعي' }))
    const listbox = await screen.findByRole('listbox')
    await user.click(within(listbox).getByRole('option', { name: 'أخرى' }))

    expect(screen.getByPlaceholderText('اكتب تخصصك الجامعي')).toBeInTheDocument()
  })

  it('the bio textarea enforces the 500-character limit and shows a live counter', async () => {
    const user = userEvent.setup()
    render(<VolunteerHrProfilePage />)
    const bioHeading = await screen.findByText('نبذة عن المتطوع')
    const textarea = bioHeading.closest('section')!.querySelector('textarea')!
    await user.type(textarea, 'مطور برمجيات')

    expect(screen.getByText(`${'مطور برمجيات'.length} / 500`)).toBeInTheDocument()
  })

  it('submits university_specialization and professional_bio in the payload', async () => {
    const user = userEvent.setup()
    render(<VolunteerHrProfilePage />)
    await waitFor(() => expect(screen.getByText('الاسم الكامل')).toBeInTheDocument())

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'أحمد')
    const emailInput = document.querySelector('input[type=email]') as HTMLInputElement
    await user.type(emailInput, 'ahmad@example.com')
    const phoneInput = document.querySelector('input[type=tel]') as HTMLInputElement
    await user.type(phoneInput, '612345678')
    await user.selectOptions(screen.getByRole('combobox', { name: 'القسم' }), '1')

    await user.click(screen.getByRole('button', { name: 'التخصص الجامعي' }))
    const specListbox = await screen.findByRole('listbox')
    await user.click(within(specListbox).getByRole('option', { name: 'علوم الحاسوب' }))

    const bioHeading = screen.getByText('نبذة عن المتطوع')
    const bioTextarea = bioHeading.closest('section')!.querySelector('textarea')!
    await user.type(bioTextarea, 'نبذة تجريبية')

    const cvInput = document.querySelector('input[name=cv_file]') as HTMLInputElement
    await user.upload(cvInput, new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }))

    const checkbox = document.querySelector('input[type=checkbox]') as HTMLInputElement
    await user.click(checkbox)
    for (const radio of screen.getAllByRole('radio', { name: 'نعم، أوافق' })) {
      await user.click(radio)
    }

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1))
    const payload = mockSubmit.mock.calls[0][0]
    expect(payload.professional_bio).toBe('نبذة تجريبية')
    expect(payload.university_specialization).toBe('علوم الحاسوب')
  })
})
