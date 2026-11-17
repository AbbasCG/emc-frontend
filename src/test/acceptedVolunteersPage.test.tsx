import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import AcceptedVolunteersPage from '@/pages/admin/AcceptedVolunteersPage'
import * as applicationApi from '@/api/volunteerApplicationApi'
import type { VolunteerRequest } from '@/api/volunteerApplicationApi'
import { axeCheck } from './axe'

vi.mock('@/api/volunteerApplicationApi', async (importActual) => {
  const actual = await importActual<typeof import('@/api/volunteerApplicationApi')>()
  return { ...actual, fetchAcceptedVolunteers: vi.fn(), resendVolunteerCredentials: vi.fn() }
})
vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
  promiseToast: (p: Promise<unknown>) => p,
}))

const fetchAccepted = vi.mocked(applicationApi.fetchAcceptedVolunteers)

/** The server's counters: `accepted` = still waiting, `converted` = already members (the list holds both). */
function metaOf(accepted: number, converted: number, filters?: { departments: string[]; cities: string[]; availabilities: string[] }) {
  return { total_accepted: accepted, total_converted: converted, accepted_this_month: 1, top_department: 'الإعلام والتسويق', ...(filters ? { filters } : {}) }
}
const meta = metaOf(1, 0)
const pagination = (total: number) => ({ total, current_page: 1, last_page: 1, per_page: 200 })

/** A request with every field the apply form collects, plus the four new optional ones. */
function fullRequest(over: Partial<VolunteerRequest> = {}): VolunteerRequest {
  return {
    id: 7,
    full_name: 'علي حسن',
    email: 'ali@example.com',
    phone: '+967 770000000',
    gender: 'male',
    birth_date: '2000-05-10',
    nationality: 'يمني',
    country: 'اليمن',
    city: 'صنعاء',
    status: 'accepted',
    desired_department: 'الإعلام والتسويق',
    education_level: 'bachelor',
    current_status: 'موظف',
    job_title: 'مصمم جرافيك',
    specialization: 'تقنية معلومات',
    volunteer_days_availability: 'أيام محددة خلال الأسبوع',
    volunteer_days: ['السبت', 'الأحد'],
    preferred_time_slot: 'مساءً',
    daily_hours: 'ساعة إلى ساعتين',
    in_person_capable: 'yes',
    remote_capable: 'أحياناً',
    has_previous_volunteering: true,
    volunteering_organizations: 'جمعية الخير',
    volunteering_duration: 'من 6 أشهر إلى سنة',
    past_volunteer_tasks: ['التصميم والجرافيك'],
    personal_skills: ['حل المشكلات'],
    skill_level_rating: 4,
    technical_tools: ['Canva'],
    value_add_contributions: 'تصميم الهوية',
    portfolio_url: 'https://portfolio.example.com/ali',
    motivation_ratings: { m1: 5, m2: 4 },
    commitment_ratings: { c1: 3 },
    situational_responses: { sit_delay: 'أبلغ المسؤول مسبقاً وأوضح أسباب التأخير وأقترح حلاً.' },
    expected_duration: 'أكثر من سنة',
    commitment_three_months: 'نعم',
    reasons_for_applying: ['خدمة المجتمع'],
    expected_gains: ['الخبرة العملية'],
    secondary_departments: ['التقنية'],
    primary_value_department: 'الإعلام والتسويق',
    department_skills: ['التصميم'],
    preferred_work_environment: 'العمل الجماعي',
    quit_reasons: ['عدم التقدير'],
    suggestions: 'مزيد من الورش',
    notes: 'متاح في رمضان',
    languages: ['العربية', 'الإنجليزية'],
    linkedin_url: 'https://www.linkedin.com/in/ali-hasan',
    professional_bio: 'مصمم مهتم بالعمل المجتمعي',
    professional_profile_consent: true,
    cv_view_url: 'https://files.example.com/cv/7?sig=1',
    accepted_at: '2026-11-10T10:00:00Z',
    accepted_by_name: 'مدير الموارد',
    admin_notes: 'مرشح ممتاز',
    is_converted: false,
    can_convert_to_member: true,
    ...over,
  }
}

const renderPage = () => render(<MemoryRouter><AcceptedVolunteersPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
})

