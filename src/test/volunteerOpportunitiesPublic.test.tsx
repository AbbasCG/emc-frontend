import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import VolunteerOpportunities from '@/pages/VolunteerOpportunities'
import VolunteerOpportunityDetails from '@/pages/VolunteerOpportunityDetails'
import {
  applyToOpportunity,
  fetchOpportunities,
  fetchOpportunity,
  normalizeOpportunity,
  normalizeOpportunityDetail,
  type OpportunityList,
  type PublicOpportunity,
  type PublicOpportunityDetail,
} from '@/api/volunteerOpportunitiesApi'

vi.mock('@/api/volunteerOpportunitiesApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/volunteerOpportunitiesApi')>()
  return { ...actual, fetchOpportunities: vi.fn(), fetchOpportunity: vi.fn(), applyToOpportunity: vi.fn() }
})
vi.mock('@/components/public/PublicSeo', () => ({ default: () => null }))
const auth = vi.hoisted(() => ({ user: null as null | { name: string; email: string } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }))

const list = vi.mocked(fetchOpportunities)
const one = vi.mocked(fetchOpportunity)
const apply = vi.mocked(applyToOpportunity)

function opp(over: Partial<PublicOpportunity> = {}): PublicOpportunity {
  return {
    id: 1, title: 'فرصة تطوعية: مصمم محتوى', summary: 'تبحث إدارة التسويق والإعلام عن متطوعين للمساهمة في تصميم المحتوى.', field: 'التسويق والإعلام', departmentId: 3,
    locationMode: 'remote', locationLabel: 'عن بُعد', commitment: '8 ساعات أسبوعيًا', duration: '3 أشهر', volunteersNeeded: 2, closesAt: '2026-11-30', daysLeft: 20,
    publishedAt: '2026-10-10T09:00:00+00:00', status: 'open', statusLabel: 'التقديم مفتوح', ...over,
  }
}

function listOf(items: PublicOpportunity[], over: Partial<OpportunityList> = {}): OpportunityList {
  return {
    items,
    meta: { currentPage: 1, lastPage: 1, perPage: 12, total: items.length },
    departments: [{ id: 3, name: 'التسويق والإعلام', count: 2 }],
    locationModes: [{ value: 'remote', label: 'عن بُعد' }, { value: 'onsite', label: 'حضوري' }, { value: 'hybrid', label: 'مختلط' }],
    ...over,
  }
}

function detail(over: Partial<PublicOpportunityDetail> = {}): PublicOpportunityDetail {
  return {
    ...opp(), responsibilities: ['تصميم منشورات المنصة', 'دعم الحملات'], requiredSkills: ['تصميم جرافيك', 'صناعة المحتوى'], preferredSkills: ['مونتاج'], startDate: '2026-12-01',
    applicationInstructions: 'قدّم عبر المنصة وسنتواصل معك.', acceptingApplications: true, closedReason: null, ...over,
  }
}

function http(status: number, data: unknown = {}): unknown {
  return { isAxiosError: true, name: 'AxiosError', message: 'x', config: {}, response: { status, data } }
}

const renderList = () => render(<MemoryRouter><VolunteerOpportunities /></MemoryRouter>)
const renderDetails = (id = '1') => render(
  <MemoryRouter initialEntries={[`/volunteer-opportunities/${id}`]}>
    <Routes><Route path="/volunteer-opportunities/:id" element={<VolunteerOpportunityDetails />} /></Routes>
  </MemoryRouter>,
)

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = null
  list.mockResolvedValue(listOf([opp(), opp({ id: 2, title: 'فرصة محاسب', field: 'المالية', status: 'closing_soon', statusLabel: 'يغلق قريبًا', daysLeft: 3 })]))
  one.mockResolvedValue(detail())
})

