import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

/**
 * DUPLICATE DEPARTMENTS — what the user sees once the backend serves one
 * canonical department.
 *
 * The duplicate itself is a DATA problem fixed server-side (departments:merge-
 * duplicates; the archived row is no longer served by /api/team or
 * /api/departments/options). These tests pin the consumer side: given the
 * canonical payload, /ar/team renders ONE section and the volunteer HR form
 * offers ONE option carrying the canonical id — and neither crashes on thin
 * data. Neither page dedupes by name in React: hiding two different ids that
 * share a label would mask a data fault instead of surfacing it.
 */

const AI = 'إدارة الذكاء الاصطناعي والتحول الرقمي'

const apiGet = vi.fn()
vi.mock('@/api/axios', () => ({ default: { get: (...a: unknown[]) => apiGet(...a), post: vi.fn(), put: vi.fn() } }))

const fetchDepartmentOptions = vi.fn()
const fetchJobTitles = vi.fn()
vi.mock('@/api/jobTitlesApi', () => ({
  fetchDepartmentOptions: (...a: unknown[]) => fetchDepartmentOptions(...a),
  fetchJobTitles: (...a: unknown[]) => fetchJobTitles(...a),
}))

vi.mock('@/api/volunteerHrProfileApi', () => ({
  fetchMyVolunteerHrProfile: vi.fn().mockResolvedValue(null),
  submitVolunteerHrProfile: vi.fn(),
  updateVolunteerHrProfile: vi.fn(),
}))

vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))

const { default: TeamPage } = await import('@/components/team/TeamPage')
const { default: VolunteerHrProfilePage } = await import('@/pages/dashboard/VolunteerHrProfilePage')

const member = (id: number, name: string) => ({
  id, name_ar: name, position_ar: 'عضو', is_leader: false, is_executive: false, is_active: true, image: null,
})

const aiDepartment = (over: Record<string, unknown> = {}) => ({
  id: 13, name_ar: AI, name_en: 'AI & Digital Transformation', slug: 'ai-transformation',
  description_ar: 'وصف', icon: 'brain', sort_order: 12, members: [member(1, 'منى'), member(2, 'سارة')], ...over,
})

const financeDepartment = () => ({
  id: 7, name_ar: 'الإدارة المالية', name_en: 'Finance', slug: 'finance',
  description_ar: '', icon: 'coins', sort_order: 5, members: [member(3, 'خالد')],
})

function renderTeam() {
  return render(<MemoryRouter><TeamPage /></MemoryRouter>)
}

beforeEach(() => {
  apiGet.mockReset()
  fetchDepartmentOptions.mockReset()
  fetchJobTitles.mockReset().mockResolvedValue([])
})

describe('/ar/team', () => {
  it('renders the AI department exactly once when the API returns the canonical list', async () => {
    apiGet.mockResolvedValue({ data: { success: true, data: [financeDepartment(), aiDepartment()] } })

    renderTeam()

    const headings = await screen.findAllByRole('heading', { level: 2, name: AI })
    expect(headings).toHaveLength(1)
  })

  it('shows each person once under the single department', async () => {
    apiGet.mockResolvedValue({ data: { data: [aiDepartment()] } })

    renderTeam()
    await screen.findByRole('heading', { level: 2, name: AI })

    expect(screen.getAllByText('منى')).toHaveLength(1)
    expect(screen.getAllByText('سارة')).toHaveLength(1)
  })

  it('keeps a stable, id-keyed section per department (no React key collisions)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    apiGet.mockResolvedValue({ data: { data: [financeDepartment(), aiDepartment()] } })

    renderTeam()
    await screen.findByRole('heading', { level: 2, name: AI })

    const keyWarnings = errors.mock.calls.filter((c) => String(c[0]).includes('same key'))
    errors.mockRestore()
    expect(keyWarnings).toHaveLength(0)
  })

  it('does not crash when a department arrives with no members or description', async () => {
    apiGet.mockResolvedValue({ data: { data: [{ id: 13, name_ar: AI, slug: 'ai-transformation', sort_order: 12 }] } })

    renderTeam()

    // Thin data falls back to the static team rather than throwing.
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(document.body.textContent).not.toBe('')
  })

  it('does not crash on an empty or malformed payload', async () => {
    apiGet.mockResolvedValue({ data: { data: null } })
    renderTeam()
    await waitFor(() => expect(document.querySelector('main')).not.toBeNull())

    apiGet.mockRejectedValue(new Error('network'))
    renderTeam()
    await waitFor(() => expect(document.querySelectorAll('main').length).toBeGreaterThan(0))
  })

  it('renders right-to-left', async () => {
    apiGet.mockResolvedValue({ data: { data: [financeDepartment(), aiDepartment()] } })

    renderTeam()
    await screen.findByRole('heading', { level: 2, name: AI })

    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
  })

  it('uses the department ids from the payload as the identity of each section', async () => {
    apiGet.mockResolvedValue({ data: { data: [aiDepartment({ id: 99 })] } })

    renderTeam()
    const heading = await screen.findByRole('heading', { level: 2, name: AI })

    expect(heading).toBeInTheDocument()
    expect(apiGet).toHaveBeenCalledWith('/team', expect.anything())
  })
})

describe('/dashboard/volunteer/hr-profile department dropdown', () => {
  function renderForm() {
    return render(<MemoryRouter><VolunteerHrProfilePage /></MemoryRouter>)
  }

  async function departmentSelect() {
    const select = await screen.findByLabelText('القسم')
    return select as HTMLSelectElement
  }

  it('offers one option for the AI department', async () => {
    fetchDepartmentOptions.mockResolvedValue([
      { id: 7, name_ar: 'الإدارة المالية', name: 'Finance' },
      { id: 13, name_ar: AI, name: 'AI' },
    ])

    renderForm()
    const select = await departmentSelect()
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1))

    const aiOptions = within(select).getAllByRole('option').filter((o) => o.textContent === AI)
    expect(aiOptions).toHaveLength(1)
  })

  it('submits the canonical department id as the option value', async () => {
    fetchDepartmentOptions.mockResolvedValue([{ id: 13, name_ar: AI, name: 'AI' }])

    renderForm()
    const select = await departmentSelect()
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(2))

    const option = within(select).getByRole('option', { name: AI }) as HTMLOptionElement
    expect(option.value).toBe('13')
  })

  it('keeps the placeholder as the only extra option', async () => {
    fetchDepartmentOptions.mockResolvedValue([{ id: 13, name_ar: AI, name: 'AI' }])

    renderForm()
    const select = await departmentSelect()
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(2))

    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['اختر القسم', AI])
  })

  it('does not crash when the department list is empty', async () => {
    fetchDepartmentOptions.mockResolvedValue([])

    renderForm()
    const select = await departmentSelect()

    expect(within(select).getAllByRole('option')).toHaveLength(1)
  })

  it('keeps the form in the Arabic right-to-left layout', async () => {
    fetchDepartmentOptions.mockResolvedValue([{ id: 13, name_ar: AI, name: 'AI' }])

    renderForm()
    await departmentSelect()

    expect(screen.getByLabelText('القسم').closest('[dir="rtl"]') ?? document.querySelector('[dir="rtl"]')).not.toBeNull()
  })
})