const converted = (over: Partial<VolunteerRequest> = {}) => fullRequest({ id: 8, full_name: 'سارة', email: 's@example.com', status: 'converted_to_member', is_converted: true, can_convert_to_member: false, ...over })

const FILTERS = {
  departments: ['الإعلام والتسويق', 'المالية'],
  cities: ['صنعاء', 'عدن'],
  availabilities: ['أيام الإجازة فقط', 'أيام محددة خلال الأسبوع'],
}

const statCard = (label: string) => within(screen.getByTestId('accepted-stats')).getByText(label).parentElement as HTMLElement

describe('accepted volunteers page: layout', () => {
  it('shows the stat cards, the table columns and the name as a real button, with no convert button', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest(), converted()], meta: metaOf(1, 1), pagination: pagination(2) })
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'المتطوعون المقبولون' })).toBeInTheDocument()
    expect(screen.queryByText(/قبل تحويلهم/)).not.toBeInTheDocument() // the subtitle no longer talks about converting here

    const stats = screen.getByTestId('accepted-stats')
    for (const label of ['إجمالي المقبولين', 'تم التحويل', 'بانتظار التحويل', 'مقبولون هذا الشهر']) {
      expect(within(stats).getByText(label)).toBeInTheDocument()
    }

    const table = screen.getByRole('table')
    for (const head of ['المتطوع', 'القسم', 'المدينة', 'التفرغ', 'تاريخ القبول', 'الحالة', 'السيرة']) {
      expect(within(table).getByRole('columnheader', { name: head })).toBeInTheDocument()
    }
    expect(within(table).getByRole('button', { name: 'علي حسن' })).toBeInTheDocument()
    expect(within(table).getByRole('button', { name: 'سارة' })).toBeInTheDocument()
    // one wording for the two states, in the table and everywhere else on the page
    expect(within(table).getByText('بانتظار التحويل')).toBeInTheDocument()
    expect(within(table).getByText('تم التحويل')).toBeInTheDocument()
    expect(within(table).queryByText('مقبول')).not.toBeInTheDocument()
    expect(within(table).getAllByRole('link', { name: /عرض السيرة الذاتية للمتطوع/ })[0]).toHaveAttribute('href', 'https://files.example.com/cv/7?sig=1')

    expect(screen.queryByRole('button', { name: /تحويل إلى عضو/ })).not.toBeInTheDocument()
  })

  it('the card NUMBERS are the server’s counters: converted + pending = total, whatever the rows and filters', async () => {
    // 2 rows loaded of a list of 450; the counters say 150 converted and 300 waiting
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest(), converted()], meta: metaOf(300, 150), pagination: pagination(450) })
    renderPage()
    await screen.findByRole('button', { name: 'سارة' })

    expect(statCard('تم التحويل')).toHaveTextContent('150')
    expect(statCard('بانتظار التحويل')).toHaveTextContent('300')
    expect(statCard('إجمالي المقبولين')).toHaveTextContent('450')
    expect(statCard('مقبولون هذا الشهر')).toHaveTextContent('1')

    // a filter changes the rows, not the counters
    fetchAccepted.mockResolvedValue({ data: [fullRequest()], meta: metaOf(300, 150), pagination: pagination(300) })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'تصفية حسب القسم' }), 'الإعلام والتسويق')
    await waitFor(() => expect(fetchAccepted).toHaveBeenLastCalledWith(expect.objectContaining({ desired_department: 'الإعلام والتسويق' })))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'سارة' })).not.toBeInTheDocument())
    expect(statCard('إجمالي المقبولين')).toHaveTextContent('450')
    expect(statCard('بانتظار التحويل')).toHaveTextContent('300')
  })

  it('the conversion cards narrow the LOADED rows by is_converted, without a new request', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest(), converted()], meta: metaOf(1, 1), pagination: pagination(2) })
    renderPage()
    await screen.findByRole('button', { name: 'سارة' })
    expect(fetchAccepted).toHaveBeenCalledTimes(1)

    await userEvent.click(within(screen.getByTestId('accepted-stats')).getByRole('button', { name: /تم التحويل/ }))
    expect(screen.getByRole('button', { name: 'سارة' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'علي حسن' })).not.toBeInTheDocument()

    await userEvent.click(within(screen.getByTestId('accepted-stats')).getByRole('button', { name: /بانتظار التحويل/ }))
    expect(screen.getByRole('button', { name: 'علي حسن' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'سارة' })).not.toBeInTheDocument()

    expect(fetchAccepted).toHaveBeenCalledTimes(1)
    // the numbers did not move with the narrowing
    expect(statCard('إجمالي المقبولين')).toHaveTextContent('2')
  })

  it('searches ON THE SERVER, after a pause in typing, and says honestly when nothing matches', async () => {
    fetchAccepted.mockResolvedValue({ data: [fullRequest(), converted()], meta: metaOf(1, 1), pagination: pagination(2) })
    renderPage()
    await screen.findByRole('button', { name: 'سارة' })
    fetchAccepted.mockClear()
    fetchAccepted.mockResolvedValue({ data: [], meta: metaOf(1, 1), pagination: pagination(0) })

    await userEvent.type(screen.getByRole('searchbox', { name: 'بحث في المتطوعين المقبولين' }), 'لا أحد')

    await waitFor(() => expect(fetchAccepted).toHaveBeenCalledWith(expect.objectContaining({ search: 'لا أحد' })))
    expect(fetchAccepted).toHaveBeenCalledTimes(1) // one request for the whole word, not one per letter
    expect(await screen.findByText('لا توجد نتائج تطابق الفلاتر المحددة')).toBeInTheDocument()

    fetchAccepted.mockResolvedValue({ data: [fullRequest()], meta: metaOf(1, 1), pagination: pagination(1) })
    await userEvent.click(screen.getByRole('button', { name: 'إعادة تعيين الفلاتر' }))
    expect(await screen.findByRole('button', { name: 'علي حسن' })).toBeInTheDocument()
    expect(fetchAccepted).toHaveBeenLastCalledWith(expect.not.objectContaining({ search: expect.anything() }))
  })

  it('says it out loud when the list is longer than what was loaded, and counts against the server total', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest(), converted()], meta: metaOf(399, 51), pagination: pagination(450) })
    renderPage()

    const warning = await screen.findByTestId('truncation-warning')
    expect(warning).toHaveTextContent('يُعرض أول 2 من أصل 450 متطوع فقط')
    expect(screen.getByTestId('accepted-count')).toHaveTextContent('2 من 450 متطوع مقبول')
  })

  it('no warning when everything is loaded', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest(), converted()], meta: metaOf(1, 1), pagination: pagination(2) })
    renderPage()
    await screen.findByRole('button', { name: 'سارة' })

    expect(screen.queryByTestId('truncation-warning')).not.toBeInTheDocument()
    expect(screen.getByTestId('accepted-count')).toHaveTextContent('2 من 2 متطوع مقبول')
  })

  it('pages the loaded rows: 20 a page, and the indicator is not marked as «the current page» link', async () => {
    const many = Array.from({ length: 25 }, (_, i) => fullRequest({ id: 100 + i, full_name: `متطوع ${i + 1}`, email: `v${i}@example.com` }))
    fetchAccepted.mockResolvedValueOnce({ data: many, meta: metaOf(25, 0), pagination: pagination(25) })
    renderPage()
    await screen.findByRole('button', { name: 'متطوع 1' })

    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(1 + 20)
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).not.toHaveAttribute('aria-current')

    await userEvent.click(screen.getByRole('button', { name: /التالي/ }))
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(1 + 5)
    expect(screen.getByRole('button', { name: 'متطوع 25' })).toBeInTheDocument()
  })

  it('the dropdowns offer what the server lists (no hard-coded departments or legacy codes); the stored phrase is the value', async () => {
    fetchAccepted.mockResolvedValue({ data: [fullRequest()], meta: metaOf(1, 0, FILTERS), pagination: pagination(1) })
    renderPage()
    await screen.findByRole('button', { name: 'علي حسن' })

    const dept = screen.getByRole('combobox', { name: 'تصفية حسب القسم' })
    expect(within(dept).getAllByRole('option').map((o) => o.textContent)).toEqual(['كل الأقسام', 'الإعلام والتسويق', 'المالية'])
    expect(document.body.textContent).not.toContain('الصحة النفسية والوعي النفسية والوعي')

    await userEvent.click(screen.getByRole('button', { name: /فلاتر/ }))
    const availability = screen.getByLabelText('التفرغ')
    const options = within(availability).getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['الكل', 'أيام الإجازة فقط', 'أيام محددة خلال الأسبوع'])
    expect(options[1]).toHaveValue('أيام الإجازة فقط')
    expect(screen.queryByRole('option', { name: 'دوام كامل' })).not.toBeInTheDocument()

    await userEvent.selectOptions(availability, 'أيام الإجازة فقط')
    await waitFor(() => expect(fetchAccepted).toHaveBeenLastCalledWith(expect.objectContaining({ availability: 'أيام الإجازة فقط' })))
  })

  it('the city dropdown stays complete after a city is chosen (server lists are unfiltered)', async () => {
    fetchAccepted.mockResolvedValue({ data: [fullRequest()], meta: metaOf(1, 0, FILTERS), pagination: pagination(1) })
    renderPage()
    await screen.findByRole('button', { name: 'علي حسن' })
    await userEvent.click(screen.getByRole('button', { name: /فلاتر/ }))

    await userEvent.selectOptions(screen.getByLabelText('المدينة'), 'عدن')
    await waitFor(() => expect(fetchAccepted).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'عدن' })))
    await screen.findByRole('button', { name: 'علي حسن' })

    expect(within(screen.getByLabelText('المدينة')).getAllByRole('option').map((o) => o.textContent)).toEqual(['الكل', 'صنعاء', 'عدن'])
    expect(screen.getByLabelText('المدينة')).toHaveValue('عدن')
  })

  it('without meta.filters the values seen so far stand in, and the list only grows (never shrinks after a choice)', async () => {
    const aden = fullRequest({ id: 9, full_name: 'منى', email: 'm@example.com', city: 'عدن' })
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest(), aden], meta: metaOf(2, 0), pagination: pagination(2) })
    renderPage()
    await screen.findByRole('button', { name: 'منى' })
    await userEvent.click(screen.getByRole('button', { name: /فلاتر/ }))
    expect(within(screen.getByLabelText('المدينة')).getAllByRole('option').map((o) => o.textContent)).toEqual(['الكل', 'صنعاء', 'عدن'])

    // the server answers the «عدن» query with the Aden rows only
    fetchAccepted.mockResolvedValue({ data: [aden], meta: metaOf(1, 0), pagination: pagination(1) })
    await userEvent.selectOptions(screen.getByLabelText('المدينة'), 'عدن')
    await screen.findByRole('button', { name: 'منى' })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'علي حسن' })).not.toBeInTheDocument())

    expect(within(screen.getByLabelText('المدينة')).getAllByRole('option').map((o) => o.textContent)).toEqual(['الكل', 'صنعاء', 'عدن'])
  })

  it('a slow answer to an OLDER query that arrives after a newer one is dropped', async () => {
    let resolveFirst: (v: Awaited<ReturnType<typeof applicationApi.fetchAcceptedVolunteers>>) => void = () => undefined
    let resolveSecond: (v: Awaited<ReturnType<typeof applicationApi.fetchAcceptedVolunteers>>) => void = () => undefined
    fetchAccepted
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
      .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r }))
    renderPage()

    // the first (unfiltered) request is still running when the person searches
    await userEvent.type(screen.getByRole('searchbox', { name: 'بحث في المتطوعين المقبولين' }), 'سارة')
    await waitFor(() => expect(fetchAccepted).toHaveBeenCalledTimes(2))

    resolveSecond({ data: [converted()], meta: metaOf(0, 1), pagination: pagination(1) })
    expect(await screen.findByRole('button', { name: 'سارة' })).toBeInTheDocument()

    // the old, unfiltered answer arrives late: it must change nothing
    resolveFirst({ data: [fullRequest(), converted()], meta: metaOf(1, 1), pagination: pagination(2) })
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('button', { name: 'علي حسن' })).not.toBeInTheDocument()
    expect(statCard('إجمالي المقبولين')).toHaveTextContent('1')
    expect(screen.getByTestId('accepted-count')).toHaveTextContent('1 من 1')
  })

  it('a new query shows the loader (not the previous rows), and a failure shows dashes instead of the previous numbers', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest(), converted()], meta: metaOf(1, 1), pagination: pagination(2) })
    renderPage()
    await screen.findByRole('button', { name: 'سارة' })
    expect(statCard('إجمالي المقبولين')).toHaveTextContent('2')

    fetchAccepted.mockRejectedValueOnce(new Error('500'))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'ترتيب القائمة' }), 'name_asc')

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل قائمة المتطوعين المقبولين.')
    expect(screen.queryByRole('button', { name: 'سارة' })).not.toBeInTheDocument()
    expect(statCard('إجمالي المقبولين')).toHaveTextContent('—')
    expect(statCard('تم التحويل')).toHaveTextContent('—')
    expect(screen.queryByText('لا يوجد متطوعون مقبولون حالياً')).not.toBeInTheDocument()
  })

  it('a failed load is an error with a retry; retry loads the list', async () => {
    fetchAccepted.mockRejectedValueOnce(new Error('500'))
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل قائمة المتطوعين المقبولين.')
    expect(screen.queryByText('لا يوجد متطوعون مقبولون حالياً')).not.toBeInTheDocument()

    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest()], meta: metaOf(1, 0), pagination: pagination(1) })
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByRole('button', { name: 'علي حسن' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('the empty state does not mention conversion', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [], meta: metaOf(0, 0), pagination: pagination(0) })
    renderPage()

    expect(await screen.findByText('لا يوجد متطوعون مقبولون حالياً')).toBeInTheDocument()
    expect(screen.queryByText(/تحويل/, { selector: 'p' })).not.toBeInTheDocument()
  })

  it('the CV link of the row falls back like the window does: view, then file, then download', async () => {
    fetchAccepted.mockResolvedValueOnce({
      data: [fullRequest({ cv_view_url: null, cv_file_url: 'https://files.example.com/file', cv_download_url: 'https://files.example.com/dl' })],
      meta: metaOf(1, 0),
      pagination: pagination(1),
    })
    renderPage()

    expect(await screen.findByRole('link', { name: /عرض السيرة الذاتية للمتطوع/ })).toHaveAttribute('href', 'https://files.example.com/file')
    await userEvent.click(screen.getByRole('button', { name: 'علي حسن' }))
    const dialog = await screen.findByRole('dialog', { name: /علي حسن/ })
    for (const link of within(dialog).getAllByRole('link', { name: /السيرة الذاتية/ })) {
      expect(link).toHaveAttribute('href', 'https://files.example.com/file')
    }
  })

  it('has no accessibility violations', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest()], meta: metaOf(1, 0), pagination: pagination(1) })
    const { container } = renderPage()
    await screen.findByRole('button', { name: 'علي حسن' })

    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