describe('public listing', () => {
  it('renders cards with title, summary, field, location, commitment, deadline and status', async () => {
    const { container } = renderList()
    const cards = await screen.findAllByTestId('opportunity-card')

    expect(cards).toHaveLength(2)
    const first = cards[0]
    expect(within(first).getByText('فرصة تطوعية: مصمم محتوى')).toBeTruthy()
    expect(within(first).getByText(/تبحث إدارة التسويق/)).toBeTruthy()
    expect(within(first).getByText('التسويق والإعلام')).toBeTruthy()
    expect(within(first).getByText('عن بُعد')).toBeTruthy()
    expect(within(first).getByText(/8 ساعات أسبوعيًا/)).toBeTruthy()
    expect(within(first).getByText(/آخر موعد للتقديم/)).toBeTruthy()
    expect(within(first).getByTestId('opportunity-status').textContent).toBe('التقديم مفتوح')
    expect(within(cards[1]).getByTestId('opportunity-status').textContent).toBe('يغلق قريبًا')
    expect(within(first).getByRole('link', { name: /عرض تفاصيل/ }).getAttribute('href')).toBe('/volunteer-opportunities/1')
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'فرص التطوع' })).toBeTruthy()
  })

  it('needs no signed-in user and asks the server for the first page', async () => {
    renderList()
    await screen.findAllByTestId('opportunity-card')

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ q: '', departmentId: '', locationMode: '', sort: 'newest', page: 1 }))
  })

  it('search, field, work-mode and sort filters are sent to the server', async () => {
    renderList()
    await screen.findAllByTestId('opportunity-card')

    await userEvent.type(screen.getByRole('searchbox'), 'تصميم')
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'تصميم' })))
    await userEvent.selectOptions(screen.getByLabelText('المجال'), '3')
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ departmentId: 3 })))
    await userEvent.selectOptions(screen.getByLabelText('نمط العمل'), 'remote')
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ locationMode: 'remote' })))
    await userEvent.selectOptions(screen.getByLabelText('الترتيب'), 'deadline')
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'deadline' })))
  })

  it('pages through results', async () => {
    list.mockResolvedValue(listOf([opp()], { meta: { currentPage: 1, lastPage: 3, perPage: 12, total: 30 } }))
    renderList()
    await screen.findAllByTestId('opportunity-card')

    await userEvent.click(screen.getByRole('button', { name: /التالي/ }))

    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))
    expect(screen.getByText(/صفحة/)).toBeTruthy()
  })

  it('shows a loading skeleton first', () => {
    list.mockReturnValue(new Promise(() => {}))
    renderList()

    expect(screen.getByTestId('opportunities-loading')).toBeTruthy()
  })

  it('shows an empty state with a general-application link, and a clear-filters option when filtering', async () => {
    list.mockResolvedValue(listOf([]))
    renderList()

    expect(await screen.findByText('لا توجد فرص مفتوحة حاليًا')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'تقديم طلب تطوع عام' }).getAttribute('href')).toBe('/volunteer/apply')

    await userEvent.selectOptions(screen.getByLabelText('نمط العمل'), 'remote')
    expect(await screen.findByText('لا توجد فرص مطابقة')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'مسح التصفية' }))
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ locationMode: '' })))
  })

  it('shows an error with retry and recovers', async () => {
    list.mockRejectedValueOnce(http(500))
    renderList()

    expect(await screen.findByText('تعذّر تحميل الفرص')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findAllByTestId('opportunity-card')).toHaveLength(2)
  })
})

describe('public details', () => {
  it('shows the full opportunity: description, tasks, skills, facts and an apply action', async () => {
    renderDetails()

    expect(await screen.findByRole('heading', { name: 'عن الفرصة' })).toBeTruthy()
    expect(screen.getByText('تصميم منشورات المنصة')).toBeTruthy()
    expect(screen.getByText('تصميم جرافيك')).toBeTruthy()
    expect(screen.getByText('مونتاج')).toBeTruthy()
    expect(screen.getByText('قدّم عبر المنصة وسنتواصل معك.')).toBeTruthy()
    const facts = screen.getByRole('complementary', { name: 'ملخص الفرصة' })
    expect(within(facts).getByText('التسويق والإعلام')).toBeTruthy()
    expect(within(facts).getByText('عن بُعد')).toBeTruthy()
    expect(within(facts).getByText('8 ساعات أسبوعيًا')).toBeTruthy()
    expect(within(facts).getByText('3 أشهر')).toBeTruthy()
    expect(within(facts).getByText('2')).toBeTruthy()
    expect(within(facts).getByRole('link', { name: 'قدّم الآن' }).getAttribute('href')).toBe('#apply')
    expect(screen.getByRole('form', { name: 'نموذج التقديم على الفرصة' })).toBeTruthy()
    expect(one).toHaveBeenCalledWith(1)
  })

  it('a closed opportunity says applications are closed and offers no form', async () => {
    one.mockResolvedValue(detail({ acceptingApplications: false, closedReason: 'closed', status: 'closed', statusLabel: 'أُغلق التقديم' }))
    renderDetails()

    const closed = await screen.findByTestId('applications-closed')
    expect(within(closed).getByText('أُغلق باب التقديم')).toBeTruthy()
    expect(within(closed).getByRole('link', { name: 'فرص أخرى' }).getAttribute('href')).toBe('/volunteer-opportunities')
    expect(screen.queryByRole('form', { name: 'نموذج التقديم على الفرصة' })).toBeNull()
    expect(screen.getByText('التقديم مغلق')).toBeTruthy()
  })

  it('a passed deadline gets its own message', async () => {
    one.mockResolvedValue(detail({ acceptingApplications: false, closedReason: 'deadline_passed', status: 'closed' }))
    renderDetails()

    expect(await screen.findByText('انتهى موعد التقديم')).toBeTruthy()
  })

  it('a draft or unknown opportunity is a plain «غير متاحة» (404) and a bad id never calls the server', async () => {
    one.mockRejectedValueOnce(http(404))
    renderDetails('999')
    expect(await screen.findByText('هذه الفرصة غير متاحة')).toBeTruthy()

    vi.clearAllMocks()
    renderDetails('abc')
    expect((await screen.findAllByText('هذه الفرصة غير متاحة')).length).toBeGreaterThan(0)
    expect(one).not.toHaveBeenCalled()
  })

  it('a server error offers a retry', async () => {
    one.mockRejectedValueOnce(http(500))
    renderDetails()

    expect(await screen.findByText('تعذّر تحميل الفرصة')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByRole('heading', { name: 'عن الفرصة' })).toBeTruthy()
  })

  it('shows a loading state first', () => {
    one.mockReturnValue(new Promise(() => {}))
    renderDetails()

    expect(screen.getByTestId('opportunity-loading')).toBeTruthy()
  })
})