// jsdom has no layout (offsetParent is always null), which would make the focus trap see nothing to focus.
function withLayout(run: () => Promise<void>) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', { configurable: true, get() { return this.parentElement } })

  return run().finally(() => {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, 'offsetParent', descriptor)
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>).offsetParent
  })
}

describe('accepted volunteers page: the name window', () => {
  async function openWindow() {
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest()], meta, pagination: pagination(1) })
    const view = renderPage()
    const opener = await screen.findByRole('button', { name: 'علي حسن' })
    await userEvent.click(opener)
    const dialog = await screen.findByRole('dialog', { name: /علي حسن/ })

    return { dialog, opener, view }
  }

  it('shows ALL the data: new fields, labels in Arabic, codes mapped, ratings in the form’s own wording', async () => {
    const { dialog } = await openWindow()

    expect(dialog).toHaveAttribute('aria-modal', 'true')

    // the four new fields
    const sections = within(dialog)
    expect(sections.getByText('العربية')).toBeInTheDocument()
    expect(sections.getByText('الإنجليزية')).toBeInTheDocument()
    expect(sections.getByText('مصمم مهتم بالعمل المجتمعي')).toBeInTheDocument()
    const linkedin = sections.getByRole('link', { name: /linkedin\.com\/in\/ali-hasan/ })
    expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/ali-hasan')
    expect(linkedin).toHaveAttribute('rel', 'noopener noreferrer')
    expect(linkedin).toHaveAttribute('target', '_blank')
    expect(sections.getByText('عرض البيانات المهنية').parentElement).toHaveTextContent('نعم')

    // personal + codes mapped to Arabic
    expect(sections.getByText('ذكر')).toBeInTheDocument() // male
    expect(sections.getAllByText('اليمن', { selector: 'bdi' })).toHaveLength(2) // nationality «يمني» -> the country name, and the residence country
    expect(sections.getByText(/^\d+ سنة$/)).toBeInTheDocument() // age
    expect(sections.getByText('بكالوريوس')).toBeInTheDocument() // bachelor
    expect(sections.getByText('مصمم جرافيك')).toBeInTheDocument()
    expect(sections.getByText('المشاركة الحضورية').parentElement).toHaveTextContent('نعم') // in_person_capable: yes

    // availability, experience, skills, departments, motivation
    for (const text of ['السبت', 'الأحد', 'جمعية الخير', 'التصميم والجرافيك', '4 / 5 · متقدم', 'Canva', 'تصميم الهوية', 'التقنية', 'خدمة المجتمع', 'الخبرة العملية', 'عدم التقدير', 'مزيد من الورش', 'متاح في رمضان']) {
      expect(sections.getAllByText(text).length).toBeGreaterThan(0)
    }

    // ratings use the apply form's statements, with the scale's words
    expect(sections.getByText('أرغب في المساهمة في خدمة المجتمع وتحقيق أثر إيجابي')).toBeInTheDocument()
    expect(sections.getByText('5 / 5 · أتفق بشدة')).toBeInTheDocument()
    expect(sections.getByText('أستطيع الالتزام بالمواعيد والمهام المتفق عليها')).toBeInTheDocument()
    expect(sections.getByText(/إذا تم تكليفك بمهمة تطوعية ولم تتمكن من إنجازها/)).toBeInTheDocument()

    // review log
    expect(sections.getByText('مدير الموارد')).toBeInTheDocument()
    expect(sections.getByText('مرشح ممتاز')).toBeInTheDocument()
    expect(sections.getByText('بانتظار التحويل')).toBeInTheDocument()

    // CV, only because there is one
    for (const link of sections.getAllByRole('link', { name: /معاينة السيرة الذاتية/ })) {
      expect(link).toHaveAttribute('href', 'https://files.example.com/cv/7?sig=1')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('shows a dash for what is empty, three states for the consent, and no CV link without a CV', async () => {
    fetchAccepted.mockResolvedValueOnce({
      data: [fullRequest({ id: 9, full_name: 'منى', email: 'm@example.com', professional_profile_consent: null, languages: null, linkedin_url: null, professional_bio: null, cv_view_url: null, cv_download_url: null, cv_file_url: null, phone: null })],
      meta,
      pagination: pagination(1),
    })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'منى' }))
    const dialog = await screen.findByRole('dialog', { name: /منى/ })

    expect(within(dialog).getByText('عرض البيانات المهنية').parentElement).toHaveTextContent('لم يُجب')
    expect(within(dialog).queryByRole('link', { name: /السيرة الذاتية/ })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('link', { name: /linkedin/i })).not.toBeInTheDocument()
    expect(within(dialog).getAllByText('غير متوفر').length).toBeGreaterThan(3) // the dash, read out as «غير متوفر»
  })

  it('consent «لا» is shown as «لا», not as unanswered', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest({ professional_profile_consent: false })], meta, pagination: pagination(1) })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'علي حسن' }))
    const dialog = await screen.findByRole('dialog', { name: /علي حسن/ })

    const row = within(dialog).getByText('عرض البيانات المهنية').parentElement
    expect(row).toHaveTextContent('لا')
    expect(row).not.toHaveTextContent('لم يُجب')
  })

  it('never turns an unsafe address into a link', async () => {
    fetchAccepted.mockResolvedValueOnce({
      data: [fullRequest({ linkedin_url: 'javascript:alert(1)', portfolio_url: 'data:text/html,<b>x</b>' })],
      meta,
      pagination: pagination(1),
    })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'علي حسن' }))
    const dialog = await screen.findByRole('dialog', { name: /علي حسن/ })

    expect(dialog.querySelector('a[href^="javascript:"]')).toBeNull()
    expect(dialog.querySelector('a[href^="data:"]')).toBeNull()
    expect(within(dialog).getByText('javascript:alert(1)')).toBeInTheDocument()
  })

  it('after a refresh the open window shows the refreshed row (and stays open while it reloads)', async () => {
    const { dialog } = await openWindow()
    expect(within(dialog).queryByText('ملاحظة جديدة من المراجع')).not.toBeInTheDocument()

    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest({ admin_notes: 'ملاحظة جديدة من المراجع' })], meta, pagination: pagination(1) })
    await userEvent.click(document.querySelector<HTMLElement>('button[aria-label="تحديث البيانات"]')!)

    expect(screen.getByRole('dialog', { name: /علي حسن/ })).toBeInTheDocument()
    expect(await within(screen.getByRole('dialog', { name: /علي حسن/ })).findByText('ملاحظة جديدة من المراجع')).toBeInTheDocument()
  })

  it('a click on the ROW returns focus to that row’s name button when the window closes', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest(), converted()], meta: metaOf(1, 1), pagination: pagination(2) })
    renderPage()
    const cell = await screen.findAllByText('صنعاء', { selector: 'bdi' })

    await userEvent.click(cell[1])
    await screen.findByRole('dialog', { name: /سارة/ })
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'سارة' })).toHaveFocus())
  })

  it('a repeated chip value renders twice without duplicate-key warnings', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest({ languages: ['العربية', 'العربية'], personal_skills: ['أ', 'أ', 'أ'] })], meta, pagination: pagination(1) })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'علي حسن' }))
    const dialog = await screen.findByRole('dialog', { name: /علي حسن/ })

    expect(within(within(dialog).getByRole('list', { name: 'اللغات' })).getAllByRole('listitem')).toHaveLength(2)
    expect(within(within(dialog).getByRole('list', { name: 'المهارات الشخصية' })).getAllByRole('listitem')).toHaveLength(3)
    expect(errors.mock.calls.some((c) => String(c[0]).includes('same key'))).toBe(false)
    errors.mockRestore()
  })

  it('user-controlled text is isolated with <bdi> so a bidi-override cannot reorder what is around it', async () => {
    const evil = 'علي‮نسح'
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest({ full_name: evil, professional_bio: `نبذة ${evil}`, languages: [evil], volunteering_organizations: evil })], meta, pagination: pagination(1) })
    renderPage()
    const table = await screen.findByRole('table')
    expect(within(table).getByText(evil).tagName).toBe('BDI')

    await userEvent.click(within(table).getByRole('button'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).querySelector('bdi')).not.toBeNull()
    for (const el of within(dialog).getAllByText(new RegExp(evil))) {
      expect(el.tagName === 'BDI' || el.closest('bdi') !== null || el.getAttribute('dir') === 'auto').toBe(true)
    }
  })

  it('opens from a click on the row too', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [fullRequest()], meta, pagination: pagination(1) })
    renderPage()
    const cell = await screen.findByText('صنعاء', { selector: 'bdi' })

    await userEvent.click(cell)

    expect(await screen.findByRole('dialog', { name: /علي حسن/ })).toBeInTheDocument()
  })

  it('moves focus in, keeps Tab inside, closes on Escape and gives focus back to the name', () =>
    withLayout(async () => {
      const { dialog, opener } = await openWindow()

      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

      // Tab and Shift+Tab never leave the window
      for (let i = 0; i < 40; i++) {
        await userEvent.tab()
        expect(dialog.contains(document.activeElement)).toBe(true)
      }
      await userEvent.tab({ shift: true })
      expect(dialog.contains(document.activeElement)).toBe(true)

      await userEvent.keyboard('{Escape}')

      await waitFor(() => expect(screen.queryByRole('dialog', { name: /علي حسن/ })).not.toBeInTheDocument())
      expect(opener).toHaveFocus()
      expect(document.body.style.overflow).not.toBe('hidden')
    }))

  it('locks the page scroll while open, and the close button closes it', async () => {
    const { dialog } = await openWindow()
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.click(within(dialog).getAllByRole('button', { name: 'إغلاق' })[0])

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('leaves Escape to a nested layer that is open above it', async () => {
    const { dialog } = await openWindow()
    const nested = document.createElement('div')
    nested.setAttribute('data-nested-overlay', '')
    document.body.appendChild(nested)

    await userEvent.keyboard('{Escape}')
    expect(dialog).toBeInTheDocument()

    nested.remove()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('has no accessibility violations while open', async () => {
    const { dialog } = await openWindow()

    expect(await axeCheck(dialog)).toHaveNoViolations()
  })
})