describe('applying', () => {
  async function fillValid() {
    await userEvent.type(screen.getByLabelText('الاسم الكامل'), 'سارة الأحمد')
    await userEvent.type(screen.getByLabelText('البريد الإلكتروني'), 'sara@example.com')
    await userEvent.type(screen.getByLabelText('رقم الجوال'), '+31600000000')
    await userEvent.type(screen.getByLabelText('الدولة'), 'هولندا')
    await userEvent.type(screen.getByLabelText('المدينة'), 'أمستردام')
    await userEvent.selectOptions(screen.getByLabelText('الجنس'), 'female')
    await userEvent.selectOptions(screen.getByLabelText('مستوى الخبرة'), 'متوسط')
    await userEvent.selectOptions(screen.getByLabelText('التوفر'), '5-10 ساعات أسبوعيًا')
    await userEvent.type(screen.getByLabelText('لماذا ترغب في التطوع'), 'أرغب في المساهمة بخبرتي في تصميم المحتوى.')
    await userEvent.click(screen.getByLabelText('أوافق على الشروط'))
  }

  it('does not call the server until the required fields are valid, and says what is missing', async () => {
    renderDetails()
    await screen.findByRole('form', { name: 'نموذج التقديم على الفرصة' })

    await userEvent.click(screen.getByRole('button', { name: 'إرسال الطلب' }))

    expect(apply).not.toHaveBeenCalled()
    expect(screen.getByText('الاسم الكامل مطلوب.')).toBeTruthy()
    expect(screen.getByText('أدخل بريدًا إلكترونيًا صالحًا.')).toBeTruthy()
    expect(screen.getByText('اكتب 20 حرفًا على الأقل في سبب التطوع.')).toBeTruthy()
    expect(screen.getByText('يجب الموافقة على الشروط للمتابعة.')).toBeTruthy()
  })

  it('marks failed fields invalid, ties each message to its field, and moves focus to the first one', async () => {
    renderDetails()
    await screen.findByRole('form', { name: 'نموذج التقديم على الفرصة' })

    await userEvent.click(screen.getByRole('button', { name: 'إرسال الطلب' }))

    const name = screen.getByLabelText('الاسم الكامل')
    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(name.getAttribute('aria-required')).toBe('true')
    expect(document.getElementById(name.getAttribute('aria-describedby') ?? '')?.textContent).toBe('الاسم الكامل مطلوب.')
    expect(screen.getByLabelText('أوافق على الشروط').getAttribute('aria-invalid')).toBe('true')
    // The optional skills field never failed, so it is not marked.
    expect(screen.getByLabelText('مهاراتك').getAttribute('aria-invalid')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(name))

    // Fixing a field clears its mark.
    await userEvent.type(name, 'سارة الأحمد')
    await userEvent.click(screen.getByRole('button', { name: 'إرسال الطلب' }))
    expect(name.getAttribute('aria-invalid')).toBeNull()
    expect(name.getAttribute('aria-describedby')).toBeNull()
  })

  it('submits a valid application to this opportunity and shows the confirmation', async () => {
    apply.mockResolvedValue('تم استلام طلبك. سيراجعه فريق الموارد البشرية ويتواصل معك.')
    renderDetails()
    await screen.findByRole('form', { name: 'نموذج التقديم على الفرصة' })

    await fillValid()
    await userEvent.click(screen.getByRole('button', { name: 'إرسال الطلب' }))

    await waitFor(() => expect(apply).toHaveBeenCalledTimes(1))
    const [id, input] = apply.mock.calls[0]
    expect(id).toBe(1)
    expect(input).toMatchObject({ fullName: 'سارة الأحمد', email: 'sara@example.com', gender: 'female', experienceLevel: 'متوسط', agreeTerms: true })
    const ok = await screen.findByTestId('apply-success')
    expect(within(ok).getByText('تم استلام طلبك')).toBeTruthy()
    expect(screen.queryByRole('form', { name: 'نموذج التقديم على الفرصة' })).toBeNull()
  })

  it('pre-fills the name and email of a signed-in visitor', async () => {
    auth.user = { name: 'ليلى', email: 'layla@example.com' }
    renderDetails()
    await screen.findByRole('form', { name: 'نموذج التقديم على الفرصة' })

    expect((screen.getByLabelText('الاسم الكامل') as HTMLInputElement).value).toBe('ليلى')
    expect((screen.getByLabelText('البريد الإلكتروني') as HTMLInputElement).value).toBe('layla@example.com')
  })

  it('shows the server\'s message for a duplicate or closed opportunity (409) and keeps the form', async () => {
    apply.mockRejectedValueOnce(http(409, { message: 'لقد قدّمت على هذه الفرصة مسبقًا. سيتواصل معك فريق الموارد البشرية.' }))
    renderDetails()
    await screen.findByRole('form', { name: 'نموذج التقديم على الفرصة' })
    await fillValid()

    await userEvent.click(screen.getByRole('button', { name: 'إرسال الطلب' }))

    expect(await screen.findByText(/لقد قدّمت على هذه الفرصة مسبقًا/)).toBeTruthy()
    expect(screen.getByRole('form', { name: 'نموذج التقديم على الفرصة' })).toBeTruthy()
  })

  it('maps server validation errors onto their fields', async () => {
    apply.mockRejectedValueOnce(http(422, { errors: { email: ['البريد الإلكتروني غير صالح.'], phone: ['رقم الجوال مطلوب.'] } }))
    renderDetails()
    await screen.findByRole('form', { name: 'نموذج التقديم على الفرصة' })
    await fillValid()

    await userEvent.click(screen.getByRole('button', { name: 'إرسال الطلب' }))

    expect(await screen.findByText('البريد الإلكتروني غير صالح.')).toBeTruthy()
    expect(screen.getByText('رقم الجوال مطلوب.')).toBeTruthy()
    expect(screen.getByText('راجع الحقول المحدَّدة وأعد المحاولة.')).toBeTruthy()
  })

  it('tells the visitor to wait when rate limited, and handles a network failure', async () => {
    apply.mockRejectedValueOnce(http(429))
    renderDetails()
    await screen.findByRole('form', { name: 'نموذج التقديم على الفرصة' })
    await fillValid()

    await userEvent.click(screen.getByRole('button', { name: 'إرسال الطلب' }))
    expect(await screen.findByText(/أرسلت طلبات كثيرة/)).toBeTruthy()

    apply.mockRejectedValueOnce(http(500))
    await userEvent.click(screen.getByRole('button', { name: 'إرسال الطلب' }))
    expect(await screen.findByText(/تعذّر إرسال الطلب/)).toBeTruthy()
  })

  it('does not double-submit while a request is in flight', async () => {
    apply.mockReturnValue(new Promise(() => {}))
    renderDetails()
    await screen.findByRole('form', { name: 'نموذج التقديم على الفرصة' })
    await fillValid()

    const btn = screen.getByRole('button', { name: 'إرسال الطلب' })
    await userEvent.click(btn)
    await userEvent.click(btn)

    expect(apply).toHaveBeenCalledTimes(1)
    expect(btn.getAttribute('aria-busy')).toBe('true')
  })
})

describe('api client', () => {
  it('treats applications as closed unless the server explicitly says they are open', () => {
    expect(normalizeOpportunityDetail({ id: 1, title: 'x' }).acceptingApplications).toBe(false)
    expect(normalizeOpportunityDetail({ id: 1, accepting_applications: 'yes' }).acceptingApplications).toBe(false)
    expect(normalizeOpportunityDetail({ id: 1, accepting_applications: true }).acceptingApplications).toBe(true)
  })

  it('normalizes a partial payload without crashing', () => {
    const o = normalizeOpportunity({ id: 5, status: 'weird', location_mode: 'moon', volunteers_needed: 'x' })

    expect(o).toMatchObject({ id: 5, status: 'open', locationMode: null, volunteersNeeded: null, field: null })
  })
})
